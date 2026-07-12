"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CreditCard, History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { 
    validateCouponAction, 
    buySlotAction, 
    upgradePlanAction, 
    confirmManualPaymentAction,
    extendTrialAction
} from "@/modules/financial/public-actions";

// Modular Components
import { TrialBanner } from "@/modules/subscription/ui/dashboard/billing/TrialBanner";
import { PlanPreviewCard } from "@/modules/subscription/ui/dashboard/billing/PlanPreviewCard";
import { AddonSlots } from "@/modules/subscription/ui/dashboard/billing/AddonSlots";
import { FeaturesMatrix } from "@/modules/subscription/ui/dashboard/billing/FeaturesMatrix";
import { PlansList } from "@/modules/subscription/ui/dashboard/billing/PlansList";
import { PaymentConfirmation } from "@/modules/payment/ui/dashboard/billing/PaymentConfirmation";
import { PaymentMethodSelector } from "@/modules/payment/ui/dashboard/billing/PaymentMethodSelector";
import { Plan } from "@/modules/subscription/ui/dashboard/billing/types";

interface BillingClientProps {
    plans: Plan[];
    currentPlan: any | null;
    paymentMethods?: any[];
    siteId: string;
    whatsappNumber?: string;
    paymentGateway?: string;
}

export default function BillingClient({ plans, currentPlan, paymentMethods = [], siteId, whatsappNumber = "6281234567890", paymentGateway = "midtrans" }: BillingClientProps) {
    const [previewPlan, setPreviewPlan] = useState<Plan | null>(
        (currentPlan && Number(currentPlan.price) > 0)
            ? currentPlan
            : (plans.find(p => Number(p.price) > 0) || null)
    );
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [activeTx, setActiveTx] = useState<any>(null);
    const [confirmData, setConfirmData] = useState({ notes: "", proofOfPayment: "" });
    const [addonQty, setAddonQty] = useState(1);
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
    const [isUploading, setIsUploading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [paymentSelection, setPaymentSelection] = useState<{ type: "upgrade" | "buy_slot"; data?: any } | null>(null);

    // Auto-Simulation for local sandbox checkouts
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const resultCode = urlParams.get("resultCode");
            const merchantOrderId = urlParams.get("merchantOrderId");
            const hostname = window.location.hostname;

            const isLocal = 
                hostname === "localhost" ||
                hostname === "127.0.0.1" ||
                hostname.endsWith(".localhost") ||
                hostname.includes("loca.lt");

            if (isLocal && resultCode === "00" && merchantOrderId) {
                if ((window as any).__simulatedTxId === merchantOrderId) return;
                (window as any).__simulatedTxId = merchantOrderId;

                console.log(`[DEV_SIMULATION] Successful redirect detected for '${merchantOrderId}'. Auto-approving...`);
            }
        }
    }, []);

    // Coupon System States
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !previewPlan) return;
        setIsCheckingCoupon(true);
        setCouponError("");
        try {
            const res = await validateCouponAction({ code: couponCode, planId: previewPlan.id });

            if (res.success && res.result) {
                setAppliedCoupon(res.result.coupon);
            } else {
                setCouponError(res.error || "Gagal memverifikasi kupon.");
            }
        } catch (err) {
            console.error(err);
            setCouponError("Terjadi kesalahan jaringan.");
        } finally {
            setIsCheckingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponError("");
    };

    const executeBuySlot = async (method: "manual" | "midtrans", quantity: number) => {
        setIsLoading(true);
        try {
            const res = await buySlotAction({ siteId, quantity, paymentMethod: method });
            if (res.success && res.result) {
                const tx = res.result as any;
                setPaymentSelection(null);
                if (method === "midtrans" && tx.id) {
                    // Redirect to custom checkout page
                    window.location.href = `/dashboard/checkout/${tx.id}`;
                } else if (tx.paymentUrl) {
                    window.location.href = tx.paymentUrl;
                } else {
                    setActiveTx(tx);
                    setShowConfirmModal(true);
                }
            } else {
                alert(res.error || "Gagal membeli slot situs tambahan.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const executeUpgrade = async (method: "manual" | "midtrans") => {
        if (!previewPlan || (previewPlan.id === currentPlan?.id && !isTrial)) return;
        setIsLoading(true);
        try {
            const res = await upgradePlanAction({ 
                siteId, 
                planId: previewPlan.id, 
                billingCycle,
                couponCode: appliedCoupon ? appliedCoupon.code : undefined,
                paymentMethod: method
            });
            if (res.success && res.result) {
                const tx = res.result as any;
                setPaymentSelection(null);
                if (method === "midtrans" && tx.id) {
                    // Redirect to custom checkout page
                    window.location.href = `/dashboard/checkout/${tx.id}`;
                } else if (tx.paymentUrl) {
                    window.location.href = tx.paymentUrl;
                } else {
                    setActiveTx(tx);
                    setShowConfirmModal(true);
                }
            } else {
                alert(res.error || "Gagal memproses peningkatan paket.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/media", {
                method: "POST",
                headers: { "x-site-id": siteId },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setConfirmData({ ...confirmData, proofOfPayment: data.url });
            } else {
                alert("Upload gagal. Pastikan file adalah gambar dan berukuran < 10MB.");
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat upload.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirm = async () => {
        if (!activeTx) return;
        setIsLoading(true);
        try {
            const res = await confirmManualPaymentAction({
                transactionId: activeTx.id,
                ...confirmData
            });
            if (res.success) {
                const cleanedPhone = whatsappNumber.replace(/[^0-9]/g, "");
                const planName = activeTx?.plan?.name || "Layanan/Slot";
                const amountStr = `Rp ${Number(activeTx.amount).toLocaleString("id-ID")}`;
                const txId = activeTx.id || "";
                const notesStr = confirmData.notes ? `\n- *Keterangan*: ${confirmData.notes}` : "";
                const proofStr = confirmData.proofOfPayment ? `\n- *Bukti Transfer*: ${confirmData.proofOfPayment}` : "";
                const message = `Halo Admin, saya ingin konfirmasi pembayaran manual:\n\n- *ID Transaksi*: ${txId}\n- *Nominal*: ${amountStr}\n- *Paket*: ${planName}${notesStr}${proofStr}\n\nMohon segera diverifikasi. Terima kasih!`;
                const waUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
                
                // Buka chat WhatsApp Admin di tab/jendela baru
                window.open(waUrl, "_blank");

                setShowConfirmModal(false);
                window.location.reload();
            } else {
                alert(res.error || "Gagal mengirim konfirmasi pembayaran.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getTrialDays = () => {
        if (!currentPlan?.trialEndsAt) return null;
        const end = new Date(currentPlan.trialEndsAt);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const getDaysRemaining = () => {
        if (!currentPlan?.endDate) return null;
        const end = new Date(currentPlan.endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const trialDays = getTrialDays();
    const daysLeft = getDaysRemaining();
    const isTrial = currentPlan && !currentPlan.endDate && currentPlan.trialEndsAt;

    const handleExtendTrial = async () => {
        setIsLoading(true);
        try {
            const res = await extendTrialAction({ siteId });
            if (res.success) {
                window.location.reload();
            } else {
                alert(res.error || "Gagal memperpanjang trial");
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan koneksi saat memperpanjang trial.");
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-6 text-foreground">
            <PageHeader
                title="Tagihan & Layanan"
                subtitle="Kelola paket langganan dan fitur situs Anda."
                icon={<CreditCard />}
            >
                {/* Billing Toggle (Only show if not in confirmation step) */}
                {!showConfirmModal && (
                    <div className="bg-muted/10 border border-border p-1 rounded-2xl flex items-center shadow-inner">
                        <button
                            type="button"
                            onClick={() => setBillingCycle("monthly")}
                            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${billingCycle === "monthly" ? "bg-background text-primary shadow-md shadow-black/5" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Bulanan
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("yearly")}
                            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 ${billingCycle === "yearly" ? "bg-background text-primary shadow-md shadow-black/5" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Tahunan
                            <span className="bg-primary/10 text-primary text-[7px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                HEMAT 20%
                            </span>
                        </button>
                    </div>
                )}
            </PageHeader>

            {/* Premium Tab Navigation & Actions Row */}
            <div className="flex border-b border-border/60 pb-px">
                <div className="flex overflow-x-auto no-scrollbar">
                    <Link
                        href="/dashboard/billing"
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 border-primary text-primary transition-all duration-300 -mb-[1px] flex items-center gap-2 shrink-0"
                    >
                        <CreditCard size={14} />
                        Paket & Layanan
                    </Link>
                    <Link
                        href="/dashboard/history-bill"
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-300 -mb-[1px] flex items-center gap-2 shrink-0"
                    >
                        <History size={14} />
                        Riwayat Pesanan
                    </Link>
                </div>
            </div>

            {/* Trial / Expiry Banner */}
            {isTrial && trialDays !== null ? (
                <TrialBanner 
                    trialDays={trialDays} 
                    isLoading={isLoading} 
                    onExtendTrial={handleExtendTrial} 
                    canExtend={!currentPlan.trialExtended} 
                />
            ) : (
                daysLeft !== null && (daysLeft <= 0 || currentPlan?.status === "past_due") ? (
                    <TrialBanner 
                        daysLeft={daysLeft} 
                        isPastDue={currentPlan?.status === "past_due"} 
                    />
                ) : null
            )}

            {showConfirmModal ? (
                <PaymentConfirmation 
                    activeTx={activeTx}
                    paymentMethods={paymentMethods}
                    confirmData={confirmData}
                    setConfirmData={setConfirmData}
                    handleFileUpload={handleFileUpload}
                    handleConfirm={handleConfirm}
                    handleCopy={handleCopy}
                    copied={copied}
                    isLoading={isLoading}
                    isUploading={isUploading}
                    onCancel={() => setShowConfirmModal(false)}
                />
            ) : paymentSelection ? (
                <PaymentMethodSelector
                    selection={paymentSelection}
                    billingCycle={billingCycle}
                    previewPlan={previewPlan}
                    appliedCoupon={appliedCoupon}
                    isLoading={isLoading}
                    paymentGateway={paymentGateway}
                    onCancel={() => setPaymentSelection(null)}
                    onProceed={async (method) => {
                        if (paymentSelection.type === "upgrade") {
                            await executeUpgrade(method);
                        } else {
                            await executeBuySlot(method, paymentSelection.data?.quantity || 1);
                        }
                    }}
                />
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Current Plan Card / Preview Card */}
                            <PlanPreviewCard 
                                previewPlan={previewPlan}
                                currentPlan={currentPlan}
                                billingCycle={billingCycle}
                                isLoading={isLoading}
                                onUpgrade={() => setPaymentSelection({ type: "upgrade" })}
                                daysLeft={daysLeft}
                                isTrial={!!isTrial}
                                trialDays={trialDays}
                                couponCode={couponCode}
                                setCouponCode={setCouponCode}
                                appliedCoupon={appliedCoupon}
                                onApplyCoupon={handleApplyCoupon}
                                onRemoveCoupon={handleRemoveCoupon}
                                isCheckingCoupon={isCheckingCoupon}
                                couponError={couponError}
                            />

                            {/* Add-on Slots Section */}
                            <AddonSlots 
                                currentPlan={currentPlan}
                                addonQty={addonQty}
                                setAddonQty={setAddonQty}
                                isLoading={isLoading}
                                onBuySlot={() => setPaymentSelection({ type: "buy_slot", data: { quantity: addonQty } })}
                            />

                            {/* Features Matrix */}
                            <FeaturesMatrix previewPlan={previewPlan} />
                        </div>

                        {/* Upgrade / Billing Side Panel */}
                        <div className="space-y-6 lg:sticky lg:top-24 self-start">
                            <PlansList 
                                plans={plans}
                                currentPlan={currentPlan}
                                previewPlan={previewPlan}
                                setPreviewPlan={(p) => {
                                    setPreviewPlan(p);
                                    setCouponCode("");
                                    setAppliedCoupon(null);
                                    setCouponError("");
                                }}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
