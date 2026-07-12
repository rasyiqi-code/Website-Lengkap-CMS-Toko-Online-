import React from "react";
import { Zap } from "lucide-react";

interface TrialBannerProps {
    trialDays: number;
    isLoading: boolean;
    onExtendTrial: () => void;
    canExtend: boolean;
}

export function TrialBanner({ trialDays, isLoading, onExtendTrial, canExtend }: TrialBannerProps) {
    const isExpired = trialDays <= 0;
    const graceDaysLeft = 30 + trialDays;

    return (
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all duration-500 animate-in slide-in-from-top-4 ${trialDays <= 3 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-primary/5 border-primary/20'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${trialDays <= 3 ? 'bg-orange-500/20 text-orange-500' : 'bg-primary/20 text-primary'}`}>
                    <Zap size={16} className={trialDays <= 3 ? "animate-bounce" : ""} />
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
            {canExtend && (
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
