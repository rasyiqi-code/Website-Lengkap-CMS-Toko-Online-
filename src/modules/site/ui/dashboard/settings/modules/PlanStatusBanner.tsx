"use client";

import React from "react";
import { AlertCircle, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface PlanStatusBannerProps {
    plan: string;
    planPrice: number;
    allPlans: { id: string; name: string; price: number }[];
    isFree: boolean;
    isTrial?: boolean;
    trialEndsAt?: string | null;
    isExpired?: boolean;
    isGracePeriod?: boolean;
}

export function PlanStatusBanner({ 
    plan, 
    planPrice, 
    allPlans, 
    isFree, 
    isTrial = false, 
    trialEndsAt = null,
    isExpired = false,
    isGracePeriod = false
}: PlanStatusBannerProps) {
    // --- Banner Expired (Masa tenggang habis) ---
    if (isExpired) {
        return (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex items-start gap-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700 text-red-500">
                    <Sparkles size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 text-red-500 shadow-inner">
                    <AlertCircle size={24} />
                </div>
                <div className="space-y-2 relative z-10 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                        Status Paket 
                        <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] rounded uppercase font-black tracking-widest animate-pulse">
                            Kedaluwarsa
                        </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-80 leading-relaxed uppercase tracking-tight max-w-xl">
                        Masa aktif paket <strong className="font-extrabold text-red-600">{plan}</strong> Anda telah berakhir sepenuhnya. 
                        Akses publik situs Anda saat ini ditangguhkan. Lakukan perpanjangan untuk mengaktifkan kembali situs Anda.
                    </p>
                    <div className="pt-2">
                        <Link 
                            href="/dashboard/billing" 
                            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-red-950/20"
                        >
                            <CreditCard size={12} /> Perpanjang Sekarang
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // --- Banner Grace Period (Masa tenggang) ---
    if (isGracePeriod) {
        return (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 flex items-start gap-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700 text-orange-500">
                    <Sparkles size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-500 shadow-inner">
                    <AlertCircle size={24} />
                </div>
                <div className="space-y-2 relative z-10 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                        Status Paket 
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] rounded uppercase font-black tracking-widest animate-pulse">
                            Masa Tenggang
                        </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-80 leading-relaxed uppercase tracking-tight max-w-xl">
                        Masa aktif paket <strong className="font-extrabold text-orange-600">{plan}</strong> Anda telah berakhir, namun situs Anda masih dapat diakses dalam masa tenggang 30 hari.
                        Segera lakukan perpanjangan agar situs tidak ditangguhkan.
                    </p>
                    <div className="pt-2">
                        <Link 
                            href="/dashboard/billing" 
                            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-950/20"
                        >
                            <CreditCard size={12} /> Perpanjang Sekarang
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    // --- Banner Trial Aktif ---
    if (isTrial) {
        const dateStr = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }) : "";

        return (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700 text-amber-500">
                    <Sparkles size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500 shadow-inner">
                    <AlertCircle size={24} />
                </div>
                <div className="space-y-2 relative z-10 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                        Status Paket 
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] rounded uppercase font-black tracking-widest animate-pulse">
                            Uji Coba {plan}
                        </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-80 leading-relaxed uppercase tracking-tight max-w-xl">
                        Situs Anda saat ini berada dalam masa uji coba paket premium <strong className="font-extrabold text-slate-800">{plan}</strong>. 
                        {dateStr && <> Masa uji coba gratis Anda akan berakhir pada <strong className="font-extrabold text-slate-800">{dateStr}</strong>.</>}
                    </p>
                    <div className="pt-2">
                        <Link 
                            href="/dashboard/billing" 
                            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-amber-950/20"
                        >
                            <CreditCard size={12} /> Aktivasi Paket Premium
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Determine if this is the highest premium plan tier in allPlans
    const premiumPlans = allPlans.filter(p => p.price > 0);
    const maxPremiumPrice = premiumPlans.length > 0 ? Math.max(...premiumPlans.map(p => p.price)) : 0;
    const isHighestTier = planPrice > 0 && planPrice >= maxPremiumPrice;

    if (isHighestTier) {
        return (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 flex items-start gap-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700 text-green-500">
                    <Sparkles size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 text-green-500 shadow-inner">
                    <CheckCircle2 size={24} />
                </div>
                <div className="space-y-2 relative z-10">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                        Status Paket 
                        <span className="px-2 py-0.5 bg-green-500 text-white text-[8px] rounded uppercase font-black tracking-widest">
                            {plan}
                        </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-80 leading-relaxed uppercase tracking-tight max-w-xl">
                        Selamat! Anda telah berada pada tingkatan paket tertinggi ({plan}). Seluruh modul premium dan kapasitas maksimal telah terbuka untuk mendukung pertumbuhan bisnis Anda.
                    </p>
                </div>
            </div>
        );
    }

    if (!isFree && planPrice > 0) {
        // Find next upgradeable plan in allPlans (sorted by price asc)
        const nextPlan = allPlans.find(p => p.price > planPrice);

        return (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 flex items-start gap-5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700 text-indigo-500">
                    <Sparkles size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-500 shadow-inner">
                    <CheckCircle2 size={24} />
                </div>
                <div className="space-y-2 relative z-10 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                        Status Paket 
                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] rounded uppercase font-black tracking-widest">
                            {plan}
                        </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-80 leading-relaxed uppercase tracking-tight max-w-xl">
                        Anda saat ini aktif pada paket premium <strong className="font-extrabold text-indigo-600">{plan}</strong>. Nikmati kapasitas modul yang luas untuk mendukung bisnis profesional Anda.
                    </p>
                    {nextPlan && (
                        <div className="pt-2">
                            <Link 
                                href="/dashboard/billing" 
                                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-950/20 active:scale-95"
                            >
                                <CreditCard size={12} /> Upgrade ke {nextPlan.name}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-start gap-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700">
                <Sparkles size={80} />
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary shadow-inner">
                <AlertCircle size={24} />
            </div>
            <div className="space-y-2 relative z-10 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                    Status Paket 
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[8px] rounded uppercase font-black tracking-widest">
                        {plan}
                    </span>
                </p>
                <p className="text-[11px] text-muted-foreground font-medium opacity-80 leading-relaxed uppercase tracking-tight max-w-xl">
                    Akses ke modul premium saat ini terkunci. Upgrade ke paket premium untuk membuka seluruh potensi ekosistem digital Anda.
                </p>
                <div className="pt-2">
                    <Link 
                        href="/dashboard/billing" 
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        <CreditCard size={12} /> Lihat Pilihan Paket
                    </Link>
                </div>
            </div>
        </div>
    );
}
