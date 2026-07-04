import * as orderRepo from "../repositories/order.repository";
import { processOrderPaymentCallback } from "./order.service";
import { MidtransPaymentWrapper } from "@/modules/payment";

/**
 * Mengecek status pembayaran pesanan (polling atau status check ke Midtrans).
 */
export async function checkOrderStatus(orderId: string) {
    const order = await orderRepo.findOrderById(orderId);
    if (!order) {
        throw new Error("Order not found");
    }

    const site = await orderRepo.findSiteById(order.siteId);

    if (order.paymentStatus === "paid" || order.paymentStatus === "approved") {
        return {
            orderId: order.id,
            status: order.paymentStatus,
            amount: Number(order.total),
            customerName: order.customerName,
            siteName: site?.name || "",
        };
    }

    if (!order.paymentReference) {
        return {
            orderId: order.id,
            status: order.paymentStatus || "pending",
            amount: Number(order.total),
            customerName: order.customerName,
            siteName: site?.name || "",
        };
    }

    const paymentSettings = await orderRepo.findPaymentSettings(order.siteId);
    const platformSettings = await orderRepo.findPlatformSettings();

    let merchantCode = paymentSettings?.gatewayMerchantId;
    let apiKey = paymentSettings?.gatewayApiKey;
    let sandbox = paymentSettings?.gatewaySandbox ?? true;

    if (!merchantCode || !apiKey) {
        merchantCode = platformSettings?.gatewayMerchantId;
        apiKey = platformSettings?.gatewayApiKey;
        sandbox = platformSettings?.gatewaySandbox ?? true;
    }

    if (!merchantCode || !apiKey) {
        return {
            orderId: order.id,
            status: order.paymentStatus || "pending",
            amount: Number(order.total),
            customerName: order.customerName,
            siteName: site?.name || "",
        };
    }

    let merchantOrderId = order.id;
    if (order.paymentUrl && order.paymentUrl.startsWith("custom:")) {
        try {
            const customData = JSON.parse(order.paymentUrl.substring(7));
            if (customData.merchantOrderId) {
                merchantOrderId = customData.merchantOrderId;
            }
        } catch {}
    }

    const result = await MidtransPaymentWrapper.checkTransaction({
        merchantOrderId: merchantOrderId,
    }, {
        merchantCode,
        apiKey,
        sandbox,
    });

    if (result.success && result.status === "paid" && order.paymentStatus !== "paid") {
        const creditOwner = !paymentSettings?.gatewayMerchantId || !paymentSettings?.gatewayApiKey;
        await processOrderPaymentCallback(order.id, order.siteId, Number(order.total), creditOwner);
    }

    return {
        orderId: order.id,
        status: result.success ? (result.status === "paid" ? "paid" : order.paymentStatus || "pending") : (order.paymentStatus || "pending"),
        amount: Number(order.total),
        customerName: order.customerName,
        siteName: site?.name || "",
    };
}

/**
 * Memproses callback webhook untuk pesanan dari Midtrans.
 */
export async function processOrderWebhook(body: Record<string, any>) {
    const { order_id, status_code, gross_amount, signature_key } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
        throw new Error("Missing parameters");
    }

    if (typeof order_id !== "string") {
        throw new Error("Invalid order_id type");
    }

    const actualOrderId = order_id.split("-")[0];
    if (!actualOrderId) {
        throw new Error("Invalid order_id format");
    }

    const order = await orderRepo.findOrderById(actualOrderId);
    if (!order) {
        throw new Error("Order not found");
    }

    const expectedAmount = Number(order.total);
    if (Math.round(Number(gross_amount)) !== Math.round(expectedAmount)) {
        console.error(`[ORDER_WEBHOOK] Amount mismatch in order webhook: webhook=${gross_amount}, expected=${expectedAmount}`);
        throw new Error("Amount mismatch");
    }

    const paymentSettings = await orderRepo.findPaymentSettings(order.siteId);
    const platformSettings = await orderRepo.findPlatformSettings();

    let activeMerchantCode = paymentSettings?.gatewayMerchantId;
    let apiKey = paymentSettings?.gatewayApiKey;
    let sandbox = paymentSettings?.gatewaySandbox ?? true;

    if (!activeMerchantCode || !apiKey) {
        activeMerchantCode = platformSettings?.gatewayMerchantId;
        apiKey = platformSettings?.gatewayApiKey;
        sandbox = platformSettings?.gatewaySandbox ?? true;
    }

    if (!activeMerchantCode || !apiKey) {
        throw new Error("Site payment not configured");
    }

    const verification = await MidtransPaymentWrapper.verifyCallback(body, {
        merchantCode: activeMerchantCode || "",
        apiKey,
        sandbox
    });

    if (!verification.isValid) {
        throw new Error("Invalid Signature");
    }

    if (verification.status === "paid") {
        const creditOwner = !paymentSettings?.gatewayMerchantId || !paymentSettings?.gatewayApiKey;
        await processOrderPaymentCallback(actualOrderId, order.siteId, Number(order.total), creditOwner);
    } else if (["cancel", "deny", "expire", "cancelled", "expired", "failed"].includes(verification.status)) {
        if (order.paymentStatus !== "cancelled") {
            await orderRepo.updateOrderFulfillment(actualOrderId, { paymentStatus: "cancelled", status: "cancelled" });
            await orderRepo.restoreOrderStock(actualOrderId);

            // Notifikasi ke penjual (Site Owner)
            try {
                const { eventBus } = await import("@/modules/shared/core/event-bus");
                const siteOwner = await eventBus.request<any, any>("request.auth.getSiteOwner", { siteId: order.siteId });
                if (siteOwner && siteOwner.email) {
                    const siteName = (await orderRepo.findSiteById(order.siteId))?.name || "Toko Anda";
                    await eventBus.publish("notification.email.send", {
                        template: "orderCancelledSeller",
                        payload: {
                            toEmail: siteOwner.email,
                            userName: siteOwner.name || "Pemilik Toko",
                            siteName: siteName,
                            orderId: actualOrderId,
                            customerName: order.customerName,
                            total: order.total
                        }
                    }, "order");
                }
            } catch (err) {
                console.error("[ORDER_WEBHOOK_CANCEL_NOTIF_ERROR]", err);
            }
        }
    }

    return { success: true };
}
