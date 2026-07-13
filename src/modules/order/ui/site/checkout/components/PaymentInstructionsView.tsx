import React from "react";
import Image from "next/image";
import { AlertCircle, Check, Copy } from "lucide-react";
import { getCategoryLabel, getPaymentInstructions } from "../helpers/paymentHelpers";

interface PaymentInstructionsViewProps {
    customPaymentDetails: any;
    handleResetPayment: () => void;
    copied: string | null;
    handleCopy: (_text: string) => void;
}

/**
 * Komponen UI untuk menampilkan detail instruksi pembayaran kustom/QRIS/VA
 */
export function PaymentInstructionsView({
    customPaymentDetails,
    handleResetPayment,
    copied,
    handleCopy,
}: PaymentInstructionsViewProps) {
    const payCode = customPaymentDetails?.vaNumber || customPaymentDetails?.paymentCode || customPaymentDetails?.qrString;
    const isQris = !!(
        customPaymentDetails?.qrString || 
        customPaymentDetails?.qrCodeUrl || 
        (customPaymentDetails?.paymentMethod && getCategoryLabel(customPaymentDetails.paymentMethod) === "QRIS")
    );
    const paymentInstructions = getPaymentInstructions(customPaymentDetails.paymentMethod, payCode || "", isQris);
    const qrCodeImageUrl = customPaymentDetails?.qrString
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(customPaymentDetails.qrString)}`
        : null;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                        {getCategoryLabel(customPaymentDetails.paymentMethod)}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-1">Pembayaran Kustom</h3>
                </div>
                <button 
                    onClick={handleResetPayment}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline font-semibold flex items-center gap-1 transition-colors"
                >
                    Ganti Metode
                </button>
            </div>

            {/* Kode Pembayaran Utama / Kartu QRIS */}
            {isQris ? (
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                    {qrCodeImageUrl ? (
                        <Image
                            src={qrCodeImageUrl} 
                            alt="QRIS QR Code" 
                            width={192}
                            height={192}
                            className="w-48 h-48 object-contain rounded-md border bg-white p-2 shadow-sm"
                        />
                    ) : (
                        <div className="w-52 h-52 flex items-center justify-center bg-white border rounded-lg text-xs text-gray-400">
                            Memuat QR Code...
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-xs font-bold text-gray-800">Scan QRIS untuk Membayar</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Kompatibel dengan semua e-wallet & mobile banking</p>
                    </div>
                </div>
            ) : customPaymentDetails.paymentMethod === "manual" ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 shadow-inner">
                    <div className="flex justify-between items-center text-xs border-b border-gray-200/50 pb-2">
                        <span className="font-semibold text-gray-400 uppercase tracking-wider text-[9px]">Nama Bank</span>
                        <span className="font-bold text-gray-850 uppercase tracking-tight text-xs">{customPaymentDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-gray-200/50 pb-2">
                        <span className="font-semibold text-gray-400 uppercase tracking-wider text-[9px]">Pemilik Rekening</span>
                        <span className="font-bold text-gray-850 uppercase tracking-tight text-xs">{customPaymentDetails.accountHolder}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-400 uppercase tracking-wider text-[9px]">Nomor Rekening</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-gray-900 text-sm tracking-tight">{payCode}</span>
                            <button 
                                onClick={() => handleCopy(payCode || "")}
                                className="p-1 rounded bg-white hover:bg-slate-100 border border-gray-200 text-gray-550 transition-colors"
                                title="Salin Nomor Rekening"
                            >
                                {copied === payCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                        {getCategoryLabel(customPaymentDetails.paymentMethod) === "Virtual Account" ? "Nomor Virtual Account" : "Kode Pembayaran"}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl font-mono font-black text-gray-900 tracking-wider">
                            {payCode}
                        </span>
                        <button 
                            onClick={() => handleCopy(payCode || "")}
                            className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors"
                            title="Salin Kode"
                        >
                            {copied === payCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Instruksi Pembayaran */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Instruksi Pembayaran</h4>
                {customPaymentDetails.paymentMethod === "manual" ? (
                    <p className="text-xs text-gray-650 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                        {customPaymentDetails.instructions || "Silakan transfer ke rekening di atas dan konfirmasi ke admin."}
                    </p>
                ) : (
                    <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600 leading-relaxed pl-1">
                        {paymentInstructions.map((step, idx) => (
                            <li key={idx} className="marker:font-semibold pl-1">
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex gap-2.5 items-start text-xs text-amber-800">
                <AlertCircle size={16} className="shrink-0 text-amber-500 mt-0.5" />
                <div>
                    <p className="font-semibold">Menunggu Pembayaran</p>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">Sistem memantau pembayaran Anda secara otomatis. Halaman akan dialihkan saat transaksi terverifikasi.</p>
                </div>
            </div>
        </div>
    );
}
