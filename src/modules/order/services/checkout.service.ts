import * as orderRepo from "../repositories/order.repository";
import { SubscriptionClient } from "@/modules/subscription";
import { MidtransPaymentWrapper, getPaymentMethodCategory } from "@/modules/payment";


/**
 * Membuat pesanan baru dan menghitung total harga secara aman.
 */
export async function createOrder(
    siteId: string,
    items: Array<{ productId: string; quantity: number; variantName?: string; attributes?: Record<string, string> }>,
    customerDetails: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        zip?: string;
        paymentMethod?: string;
    },
    sessionCustomer?: { name?: string | null; email?: string | null }
) {
    // Check subscription limit for orders
    const limitCheck = await SubscriptionClient.checkSiteLimit(siteId, "maxOrders");
    if (!limitCheck.allowed) {
        throw new Error(limitCheck.message || "Batas pesanan langganan Anda telah tercapai");
    }

    const customerEmail = sessionCustomer?.email || customerDetails.email;
    const customerName = sessionCustomer?.name || customerDetails.name || "Guest Customer";
    const address = customerDetails.address;
    const city = customerDetails.city;
    const zip = customerDetails.zip;
    const phone = customerDetails.phone;
    const paymentMethod = customerDetails.paymentMethod;

    const customerAddress = address 
        ? `${address}${city ? `, ${city}` : ""}${zip ? ` ${zip}` : ""}${phone ? ` (WA/Telp: ${phone})` : ""}` 
        : `No Address Provided${phone ? ` (WA/Telp: ${phone})` : ""}`;

    if (!customerEmail) {
        throw new Error("Email is required");
    }

    const productIds = items.map(item => item.productId);
    const dbProducts = await orderRepo.findProductsForSite(siteId, productIds);
    const productMap = new Map<string, any>(dbProducts.map(p => [p.id, p]));

    let total = 0;
    const orderItemsData = [];
    const stockUpdates: Array<{ productId: string; variantName?: string; quantity: number }> = [];

    for (const item of items) {
        const dbProduct = productMap.get(item.productId);
        if (!dbProduct) {
            throw new Error(`Product not found or invalid: ${item.productId}`);
        }
        
        let dbPrice = Number(dbProduct.price);
        let currentStock = dbProduct.stock || 0;
        let isDigital = dbProduct.metaData?.some((m: any) => m.key === "_isDigital" && m.value === "true") || false;

        if (item.variantName && dbProduct.variants) {
            try {
                const variants = typeof dbProduct.variants === 'string' 
                    ? JSON.parse(dbProduct.variants) 
                    : dbProduct.variants;
                if (Array.isArray(variants)) {
                    const variant = variants.find(v => v.name === item.variantName);
                    if (variant && variant.price !== undefined && variant.price !== null) {
                        dbPrice = Number(variant.price);
                    }
                    if (variant && variant.stock !== undefined && variant.stock !== null) {
                        currentStock = Number(variant.stock);
                    }
                }
            } catch (e) {
                console.error("Failed to parse variants", e);
            }
        }
        
        if (!isDigital && currentStock < item.quantity) {
             throw new Error(`Stok tidak mencukupi untuk produk ${dbProduct.name} ${item.variantName ? '(' + item.variantName + ')' : ''}`);
        }
        
        total += dbPrice * item.quantity;
        
        orderItemsData.push({
            productId: item.productId,
            quantity: item.quantity,
            price: dbPrice.toFixed(2),
            variantName: item.variantName,
            attributes: item.attributes ? JSON.parse(JSON.stringify(item.attributes)) : undefined
        });

        if (!isDigital) {
            stockUpdates.push({
                productId: item.productId,
                variantName: item.variantName,
                quantity: item.quantity
            });
        }
    }

    const newOrder = await orderRepo.createOrder({
        customerName,
        customerEmail,
        customerAddress,
        total: total.toFixed(2),
        status: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        paymentMethod: paymentMethod || "system",
        siteId,
        items: {
            create: orderItemsData
        }
    });

    // Jalankan stock reduction
    try {
        const stockUpdatePromises: Promise<any>[] = [];

        for (const update of stockUpdates) {
            const product = productMap.get(update.productId);
            if (!product) continue;

            if (update.variantName && product.variants) {
                const variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
                let variantUpdated = false;
                if (Array.isArray(variants)) {
                    for (const v of variants) {
                        if (v.name === update.variantName) {
                            v.stock = Math.max(0, (v.stock || 0) - update.quantity);
                            variantUpdated = true;
                            break;
                        }
                    }
                }
                if (variantUpdated) {
                    stockUpdatePromises.push(orderRepo.updateProductVariants(update.productId, variants));
                }
            } else {
                stockUpdatePromises.push(orderRepo.decrementProductStock(update.productId, update.quantity));
            }
        }

        await Promise.all(stockUpdatePromises);
    } catch (stockError) {
        console.error("[CreateOrder] Failed to reduce stock", stockError);
    }

    const site = await orderRepo.findSiteById(siteId);
    const paymentSettings = await orderRepo.findPaymentSettings(siteId);
    const platformSettings = await orderRepo.findPlatformSettings();

    let merchantCode = paymentSettings?.gatewayMerchantId;
    let apiKey = paymentSettings?.gatewayApiKey;
    let clientKey = paymentSettings?.gatewayClientKey;
    let sandbox = paymentSettings?.gatewaySandbox ?? true;

    if (!merchantCode || !apiKey) {
        merchantCode = platformSettings?.gatewayMerchantId;
        apiKey = platformSettings?.gatewayApiKey;
        clientKey = platformSettings?.gatewayClientKey;
        sandbox = platformSettings?.gatewaySandbox ?? true;
    }

    let orderToReturn = newOrder;
    if (paymentMethod === "manual" && paymentSettings) {
        const customDetails = {
            paymentMethod: "manual",
            bankName: paymentSettings.bankName || "",
            accountHolder: paymentSettings.accountHolder || "",
            vaNumber: paymentSettings.accountNumber || "",
            instructions: paymentSettings.instructions || ""
        };
        try {
            orderToReturn = await orderRepo.updateOrderPaymentUrl(newOrder.id, `custom:${JSON.stringify(customDetails)}`);
        } catch (updateError) {
            console.error("[CreateOrder] Failed to save manual details:", updateError);
        }
    } else if (merchantCode && apiKey && paymentMethod !== "whatsapp") {
        try {
            const origin = process.env.NEXT_PUBLIC_APP_URL || "https://situsbisnis.com";
            
            const invoice = await MidtransPaymentWrapper.createInvoice({
                orderId: newOrder.id,
                amount: total,
                productDetails: `Pembayaran Pesanan #${newOrder.id} • Toko: ${site?.name || "SitusBisnis"}`,
                customer: {
                    name: customerName,
                    email: customerEmail,
                },
                returnUrl: `${origin}/checkout/success?orderId=${newOrder.id}`,
                callbackUrl: `${origin}/api/orders/webhook/payment`
            }, {
                merchantCode,
                apiKey,
                clientKey,
                sandbox
            }, "snap");

            if (invoice.success && invoice.paymentUrl) {
                orderToReturn = await orderRepo.updateOrderPaymentUrl(newOrder.id, invoice.paymentUrl, invoice.reference);
            } else {
                console.warn(`[MIDTRANS_ORDER] Invoice creation failed: ${invoice.error}`);
            }
        } catch (gatewayError) {
            console.error(`[MIDTRANS_ORDER_ERROR]`, gatewayError);
        }
    }

    return orderToReturn;
}

