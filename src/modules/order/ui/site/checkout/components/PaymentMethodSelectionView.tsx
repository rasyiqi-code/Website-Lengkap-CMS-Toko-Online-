import React, { useState } from "react";
import Image from "next/image";
import { AlertCircle, ChevronDown, Loader2, RefreshCw, Zap } from "lucide-react";
import Image from "next/image";
import { type PaymentMethod } from "../types";
import { getCategoryIcon } from "../helpers/paymentHelpers";

interface PaymentMethodSelectionViewProps {
    methods: PaymentMethod[];
    selectedMethod: string | null;
    setSelectedMethod: (_method: string | null) => void;
    isLoadingMethods: boolean;
    methodsError: string | null;
    fetchMethods: () => Promise<void> | void;
    handleProceed: () => Promise<void> | void;
    isProceeding: boolean;
    expired: boolean;
}

/**
 * Komponen UI untuk memilih metode pembayaran yang tersedia
 */
export function PaymentMethodSelectionView({
    methods,
    selectedMethod,
    setSelectedMethod,
    isLoadingMethods,
    methodsError,
    fetchMethods,
    handleProceed,
    isProceeding,
    expired,
}: PaymentMethodSelectionViewProps) {
    const [expandedCategory, setExpandedCategory] = useState<string | null>("Virtual Account");

    const grouped = methods.reduce<Record<string, PaymentMethod[]>>((acc, m) => {
        const cat = m.category || "Lainnya";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
    }, {});

    const categoryOrder = ["Virtual Account", "QRIS", "E-Wallet", "Retail / Gerai", "Kartu Kredit", "Paylater / Cicilan", "Lainnya"];

    if (isLoadingMethods) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-4 shadow-sm">
                <Loader2 size={22} className="animate-spin text-blue-500" />
                <p className="text-xs text-gray-500">Memuat metode pembayaran...</p>
            </div>
        );
    }

    if (methodsError) {
        return (
            <div className="bg-white border border-red-200 rounded-xl p-5 text-center space-y-3 shadow-sm">
                <AlertCircle size={22} className="mx-auto text-red-400" />
                <p className="text-xs font-semibold text-red-500">{methodsError}</p>
                <button onClick={fetchMethods} className="text-xs text-blue-500 underline flex items-center gap-1 mx-auto">
                    <RefreshCw size={11} /> Coba lagi
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3.5">
                <div>
                    <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Pilih Metode Pembayaran</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Semua transaksi diproses secara aman.</p>
                </div>

                <div className="space-y-2">
                    {categoryOrder.filter(cat => grouped[cat]?.length).map(cat => {
                        const isOpen = expandedCategory === cat;
                        return (
                            <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
                                {/* Accordion Header */}
                                <button
                                    type="button"
                                    onClick={() => setExpandedCategory(isOpen ? null : cat)}
                                    className={`w-full flex items-center justify-between p-3.5 text-left transition-colors ${
                                        isOpen ? "bg-gray-50/70 border-b border-gray-100" : "hover:bg-gray-50/40"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={isOpen ? "text-blue-600" : "text-gray-400"}>
                                            {getCategoryIcon(cat)}
                                        </span>
                                        <div>
                                            <p className={`text-xs font-bold ${isOpen ? "text-gray-900" : "text-gray-700"}`}>
                                                {cat}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                                {grouped[cat].length} pilihan pembayaran
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`transition-transform duration-250 ${isOpen ? "rotate-180 text-blue-500" : "text-gray-400"}`}>
                                        <ChevronDown size={16} />
                                    </div>
                                </button>

                                {/* Accordion Content */}
                                {isOpen && (
                                    <div className="p-3 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {grouped[cat].map(method => (
                                                <button
                                                    key={method.paymentMethod}
                                                    type="button"
                                                    onClick={() => setSelectedMethod(method.paymentMethod)}
                                                    className={`flex items-center gap-3 p-2.5 rounded-lg border-2 text-left transition-all duration-200 ${
                                                        selectedMethod === method.paymentMethod
                                                            ? "border-blue-500 bg-blue-50 shadow-sm"
                                                            : "border-gray-200 hover:border-gray-300 bg-white"
                                                    }`}
                                                >
                                                    <Image
                                                        src={method.paymentImage}
                                                        alt={method.paymentName}
                                                        width={40}
                                                        height={28}
                                                        className="w-10 h-7 object-contain rounded-sm"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-bold text-gray-800 truncate">{method.paymentName}</p>
                                                        {Number(method.totalFee) > 0 && (
                                                            <p className="text-[9px] text-gray-400">
                                                                Biaya: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(method.totalFee))}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                                        selectedMethod === method.paymentMethod ? "border-blue-500 bg-blue-500" : "border-gray-300"
                                                    }`}>
                                                        {selectedMethod === method.paymentMethod && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
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
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">Tidak ada metode pembayaran tersedia</p>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleProceed}
                disabled={!selectedMethod || isProceeding || expired}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isProceeding ? (
                    <>
                        <Loader2 size={15} className="animate-spin" />
                        Memproses...
                    </>
                ) : (
                    <>
                        <Zap size={15} />
                        {expired ? "Sesi Kedaluwarsa" : "Lanjutkan Pembayaran"}
                    </>
                )}
            </button>

            <p className="text-center text-[9px] text-gray-400 leading-relaxed px-2">
                Dengan melanjutkan, Anda akan langsung melihat instruksi pembayaran kustom kami.
                Pesanan akan dikonfirmasi otomatis setelah pembayaran berhasil.
            </p>
        </>
    );
}
