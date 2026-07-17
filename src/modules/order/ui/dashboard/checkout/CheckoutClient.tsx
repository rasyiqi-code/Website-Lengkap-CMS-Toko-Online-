"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    ShieldCheck,
    AlertCircle,
} from "lucide-react";
import { CheckoutClientProps, PaymentMethod } from "./types";
import { useCountdown, formatRp } from "./utils";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { PaymentDetailsCard } from "./PaymentDetailsCard";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { 
    getPaymentMethodsAction, 
    checkTransactionStatusAction, 
    initializeCheckoutPaymentAction 
} from "@/modules/financial/public-actions";

export function CheckoutClient({ 
    transaction, 
    platformName: _platformName, 
    isGatewayConfigured,
    paymentGateway = "midtrans",
    gatewayApiType = "snap",
    gatewayClientKey = "",
    gatewaySandbox = true,
}: CheckoutClientProps) {
    const router = useRouter();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [isLoadingMethods, setIsLoadingMethods] = useState(false);
    const [methodsError, setMethodsError] = useState<string | null>(null);
    const [status, setStatus] = useState(transaction.status);
    const [isPolling, setIsPolling] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isProceeding, setIsProceeding] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>("Virtual Account");
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { h, m, s, expired } = useCountdown(transaction.createdAt);

    const [customPaymentDetails, setCustomPaymentDetails] = useState<any>(() => {
        if (transaction.paymentUrl && transaction.paymentUrl.startsWith("custom:")) {
            try {
                return JSON.parse(transaction.paymentUrl.substring(7));
            } catch {
                return null;
            }
        }
        return null;
    });

    const isMidtransSnap = paymentGateway === "midtrans" && gatewayApiType === "snap";

    // Load Snap.js jika Midtrans Snap aktif
    useEffect(() => {
        if (isMidtransSnap) {
            const snapSrc = gatewaySandbox 
                ? "https://app.sandbox.midtrans.com/snap/snap.js"
                : "https://app.midtrans.com/snap/snap.js";
            
            let script = document.querySelector(`script[src="${snapSrc}"]`) as HTMLScriptElement;
            if (!script) {
                script = document.createElement("script");
                script.src = snapSrc;
                script.setAttribute("data-client-key", gatewayClientKey || "");
                document.body.appendChild(script);
            }
        }
    }, [isMidtransSnap, gatewaySandbox, gatewayClientKey]);

    const triggerSnapPopup = useCallback((token: string, redirectUrl: string) => {
        if (typeof window !== "undefined" && (window as any).snap) {
            (window as any).snap.pay(token, {
                onSuccess: function (_result: any) {
                    setStatus("paid");
                    router.push("/dashboard/billing?status=success");
                },
                onPending: function (_result: any) {
                },
                onError: function (result: any) {
                    console.error("Snap error:", result);
                    alert("Pembayaran gagal atau dibatalkan.");
                },
                onClose: function () {
                }
            });
        } else {
            // Fallback ke redirect URL jika snap.js belum/gagal ter-load
            setTimeout(() => {
                setIsRedirecting(true);
                window.location.href = redirectUrl;
            }, 0);
        }
    }, [router]);

    // Auto-proceed untuk Midtrans Snap
    const hasAttemptedSnapInit = useRef(false);
    useEffect(() => {
        if (isMidtransSnap && !expired && !customPaymentDetails && !isProceeding && status === "pending" && !hasAttemptedSnapInit.current) {
            hasAttemptedSnapInit.current = true;
            
            if (transaction.paymentReference && transaction.paymentUrl && !transaction.paymentUrl.startsWith("custom:")) {
                triggerSnapPopup(transaction.paymentReference, transaction.paymentUrl);
            } else {
                const autoInitSnap = async () => {
                    setIsProceeding(true);
                    try {
                        const res = await initializeCheckoutPaymentAction({ 
                            transactionId: transaction.id, 
                            paymentMethod: "midtrans" 
                        });
                        if (res.success && res.result) {
                            const data = res.result as any;
                            if (data.success && data.transaction?.paymentReference && data.transaction?.paymentUrl) {
                                triggerSnapPopup(data.transaction.paymentReference, data.transaction.paymentUrl);
                            } else if (data.success && data.transaction?.paymentUrl) {
                                setTimeout(() => {
                                    setIsRedirecting(true);
                                    window.location.href = data.transaction.paymentUrl;
                                }, 0);
                            } else {
                                alert(data.error || "Gagal menginisialisasi Midtrans Snap.");
                            }
                        } else {
                            alert(res.error || "Gagal menginisialisasi pembayaran.");
                        }
                    } catch (err) {
                        console.error("Auto init snap error:", err);
                    } finally {
                        setIsProceeding(false);
                    }
                };
                autoInitSnap();
            }
        }
    }, [isMidtransSnap, expired, customPaymentDetails, transaction, status, isProceeding, triggerSnapPopup]);

    // ── Fetch payment methods ─────────────────────────────────────────────────
    const fetchPaymentMethods = useCallback(async () => {
        if (!isGatewayConfigured) return;
        setIsLoadingMethods(true);
        setMethodsError(null);
        try {
            const res = await getPaymentMethodsAction({ amount: transaction.amount });
            if (res.success && res.result) {
                setPaymentMethods(res.result.methods || []);
            } else {
                setMethodsError(res.error || "Gagal memuat metode pembayaran.");
            }
        } catch {
            setMethodsError("Terjadi kesalahan jaringan.");
        } finally {
            setIsLoadingMethods(false);
        }
    }, [transaction.amount, isGatewayConfigured]);

    useEffect(() => {
        if (!customPaymentDetails) {
            const timer = setTimeout(() => {
                fetchPaymentMethods();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [fetchPaymentMethods, customPaymentDetails]);

    // ── Status polling ────────────────────────────────────────────────────────
    const checkStatus = useCallback(async () => {
        if (status === "paid" || status === "cancelled") return;
        setIsPolling(true);
        try {
            const res = await checkTransactionStatusAction({ transactionId: transaction.id });
            if (res.success && res.result) {
                setStatus(res.result.status);
                if (res.result.status === "paid") {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setTimeout(() => {
                        setIsRedirecting(true);
                        router.push("/dashboard/billing?status=success");
                    }, 2500);
                }
            }
        } catch { /* silent */ } finally {
            setIsPolling(false);
        }
    }, [transaction.id, status, router]);

    useEffect(() => {
        if (status === "paid" || status === "cancelled" || expired) return;
        pollingRef.current = setInterval(checkStatus, 7000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [checkStatus, status, expired]);

    // ── Handle proceed with method ────────────────────────────────────────────
    const handleProceed = async () => {
        if (!selectedMethod || isProceeding) return;
        setIsProceeding(true);
        try {
            const res = await initializeCheckoutPaymentAction({ transactionId: transaction.id, paymentMethod: selectedMethod });
            if (res.success && res.result) {
                const data = res.result as any;
                if (data.success && data.transaction?.paymentUrl && !data.transaction.paymentUrl.startsWith("custom:")) {
                    if (paymentGateway === "midtrans" && data.transaction.paymentReference) {
                        triggerSnapPopup(data.transaction.paymentReference, data.transaction.paymentUrl);
                    } else {
                        setIsRedirecting(true);
                        window.location.href = data.transaction.paymentUrl;
                    }
                    return;
                }
                if (data.success && data.paymentDetails) {
                    setCustomPaymentDetails(data.paymentDetails);
                } else {
                    const errMsg = data.error || "Gagal memproses pembayaran.";
                    console.error("[CHECKOUT] Payment error:", errMsg, data);
                    alert(errMsg);
                }
            } else {
                const errMsg = res.error || "Gagal memproses pembayaran.";
                console.error("[CHECKOUT] Payment action error:", errMsg, res);
                alert(errMsg);
            }
        } catch {
            alert("Terjadi kesalahan jaringan.");
        } finally {
            setIsProceeding(false);
        }
    };

    const handleResetPayment = () => {
        setCustomPaymentDetails(null);
        setSelectedMethod(null);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    if (status === "paid" || isRedirecting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-background to-background p-4">
                <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
                        <CheckCircle2 size={48} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tight">Pembayaran Berhasil!</h1>
                        <p className="text-muted-foreground mt-2">Paket Anda sedang diaktifkan...</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-bold">
                        <Loader2 size={14} className="animate-spin" />
                        Mengalihkan ke dashboard...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Top bar */}
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/60 px-4 md:px-6 py-3.5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Kembali
                </button>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Secured by Midtrans</span>
                </div>
                {/* Spacer to keep middle element centered */}
                <div className="w-[70px] shrink-0" />
            </div>

            <div className="w-full px-4 md:px-8 py-5 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* Left Column: Order Summary */}
                <OrderSummaryCard
                    transaction={transaction}
                    customPaymentDetails={customPaymentDetails}
                    expired={expired}
                    h={h}
                    m={m}
                    s={s}
                    copied={copied}
                    onCopy={handleCopy}
                    isPolling={isPolling}
                    onCheckStatus={checkStatus}
                />

                {/* Right Column: Payment Method & Details */}
                <div className="lg:col-span-3 space-y-3">
                    {!isGatewayConfigured ? (
                        <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
                            <AlertCircle size={32} className="mx-auto text-amber-500" />
                            <p className="font-black text-foreground">Payment gateway belum dikonfigurasi</p>
                            <p className="text-xs text-muted-foreground">Hubungi admin platform untuk menyelesaikan pembayaran Anda.</p>
                        </div>
                    ) : customPaymentDetails ? (
                        <PaymentDetailsCard
                            customPaymentDetails={customPaymentDetails}
                            copied={copied}
                            onCopy={handleCopy}
                            onResetPayment={handleResetPayment}
                        />
                    ) : isMidtransSnap ? (
                        <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4 shadow-sm flex flex-col items-center">
                            {isProceeding ? (
                                <Loader2 size={32} className="animate-spin text-primary shrink-0" />
                            ) : (
                                <ShieldCheck size={32} className="text-primary shrink-0" />
                            )}
                            <div>
                                <h4 className="text-sm font-bold text-foreground">Menghubungkan ke Midtrans Snap</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Mohon tunggu sebentar, kami sedang membuka halaman pembayaran otomatis Midtrans Snap untuk Anda.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (transaction.paymentReference && transaction.paymentUrl) {
                                        triggerSnapPopup(transaction.paymentReference, transaction.paymentUrl);
                                    } else {
                                        hasAttemptedSnapInit.current = false;
                                        setStatus("pending");
                                    }
                                }}
                                className="bg-primary hover:bg-primary/95 text-primary-foreground px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                Buka Ulang Pembayaran Snap
                            </button>
                        </div>
                    ) : (
                        <PaymentMethodSelector
                            isLoadingMethods={isLoadingMethods}
                            methodsError={methodsError}
                            paymentMethods={paymentMethods}
                            selectedMethod={selectedMethod}
                            onSelectMethod={setSelectedMethod}
                            onFetchPaymentMethods={fetchPaymentMethods}
                            onProceed={handleProceed}
                            isProceeding={isProceeding}
                            expired={expired}
                            expandedCategory={expandedCategory}
                            onToggleCategory={setExpandedCategory}
                            formatRp={formatRp}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
