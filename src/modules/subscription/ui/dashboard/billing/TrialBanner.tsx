import React from "react";
import { Zap } from "lucide-react";

interface TrialBannerProps {
    trialDays?: number | null;
    daysLeft?: number | null;
    isLoading?: boolean;
    onExtendTrial?: () => void;
    canExtend?: boolean;
    isPastDue?: boolean;
}

export function TrialBanner({ 
    trialDays = null, 
    daysLeft = null, 
    isLoading = false, 
    onExtendTrial, 
    canExtend = false,
    isPastDue = false
}: TrialBannerProps) {
    // 1. Jika ini adalah Trial
    if (trialDays !== null) {
        const isExpired = trialDays <= 0;
        const graceDaysLeft = 30 + trialDays;

        return (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all duration-500 animate-in slide-in-from-top-4 ${isExpired ? 'bg-rose-500/10 border-rose-500/30' : 'bg-primary/5 border-primary/20'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${isExpired ? 'bg-rose-500/20 text-rose-500' : 'bg-primary/20 text-primary'}`}>
                        <Zap size={16} className={!isExpired ? "animate-bounce" : ""} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                            {isExpired 
                                ? `Trial Berakhir (${graceDaysLeft > 0 ? `${graceDaysLeft} Hari Masa Tenggang` : "Masa Tenggang Habis"})`
                                : `Trial Aktif (${trialDays} Hari Tersisa)`
                            }
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium opacity-70 mt-0.5 max-w-xl leading-relaxed">
                            {isExpired
                                ? "Masa uji coba gratis Anda telah berakhir. Segera aktifkan paket berbayar agar situs Anda tetap online dan dapat diakses."
                                : "Akses fitur Premium gratis. Segera aktifkan paket berbayar agar situs Anda tetap online setelah trial selesai."
                            }
                        </p>
                    </div>
                </div>
                {canExtend && onExtendTrial && (
                    <button
                        onClick={onExtendTrial}
                        disabled={isLoading}
                        className="bg-background border border-border px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-muted transition-all shadow-sm shrink-0 disabled:opacity-50"
                    >
                        Ekstensi Trial (+7 Hari)
                    </button>
                )}
            </div>
        );
    }

    // 2. Jika ini adalah Paid Plan yang Expired atau Past Due (Masa Tenggang)
    if (daysLeft !== null && (daysLeft <= 0 || isPastDue)) {
        const graceDaysLeft = 30 + daysLeft; // daysLeft is negative or zero
        const isGrace = graceDaysLeft > 0 || isPastDue;

        return (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all duration-500 animate-in slide-in-from-top-4 ${isGrace ? 'bg-orange-500/10 border-orange-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${isGrace ? 'bg-orange-500/20 text-orange-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        <Zap size={16} className={isGrace ? "animate-bounce" : ""} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                            {isGrace
                                ? `Langganan Berakhir (${graceDaysLeft > 0 ? `${graceDaysLeft} Hari Masa Tenggang` : "Masa Tenggang"})`
                                : "Langganan Kedaluwarsa"
                            }
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium opacity-70 mt-0.5 max-w-xl leading-relaxed">
                            {isGrace
                                ? "Masa aktif langganan paket Anda telah berakhir. Anda berada dalam masa tenggang. Segera lakukan pembayaran agar situs Anda tetap dapat diakses publik."
                                : "Masa aktif langganan paket Anda telah berakhir sepenuhnya. Akses publik situs Anda ditangguhkan sementara. Lakukan perpanjangan sekarang untuk mengaktifkan kembali."
                            }
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
