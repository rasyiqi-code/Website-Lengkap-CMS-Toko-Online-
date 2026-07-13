import midtransClient from "midtrans-client";
import crypto from "crypto";

export function getPaymentMethodCategory(paymentMethod: string): string {
    const method = paymentMethod.toLowerCase();
    if (method.endsWith("_va") || method === "bca" || method === "bni" || method === "bri" || method === "mandiri" || method === "permata") {
        return "va";
    }
    if (method === "qris" || method === "gopay" || method === "shopeepay" || method === "ovo" || method === "dana" || method === "linkaja") {
        return "qr";
    }
    if (method === "alfamart" || method === "indomaret") {
        return "cstore";
    }
    return "other";
}

function mapMethodToMidtransEnabledPayments(paymentMethod: string): string | null {
    const method = paymentMethod.toLowerCase();
    if (method === "bca_va" || method === "bca") return "bca_va";
    if (method === "bni_va" || method === "bni") return "bni_va";
    if (method === "bri_va" || method === "bri") return "bri_va";
    if (method === "mandiri_va" || method === "mandiri") return "echannel";
    if (method === "permata_va" || method === "permata") return "permata_va";
    if (method === "qris") return "qris";
    if (method === "gopay") return "gopay";
    if (method === "shopeepay") return "shopeepay";
    return null;
}

export class MidtransPaymentWrapper {
    static async createInvoice(params: any, config: any, apiType = "snap") {
        try {
            const isProduction = !config.sandbox;
            const serverKey = config.apiKey;

            if (apiType === "core") {
                const coreApi = new (midtransClient as any).CoreApi({
                    isProduction,
                    serverKey,
                    clientKey: config.clientKey
                });

                const customerDetails: any = {
                    first_name: params.customer.name,
                    email: params.customer.email,
                };
                if (params.customer.phone) {
                    customerDetails.phone = params.customer.phone;
                }

                const parameter: any = {
                    transaction_details: {
                        order_id: params.orderId,
                        gross_amount: Math.round(params.amount)
                    },
                    customer_details: customerDetails,
                    item_details: [
                        {
                            id: params.orderId,
                            price: Math.round(params.amount),
                            quantity: 1,
                            name: params.productDetails || "Pembayaran SitusBisnis",
                            merchant_name: "SitusBisnis"
                        }
                    ]
                };

                const method = (params.paymentMethod || "").toLowerCase();
                if (method === "bca_va" || method === "bca") {
                    parameter.payment_type = "bank_transfer";
                    parameter.bank_transfer = { bank: "bca" };
                } else if (method === "bni_va" || method === "bni") {
                    parameter.payment_type = "bank_transfer";
                    parameter.bank_transfer = { bank: "bni" };
                } else if (method === "bri_va" || method === "bri") {
                    parameter.payment_type = "bank_transfer";
                    parameter.bank_transfer = { bank: "bri" };
                } else if (method === "mandiri_va" || method === "mandiri") {
                    parameter.payment_type = "echannel";
                    parameter.echannel = { bill_info1: "Pembayaran", bill_info2: "SitusBisnis" };
                } else if (method === "permata_va" || method === "permata") {
                    parameter.payment_type = "bank_transfer";
                    parameter.bank_transfer = { bank: "permata" };
                } else if (method === "qris") {
                    parameter.payment_type = "qris";
                    parameter.qris = { acquirer: "gopay" };
                } else if (method === "gopay") {
                    parameter.payment_type = "gopay";
                } else if (method === "shopeepay") {
                    parameter.payment_type = "shopeepay";
                } else {
                    parameter.payment_type = "bank_transfer";
                    parameter.bank_transfer = { bank: "bca" };
                }

                const response = await coreApi.charge(parameter);

                let vaNumber = undefined;
                let qrString = undefined;
                let paymentCode = undefined;

                if (response.va_numbers && response.va_numbers[0]) {
                    vaNumber = response.va_numbers[0].va_number;
                } else if (response.permata_va_number) {
                    vaNumber = response.permata_va_number;
                } else if (response.bill_key) {
                    vaNumber = response.bill_key;
                }

                if (response.qr_string) {
                    qrString = response.qr_string;
                } else if (response.actions) {
                    const qrAction = response.actions.find((a: any) => a.name === "generate-qr-code");
                    if (qrAction) qrString = qrAction.url;
                }

                if (response.payment_code) {
                    paymentCode = response.payment_code;
                }

                return {
                    success: true,
                    paymentUrl: response.redirect_url || "",
                    vaNumber,
                    qrString,
                    qrCodeUrl: undefined,
                    paymentCode,
                    reference: response.transaction_id || response.order_id,
                    error: undefined
                };
            } else {
                const snap = new (midtransClient as any).Snap({
                    isProduction,
                    serverKey
                });

                const parameter: any = {
                    transaction_details: {
                        order_id: params.orderId,
                        gross_amount: Math.round(params.amount)
                    },
                    customer_details: {
                        first_name: params.customer.name,
                        email: params.customer.email
                    },
                    callbacks: {
                        finish: params.returnUrl
                    }
                };

                if (params.paymentMethod) {
                    const mapped = mapMethodToMidtransEnabledPayments(params.paymentMethod);
                    if (mapped) {
                        parameter.enabled_payments = [mapped];
                    }
                }

                const response = await snap.createTransaction(parameter);
                return {
                    success: true,
                    paymentUrl: response.redirect_url,
                    reference: response.token,
                    vaNumber: undefined,
                    qrString: undefined,
                    qrCodeUrl: undefined,
                    paymentCode: undefined,
                    error: undefined
                };
            }
        } catch (error: any) {
            const detail = {
                statusCode: error.httpStatusCode,
                apiResponse: error.ApiResponse,
                message: error.message
            };
            console.error("[MIDTRANS] createInvoice failed:", JSON.stringify(detail, null, 2));
            return {
                success: false,
                error: error.ApiResponse?.status_message || error.message || "Midtrans error",
                paymentUrl: "",
                reference: "",
                vaNumber: undefined,
                qrString: undefined,
                qrCodeUrl: undefined,
                paymentCode: undefined
            };
        }
    }