/**
 * Menginisialisasi pembayaran untuk pesanan yang sudah dibuat.
 */
export async function initializeOrderPayment(orderId: string, paymentMethod: string, origin: string) {
    const order = await orderRepo.findOrderById(orderId);
    if (!order) {
        throw new Error("Order not found");
    }

    const site = await orderRepo.findSiteById(order.siteId);
    const paymentSettings = await orderRepo.findPaymentSettings(order.siteId);
    const platformSettings = await orderRepo.findPlatformSettings();

    let merchantCode = paymentSettings?.gatewayMerchantId;
    let apiKey = paymentSettings?.gatewayApiKey;
    let clientKey = paymentSettings?.gatewayClientKey;
    let sandbox = paymentSettings?.gatewaySandbox ?? true;

    if (!merchantCode || !apiKey) {
        merchantCode = platformSettings?.gatewayMerchantId;
        apiKey = platformSettings?.gatewayApiKey;
        clientKey = platformSettings?.gatewayClientKey;
        sandbox = platformSettings?.gatewaySandbox ?? true;
    }

    const isGatewayEnabled = paymentSettings ? (paymentSettings.gatewayEnabled !== false) : true;
    if (!isGatewayEnabled && paymentMethod !== "manual") {
        throw new Error("Pembayaran otomatis sedang dinonaktifkan.");
    }

    if (!merchantCode || !apiKey) {
        throw new Error("Payment settings not configured");
    }

    const suffix = Date.now().toString().slice(-4);
    const uniqueOrderId = `${order.id}-${paymentMethod}-${suffix}`;

    const gatewayApiType = (platformSettings?.gatewayApiType || "snap") as "snap" | "core";

    const invoice = await MidtransPaymentWrapper.createInvoice({
        orderId: uniqueOrderId,
        amount: Number(order.total),
        productDetails: `Pembayaran Pesanan #${order.id} • Toko: ${site?.name || "SitusBisnis"}`,
        customer: {
            name: order.customerName,
            email: order.customerEmail,
        },
        paymentMethod,
        returnUrl: `${origin}/checkout/success?orderId=${order.id}`,
        callbackUrl: `${origin}/api/orders/webhook/payment`
    }, {
        merchantCode,
        apiKey,
        clientKey,
        sandbox
    }, gatewayApiType);

    if (!invoice.success) {
        throw new Error(invoice.error || `Failed to create midtrans invoice`);
    }

    const customPayload = {
        vaNumber: invoice.vaNumber || null,
        qrString: invoice.qrString || null,
        qrCodeUrl: invoice.qrCodeUrl || null,
        paymentCode: invoice.paymentCode || null,
        paymentMethod,
        category: getPaymentMethodCategory(paymentMethod),
        reference: invoice.reference,
        merchantOrderId: uniqueOrderId
    };

    const isCore = gatewayApiType === "core";
    const paymentUrl = isCore ? `custom:${JSON.stringify(customPayload)}` : (invoice.paymentUrl || "");

    const updatedOrder = await orderRepo.updateOrderPaymentUrl(order.id, paymentUrl, invoice.reference);

    return {
        success: true,
        order: {
            id: updatedOrder.id,
            paymentUrl: updatedOrder.paymentUrl,
            paymentReference: updatedOrder.paymentReference
        },
        paymentDetails: customPayload
    };
}

