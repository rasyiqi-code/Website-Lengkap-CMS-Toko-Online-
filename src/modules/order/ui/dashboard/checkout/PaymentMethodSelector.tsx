import React from "react";
import Image from "next/image";
import { AlertCircle, ChevronDown, Loader2, RefreshCw, Zap } from "lucide-react";
import { PaymentMethod } from "./types";
import { getCategoryIcon } from "./utils";

interface PaymentMethodSelectorProps {
    isLoadingMethods: boolean;
    methodsError: string | null;
    paymentMethods: PaymentMethod[];
    selectedMethod: string | null;
    onSelectMethod: (_method: string) => void;
    onFetchPaymentMethods: () => void;
    onProceed: () => void;
    isProceeding: boolean;
    expired: boolean;
    expandedCategory: string | null;
    onToggleCategory: (_category: string | null) => void;
    formatRp: (_n: number) => string;
}

export function PaymentMethodSelector({
    isLoadingMethods,
    methodsError,
    paymentMethods,
    selectedMethod,
    onSelectMethod,
    onFetchPaymentMethods,
    onProceed,
    isProceeding,
    expired,
    expandedCategory,
    onToggleCategory,
    formatRp,
}: PaymentMethodSelectorProps) {
    // Group methods by category
    const grouped = paymentMethods.reduce<Record<string, PaymentMethod[]>>((acc, m) => {
        const cat = m.category || "Lainnya";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
    }, {});

    const categoryOrder = ["Virtual Account", "QRIS", "E-Wallet", "Retail / Gerai", "Kartu Kredit", "Paylater / Cicilan", "Lainnya"];

    if (isLoadingMethods) {
        return (
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
                <Loader2 size={24} className="animate-spin text-primary animate-infinite" />
                <p className="text-xs font-bold text-muted-foreground">Memuat metode pembayaran...</p>
            </div>
        );
    }

    if (methodsError) {
        return (
            <div className="bg-card border border-red-500/20 rounded-2xl p-6 text-center space-y-3">
                <AlertCircle size={24} className="mx-auto text-red-400" />
                <p className="text-xs font-bold text-red-400">{methodsError}</p>
                <button
                    type="button"
                    onClick={onFetchPaymentMethods}
                    className="text-xs text-primary underline font-bold flex items-center gap-1 mx-auto"
                >
                    <RefreshCw size={12} /> Coba lagi
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                <div>
                    <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest">Pilih Metode Pembayaran</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Semua transaksi diproses secara aman melalui Midtrans.</p>
                </div>

                <div className="space-y-2">
                    {categoryOrder.filter(cat => grouped[cat]?.length).map(cat => {
                        const isOpen = expandedCategory === cat;
                        return (
                            <div key={cat} className="border border-border rounded-lg overflow-hidden bg-card shadow-sm transition-all duration-200">
                                {/* Accordion Header */}
                                <button
                                    type="button"
                                    onClick={() => onToggleCategory(isOpen ? null : cat)}
                                    className={`w-full flex items-center justify-between p-3.5 text-left transition-colors ${
                                        isOpen ? "bg-muted/50 border-b border-border" : "hover:bg-muted/20"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={isOpen ? "text-primary" : "text-muted-foreground"}>
                                            {getCategoryIcon(cat)}
                                        </span>
                                        <div>
                                            <p className={`text-xs font-bold ${isOpen ? "text-foreground" : "text-foreground/90"}`}>
                                                {cat}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                                {grouped[cat].length} pilihan pembayaran
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`transition-transform duration-250 ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`}>
                                        <ChevronDown size={16} />
                                    </div>
                                </button>

                                {/* Accordion Content */}
                                {isOpen && (
                                    <div className="p-3 bg-card animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {grouped[cat].map(method => (
                                                <button
                                                    key={method.paymentMethod}
                                                    type="button"
                                                    onClick={() => onSelectMethod(method.paymentMethod)}
                                                    className={`flex items-center gap-3 p-2.5 rounded-lg border-2 text-left transition-all duration-200 group ${
                                                        selectedMethod === method.paymentMethod
                                                            ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                                                            : "border-border hover:border-border/80 bg-background hover:bg-muted/30"
                                                    }`}
                                                >
                                                    <Image
                                                        src={method.paymentImage}
                                                        alt={method.paymentName}
                                                        width={40}
                                                        height={28}
                                                        className="w-10 h-7 object-contain rounded-sm"
                                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-black text-foreground truncate">{method.paymentName}</p>
                                                        {Number(method.totalFee) > 0 && (
                                                            <p className="text-[9px] text-muted-foreground font-medium">
                                                                Biaya: {formatRp(Number(method.totalFee))}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                                        selectedMethod === method.paymentMethod
                                                            ? "border-primary bg-primary"
                                                            : "border-border"
                                                    }`}>
                                                        {selectedMethod === method.paymentMethod && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {Object.keys(grouped).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm font-bold">Tidak ada metode pembayaran tersedia</p>
                            <p className="text-xs mt-1">Silakan hubungi admin platform.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* CTA Button */}
            <button
                type="button"
                onClick={onProceed}
                disabled={!selectedMethod || isProceeding || expired}
                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isProceeding ? (
                    <>
                        <Loader2 size={14} className="animate-spin animate-infinite" />
                        Memproses...
                    </>
                ) : (
                    <>
                        <Zap size={14} />
                        {expired ? "Sesi Kedaluwarsa" : "Lanjutkan Pembayaran"}
                    </>
                )}
            </button>

            <p className="text-center text-[9px] text-muted-foreground font-medium leading-relaxed px-2">
                Dengan melanjutkan, Anda akan langsung melihat instruksi pembayaran kustom kami.
                Paket akan aktif otomatis setelah pembayaran dikonfirmasi.
            </p>
        </>
    );
}