    static async checkTransaction(params: any, config: any) {
        try {
            const snap = new (midtransClient as any).Snap({
                isProduction: !config.sandbox,
                serverKey: config.apiKey
            });

            const response = await snap.transaction().status(params.merchantOrderId);
            let status = "pending";
            if (response.transaction_status === "settlement" || response.transaction_status === "capture") {
                status = "paid";
            } else if (response.transaction_status === "deny" || response.transaction_status === "cancel" || response.transaction_status === "expire") {
                status = "failed";
            }

            return {
                success: true,
                status,
                statusCode: response.status_code,
                error: undefined
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Check transaction error",
                status: "failed",
                statusCode: ""
            };
        }
    }

    static async verifyCallback(body: any, config: any) {
        try {
            const stringToHash = body.order_id + body.status_code + body.gross_amount + config.apiKey;
            // codeql[js/insufficient-password-hash] - Midtrans webhook signature verification requires SHA-512, this is not a password hash.
            const hash = crypto.createHash("sha512").update(stringToHash).digest("hex");
            const isValid = hash === body.signature_key;

            let status = "pending";
            if (body.transaction_status === "settlement" || body.transaction_status === "capture") {
                status = "paid";
            } else if (body.transaction_status === "deny" || body.transaction_status === "cancel" || body.transaction_status === "expire") {
                status = "failed";
            }

            return {
                isValid,
                status
            };
        } catch {
            return {
                isValid: false,
                status: "failed"
            };
        }
    }

    static async getPaymentMethods(_params: any) {
        return {
            success: true,
            error: undefined,
            methods: [
                { paymentMethod: "bca_va", paymentName: "BCA Virtual Account", totalFee: "0", category: "Virtual Account" },
                { paymentMethod: "bni_va", paymentName: "BNI Virtual Account", totalFee: "0", category: "Virtual Account" },
                { paymentMethod: "bri_va", paymentName: "BRI Virtual Account", totalFee: "0", category: "Virtual Account" },
                { paymentMethod: "mandiri_va", paymentName: "Mandiri Virtual Account", totalFee: "0", category: "Virtual Account" },
                { paymentMethod: "permata_va", paymentName: "Permata Virtual Account", totalFee: "0", category: "Virtual Account" },
                { paymentMethod: "qris", paymentName: "QRIS (Gopay, OVO, Dana, dll)", totalFee: "0", category: "QRIS" },
                { paymentMethod: "gopay", paymentName: "GoPay", totalFee: "0", category: "E-Wallet" },
                { paymentMethod: "shopeepay", paymentName: "ShopeePay", totalFee: "0", category: "E-Wallet" }
            ]
        };
    }
}
