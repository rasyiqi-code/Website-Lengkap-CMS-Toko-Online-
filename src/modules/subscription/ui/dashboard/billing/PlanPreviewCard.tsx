import React from "react";
import { Zap, ArrowUpRight, AlertCircle } from "lucide-react";
import { Plan } from "./types";

interface PlanPreviewCardProps {
    previewPlan: Plan | null;
    currentPlan: any | null;
    billingCycle: "monthly" | "yearly";
    isLoading: boolean;
    onUpgrade: () => void;
    daysLeft: number | null;
    isTrial: boolean;
    trialDays?: number | null;
    // Coupon system
    couponCode: string;
    setCouponCode: (_val: string) => void;
    appliedCoupon: any;
    onApplyCoupon: () => void;
    onRemoveCoupon: () => void;
    isCheckingCoupon: boolean;
    couponError: string;
}

export function PlanPreviewCard({
    previewPlan,
    currentPlan,
    billingCycle,
    isLoading,
    onUpgrade,
    daysLeft,
    isTrial,
    trialDays = null,
    couponCode,
    setCouponCode,
    appliedCoupon,
    onApplyCoupon,
    onRemoveCoupon,
    isCheckingCoupon,
    couponError
}: PlanPreviewCardProps) {
    const basePrice = Number(
        billingCycle === "yearly"
            ? (previewPlan?.priceYearly || Number(previewPlan?.price || 0) * 12)
            : (previewPlan?.price || 0)
    );

    const originalPriceFormatted = basePrice.toLocaleString("id-ID");

    let discountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === "percentage") {
            discountAmount = basePrice * (appliedCoupon.discountValue / 100);
        } else {
            discountAmount = appliedCoupon.discountValue;
        }
    }
    const discountedPriceFormatted = Math.max(0, basePrice - discountAmount).toLocaleString("id-ID");

    const isExpiredTrial = isTrial && trialDays !== null && trialDays <= 0;
    const isNearExpiryPaid = !isTrial && daysLeft !== null && daysLeft <= 7;
    const isExpiredPaid = !isTrial && daysLeft !== null && daysLeft <= 0;

    const showButton = 
        previewPlan?.id !== currentPlan?.id || 
        isTrial || 
        isNearExpiryPaid || 
        isExpiredPaid;

    const buttonLabel = (() => {
        if (isLoading) return "Memproses...";
        if (previewPlan?.id !== currentPlan?.id) {
            return "Tingkatkan Sekarang";
        }
        if (isExpiredTrial) {
            return "Aktifkan Paket (Masa Trial Habis)";
        }
        if (isTrial) {
            return "Aktifkan & Bayar Sekarang";
        }
        if (isExpiredPaid || isNearExpiryPaid) {
            return "Perpanjang Paket";
        }
        return "Tingkatkan Sekarang";
    })();

    const buttonBgClass = (() => {
        if (previewPlan?.id !== currentPlan?.id) {
            return "bg-primary text-primary-foreground shadow-primary/10 hover:bg-primary/90";
        }
        if (isExpiredTrial) {
            return "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10";
        }
        if (isTrial) {
            return "bg-primary text-primary-foreground shadow-primary/10 hover:bg-primary/90";
        }
        if (isExpiredPaid) {
            return "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10";
        }
        if (isNearExpiryPaid) {
            return "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/10";
        }
        return "bg-primary text-primary-foreground shadow-primary/10 hover:bg-primary/90";
    })();

    return (
        <div className="bg-card border border-border rounded-xl p-4 md:p-5 relative overflow-hidden shadow-md group min-h-[150px] transition-all duration-500 hover:border-primary/20">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap size={80} />
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
                <div className="animate-in slide-in-from-left-4 duration-500 flex-1">
                    <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] rounded-full mb-1.5 inline-block shadow-sm ${
                        previewPlan?.id !== currentPlan?.id 
                            ? "bg-primary text-primary-foreground shadow-primary/10"
                            : isExpiredTrial || isExpiredPaid
                            ? "bg-red-500 text-white shadow-red-500/10"
                            : isNearExpiryPaid
                            ? "bg-amber-500 text-white shadow-amber-500/10"
                            : "bg-primary text-primary-foreground shadow-primary/10"
                    }`}>
                        {previewPlan?.id === currentPlan?.id
                            ? isTrial 
                                ? (isExpiredTrial ? "Trial Berakhir" : "Masa Uji Coba")
                                : isExpiredPaid ? "Kedaluwarsa"
                                : isNearExpiryPaid ? "Segera Berakhir"
                                : "Paket Aktif"
                            : "Pratinjau Paket"}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                        {previewPlan?.name?.toLowerCase() === "free" ? "Gratis" : (previewPlan?.name || "Belum Aktif")}
                    </h2>
                    <p className="text-muted-foreground text-[10px] mt-1 font-medium max-w-md opacity-70 leading-relaxed">{previewPlan?.description || "Situs ini belum memiliki paket aktif."}</p>

                    {showButton && (
                        <button
                            onClick={onUpgrade}
                            disabled={isLoading}
                            className={`mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] hover:scale-102 active:scale-98 transition-all shadow-sm group disabled:opacity-50 ${buttonBgClass}`}
                        >
                            {buttonLabel}
                            <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                    )}

                    {previewPlan?.id === currentPlan?.id && daysLeft !== null && (
                        <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/15 animate-in fade-in duration-500">
                            <AlertCircle size={12} />
                            Masa Aktif: {daysLeft > 0 ? `${daysLeft} Hari Lagi` : "Sudah Berakhir"}
                        </div>
                    )}

                    {/* Coupon Input Box */}
                    {showButton && previewPlan?.name?.toLowerCase() !== "free" && (
                        <div className="mt-5 pt-4 border-t border-border/60 max-w-sm space-y-2">
                            <label htmlFor="coupon-input" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
                                Miliki Kode Kupon / Promo?
                            </label>
                            {appliedCoupon ? (
                                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-300">
                                    <span className="flex items-center gap-1 font-mono">
                                        🎟️ Kupon: {appliedCoupon.code} ({appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}% Off` : `Diskon Rp ${Number(appliedCoupon.discountValue).toLocaleString("id-ID")}`})
                                    </span>
                                    <button
                                        onClick={onRemoveCoupon}
                                        type="button"
                                        className="text-[9px] font-black uppercase text-rose-500 hover:underline cursor-pointer tracking-wider"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="flex gap-2">
                                        <input
                                            id="coupon-input"
                                            type="text"
                                            placeholder="Contoh: DISKON20"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            className="flex-1 bg-muted/10 border border-border hover:border-border-hover rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-foreground font-mono tracking-wider outline-none focus:ring-1 focus:ring-primary/45 uppercase placeholder:text-muted-foreground/30"
                                        />
                                        <button
                                            onClick={onApplyCoupon}
                                            disabled={isCheckingCoupon || !couponCode.trim()}
                                            type="button"
                                            className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                                        >
                                            {isCheckingCoupon ? "..." : "Terapkan"}
                                        </button>
                                    </div>
                                    {couponError && (
                                        <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest animate-in fade-in duration-300">
                                            {couponError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-left md:text-right shrink-0 animate-in slide-in-from-right-4 duration-500">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                        {previewPlan?.id === currentPlan?.id ? "Biaya Terbayar" : billingCycle === "yearly" ? "Biaya Tahunan" : "Biaya Bulanan"}
                    </p>
                    <p className="text-2xl md:text-3xl font-black text-foreground tracking-tighter uppercase leading-none">
                        {appliedCoupon ? (
                            <span className="flex flex-col md:items-end">
                                <span className="line-through text-muted-foreground opacity-45 text-xs md:text-sm font-medium font-sans">
                                    Rp {originalPriceFormatted}
                                </span>
                                <span className="text-emerald-500">
                                    Rp {discountedPriceFormatted}
                                </span>
                            </span>
                        ) : (
                            previewPlan?.price ? (
                                `Rp ${Number(
                                    billingCycle === "yearly"
                                        ? (previewPlan.priceYearly || Number(previewPlan.price) * 12)
                                        : previewPlan.price
                                ).toLocaleString()}`
                            ) : "0"
                        )}
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-1 opacity-50">
                            / {billingCycle === "yearly" ? "thn" : "bln"}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