/**
 * Mengambil seluruh metode pembayaran yang tersedia untuk pesanan.
 */
export async function getOrderPaymentMethods(orderId: string) {
    const order = await orderRepo.findOrderById(orderId);
    if (!order) {
        throw new Error("Order not found");
    }

    const paymentSettings = await orderRepo.findPaymentSettings(order.siteId);
    const platformSettings = await orderRepo.findPlatformSettings();

    const isGatewayEnabled = paymentSettings ? (paymentSettings.gatewayEnabled !== false) : true;
    const isManualEnabled = paymentSettings ? (paymentSettings.manualEnabled !== false) : true;

    let merchantCode = paymentSettings?.gatewayMerchantId;
    let apiKey = paymentSettings?.gatewayApiKey;

    if (!merchantCode || !apiKey) {
        merchantCode = platformSettings?.gatewayMerchantId;
        apiKey = platformSettings?.gatewayApiKey;
    }

    let filteredMethods: any[] = [];
    if (isGatewayEnabled && merchantCode && apiKey) {
        const result = await MidtransPaymentWrapper.getPaymentMethods({
            amount: Math.round(Number(order.total)),
        });

        if (!result.success) {
            throw new Error(result.error || `Failed to fetch payment methods from midtrans`);
        }

        filteredMethods = result.methods || [];
    }

    // Mapping payment method images to local assets
    const imageMapping: Record<string, string> = {
        "credit_card": "/logo-pembayaran/VC.svg",
        "googlepay": "/logo-pembayaran/VC.svg",
        "bca_va": "/logo-pembayaran/BC.svg",
        "bni_va": "/logo-pembayaran/I1.svg",
        "bri_va": "/logo-pembayaran/BR.svg",
        "mandiri_va": "/media/logo-pembayaran/M2.svg",
        "permata_va": "/logo-pembayaran/BT.svg",
        "cimb_va": "/logo-pembayaran/A1.svg",
        "danamon_va": "/logo-pembayaran/A1.svg",
        "bsi_va": "/logo-pembayaran/BV.svg",
        "seabank_va": "/logo-pembayaran/A1.svg",
        "other_va": "/logo-pembayaran/A1.svg",
        "qris": "/logo-pembayaran/QRIS.svg",
        "gopay": "/logo-pembayaran/JP.svg",
        "shopeepay": "/logo-pembayaran/FT.svg",
        "ovo": "/logo-pembayaran/OV.svg",
        "dana": "/logo-pembayaran/DA.svg",
        "linkaja": "/logo-pembayaran/DA.svg",
        "indomaret": "/logo-pembayaran/DN.svg",
        "alfamart": "/logo-pembayaran/IR.svg",
        "kredivo": "/logo-pembayaran/IR.svg",
        "akulaku": "/logo-pembayaran/IR.svg",
    };

    const methods = (filteredMethods || []).map(method => ({
        ...method,
        paymentImage: imageMapping[method.paymentMethod] || "",
    }));
    
    if (isManualEnabled && paymentSettings?.bankName && paymentSettings?.accountNumber) {
        methods.push({
            paymentMethod: "manual",
            paymentName: `Transfer Bank Manual (${paymentSettings.bankName})`,
            paymentImage: "/logo-pembayaran/JP.svg",
            totalFee: "0",
            category: "Virtual Account"
        });
    }

    return { methods };
}
