"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Copy, Check, Info } from "lucide-react";
import Image from "next/image";

interface PaymentMethodInfoProps {
    brandColor?: string;
    selectedMethod?: "system" | "manual";
    onMethodSelect?: (_method: "system" | "manual") => void;
}
const PAYMENT_LOGOS = [
    { name: "QRIS", src: "/logo-pembayaran/QRIS.svg", heightClass: "h-3" },
    { name: "GoPay", src: "/logo-pembayaran/JP.svg", heightClass: "h-3" },
    { name: "ShopeePay", src: "/logo-pembayaran/FT.svg", heightClass: "h-3" },
    { name: "OVO", src: "/logo-pembayaran/OV.svg", heightClass: "h-3" },
    { name: "DANA", src: "/logo-pembayaran/DA.svg", heightClass: "h-3" },
    { name: "Visa / Mastercard", src: "/logo-pembayaran/VC.svg", heightClass: "h-3" },
    { name: "BCA", src: "/logo-pembayaran/BC.svg", heightClass: "h-3" },
    { name: "Mandiri", src: "/logo-pembayaran/M2.svg", heightClass: "h-2.5" },
    { name: "BNI", src: "/logo-pembayaran/I1.svg", heightClass: "h-3" },
    { name: "BRI", src: "/logo-pembayaran/BR.svg", heightClass: "h-3" },
    { name: "CIMB Niaga", src: "/logo-pembayaran/A1.svg", heightClass: "h-3" },
    { name: "CIMB Niaga (Red)", src: "/logo-pembayaran/B1.svg", heightClass: "h-3" },
    { name: "Permata Bank", src: "/logo-pembayaran/BT.svg", heightClass: "h-3" },
    { name: "Bank Syariah Indonesia", src: "/logo-pembayaran/BV.svg", heightClass: "h-3.5" },
    { name: "Maybank", src: "/logo-pembayaran/VA.svg", heightClass: "h-3" },
    { name: "Bank Artha Graha", src: "/logo-pembayaran/AG.svg", heightClass: "h-3" },
    { name: "Bank Neo Commerce", src: "/logo-pembayaran/NC.svg", heightClass: "h-3.5" },
    { name: "Alfamart", src: "/logo-pembayaran/IR.svg", heightClass: "h-3" },
    { name: "Indomaret", src: "/logo-pembayaran/DN.svg", heightClass: "h-3" }
];


export default function PaymentMethodInfo({ 
    brandColor = "#0ea5e9",
    selectedMethod,
    onMethodSelect
}: PaymentMethodInfoProps) {
    const [settings, setSettings] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [localMethod, setLocalMethod] = useState<"system" | "manual">("system");

    const scrollRef1 = React.useRef<HTMLDivElement>(null);
    const scrollRef2 = React.useRef<HTMLDivElement>(null);

    const handleScroll1 = () => {
        if (scrollRef1.current) {
            scrollRef1.current.scrollBy({ left: 160, behavior: "smooth" });
        }
    };

    const handleScroll2 = () => {
        if (scrollRef2.current) {
            scrollRef2.current.scrollBy({ left: 160, behavior: "smooth" });
        }
    };

    const activeMethod = selectedMethod || localMethod;
    const handleMethodChange = (m: "system" | "manual") => {
        if (onMethodSelect) {
            onMethodSelect(m);
        } else {
            setLocalMethod(m);
        }
    };

    useEffect(() => {
        fetch("/api/settings/payments")
            .then(res => res.json())
            .then(data => {
                if (data && data.bankName) {
                    setSettings(data);
                }
            })
            .catch(err => console.error(err));
    }, []);

    const copyToClipboard = () => {
        if (settings?.accountNumber) {
            navigator.clipboard.writeText(settings.accountNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!settings) return (
        <div className="w-full">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                    <CreditCard size={15} />
                </div>
                Metode Pembayaran
            </h2>
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-xs font-medium border border-amber-100 flex items-start gap-2">
                <Info size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <span>Metode pembayaran belum dikonfigurasi. Silakan hubungi admin toko.</span>
            </div>
        </div>
    );

    const hasManual = !!(settings.bankName && settings.accountNumber);
    const gatewayName = settings.paymentGateway ? (settings.paymentGateway.charAt(0).toUpperCase() + settings.paymentGateway.slice(1)) : "Midtrans";

    if (settings.gatewayEnabled && hasManual) {
        return (
            <div className="w-full animate-in fade-in duration-300">
                <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700 flex-shrink-0">
                        <CreditCard size={15} />
                    </div>
                    <span>Cara Pembayaran</span>
                </h2>

                {/* Sub-selector tabs */}
                <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-100/50 border border-slate-200/50 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => handleMethodChange("system")}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                            activeMethod === "system"
                                ? "bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
                        }`}
                    >
                        Otomatis (Instant)
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMethodChange("manual")}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                            activeMethod === "manual"
                                ? "bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
                        }`}
                    >
                        Transfer Manual
                    </button>
                </div>

                {activeMethod === "system" ? (
                    /* Midtrans Automatic */
                    <div className="space-y-3 animate-in fade-in duration-300">
                        <div 
                            className="p-4 rounded-xl border transition-all animate-none"
                            style={{ 
                                backgroundColor: `${brandColor}04`, 
                                borderColor: `${brandColor}15` 
                            }}
                        >
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2.5">
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-sm">Pembayaran Otomatis & Instan</h3>
                                    <p className="text-xs text-slate-500 font-normal mt-0.5">Selesaikan pesanan secara instan dengan metode pembayaran otomatis pilihan Anda.</p>
                                </div>
                                {settings.isPlatformManaged && (
                                    <span 
                                        className="text-[9px] font-bold text-white px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap self-start"
                                        style={{ backgroundColor: brandColor }}
                                    >
                                        Dikelola oleh Platform
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 space-y-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-lg border border-slate-200/80 shadow-sm">
                                <div className="text-xs text-slate-600 font-medium space-y-2">
                                    <div className="flex items-center gap-1.5 w-full">
                                        <div 
                                            ref={scrollRef1}
                                            className="flex flex-nowrap overflow-x-auto gap-1.5 items-center pt-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth flex-grow"
                                        >
                                            {PAYMENT_LOGOS.map((logo, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="bg-white px-1.5 py-0.5 rounded-md border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-center h-6 hover:border-slate-300 transition-all flex-shrink-0" 
                                                    title={logo.name}
                                                >
                                                    <Image
                                                        src={logo.src} 
                                                        width={60}
                                                        height={24}
                                                        className={`${logo.heightClass} w-auto object-contain`} 
                                                        alt={logo.name} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={handleScroll1} 
                                            className="bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-md flex items-center justify-center h-6 w-6 font-bold text-xs flex-shrink-0 active:scale-90 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-slate-200/80 mt-1 cursor-pointer"
                                            title="Geser Selanjutnya"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-100 rounded-lg leading-relaxed font-normal">
                            <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1 text-xs">
                                <Info size={12} style={{ color: brandColor }} /> Petunjuk Pembayaran:
                            </p>
                            <p>Setelah menekan tombol <strong>Konfirmasi Pesanan</strong>, Anda akan diarahkan ke gerbang pembayaran aman {gatewayName} untuk menyelesaikan transaksi.</p>
                        </div>
                    </div>
                ) : (
                    /* Manual bank transfer template */
                    <div className="space-y-3 animate-in fade-in duration-300">
                        <div 
                            className="p-4 rounded-xl border transition-all animate-none"
                            style={{ 
                                backgroundColor: `${brandColor}04`, 
                                borderColor: `${brandColor}15` 
                            }}
                        >
                            <h3 className="font-semibold text-slate-800 text-sm mb-0.5">Transfer Bank (Manual)</h3>
                            <p className="text-xs text-slate-500 mb-3 font-normal">Silakan transfer jumlah total pembayaran Anda ke rekening berikut:</p>

                            <div className="space-y-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-lg border border-slate-200/80 shadow-sm">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-medium text-slate-500">Nama Bank</span>
                                    <span className="font-semibold text-slate-800">{settings.bankName}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-medium text-slate-500">Nama Pemilik Rekening</span>
                                    <span className="font-semibold text-slate-800">{settings.accountHolder}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-medium text-slate-500">Nomor Rekening</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-slate-800 text-sm tracking-tight">{settings.accountNumber}</span>
                                        <button
                                            type="button"
                                            onClick={copyToClipboard}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 active:scale-90 transition-all animate-none"
                                            title="Salin Nomor Rekening"
                                        >
                                            {copied ? <Check size={10} className="text-emerald-700 font-bold" /> : <Copy size={10} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {settings.instructions && (
                            <div className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-100 rounded-lg leading-relaxed font-normal">
                                <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1 text-xs">
                                    <Info size={12} style={{ color: brandColor }} /> Petunjuk Pembayaran:
                                </p>
                                <p className="whitespace-pre-line">{settings.instructions}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (settings.gatewayEnabled) {
        return (
            <div className="w-full animate-in fade-in duration-300">
                <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                        <CreditCard size={15} />
                    </div>
                    Metode Pembayaran
                </h2>

                <div 
                    className="p-4 rounded-xl border mb-3 transition-all"
                    style={{ 
                        backgroundColor: `${brandColor}04`, 
                        borderColor: `${brandColor}15` 
                    }}
                >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2.5">
                        <div>
                            <h3 className="font-semibold text-slate-800 text-sm">Pembayaran Otomatis & Instan</h3>
                            <p className="text-xs text-slate-500 font-normal mt-0.5">Selesaikan pesanan secara instan dengan metode pembayaran otomatis pilihan Anda.</p>
                        </div>
                        {settings.isPlatformManaged && (
                            <span 
                                className="text-[9px] font-bold text-white px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap self-start"
                                style={{ backgroundColor: brandColor }}
                            >
                                Dikelola oleh Platform
                            </span>
                        )}
                    </div>

                    <div className="mt-4 space-y-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-lg border border-slate-200/80 shadow-sm">
                        <div className="text-xs text-slate-600 font-medium space-y-2">
                            <div className="flex items-center gap-1.5 w-full">
                                <div 
                                    ref={scrollRef2}
                                    className="flex flex-nowrap overflow-x-auto gap-1.5 items-center pt-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth flex-grow"
                                >
                                    {PAYMENT_LOGOS.map((logo, idx) => (
                                        <div 
                                            key={idx} 
                                            className="bg-white px-1.5 py-0.5 rounded-md border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-center h-6 hover:border-slate-300 transition-all flex-shrink-0" 
                                            title={logo.name}
                                        >
                                            <Image
                                                src={logo.src} 
                                                width={60}
                                                height={24}
                                                className={`${logo.heightClass} w-auto object-contain`} 
                                                alt={logo.name} 
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleScroll2} 
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-md flex items-center justify-center h-6 w-6 font-bold text-xs flex-shrink-0 active:scale-90 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-slate-200/80 mt-1 cursor-pointer"
                                    title="Geser Selanjutnya"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-100 rounded-lg leading-relaxed font-normal">
                    <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1 text-xs">
                        <Info size={12} style={{ color: brandColor }} /> Petunjuk Pembayaran:
                    </p>
                    <p>Setelah menekan tombol <strong>Konfirmasi Pesanan</strong>, Anda akan diarahkan ke gerbang pembayaran aman {gatewayName} untuk menyelesaikan transaksi.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                    <CreditCard size={15} />
                </div>
                Metode Pembayaran
            </h2>

            <div 
                className="p-4 rounded-xl border mb-3 transition-all"
                style={{ 
                    backgroundColor: `${brandColor}04`, 
                    borderColor: `${brandColor}15` 
                }}
            >
                <h3 className="font-semibold text-slate-800 text-sm mb-0.5">Transfer Bank (Manual)</h3>
                <p className="text-xs text-slate-500 mb-3 font-normal">Silakan transfer jumlah total pembayaran Anda ke rekening berikut:</p>

                <div className="space-y-3 bg-white/70 backdrop-blur-sm p-3.5 rounded-lg border border-slate-200/80 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-500">Nama Bank</span>
                        <span className="font-semibold text-slate-800">{settings.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-500">Nama Pemilik Rekening</span>
                        <span className="font-semibold text-slate-800">{settings.accountHolder}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-500">Nomor Rekening</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 text-sm tracking-tight">{settings.accountNumber}</span>
                            <button
                                type="button"
                                onClick={copyToClipboard}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 active:scale-90 transition-all animate-none"
                                title="Salin Nomor Rekening"
                            >
                                {copied ? <Check size={10} className="text-emerald-700 font-bold" /> : <Copy size={10} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {settings.instructions && (
                <div className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-100 rounded-lg leading-relaxed font-normal">
                    <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1 text-xs">
                        <Info size={12} style={{ color: brandColor }} /> Petunjuk Pembayaran:
                    </p>
                    <p className="whitespace-pre-line">{settings.instructions}</p>
                </div>
            )}
        </div>
    );
}
