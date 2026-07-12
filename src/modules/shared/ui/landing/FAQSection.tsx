"use client";

import React, { useState, useRef } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQSectionProps {
    siteName: string;
    whatsappNumber?: string | null;
}

export function FAQSection({ siteName, whatsappNumber }: FAQSectionProps) {
    const [openQuestion, setOpenQuestion] = useState<string | null>(null);

    const toggleFAQ = (question: string) => {
        setOpenQuestion(openQuestion === question ? null : question);
    };

    const defaultWaNumber = "628123456789";
    const rawWaNumber = whatsappNumber || defaultWaNumber;
    const cleanedWaNumber = rawWaNumber.replace(/\D/g, "");
    const formattedWa = cleanedWaNumber.startsWith("0") 
        ? "62" + cleanedWaNumber.slice(1) 
        : cleanedWaNumber;
    
    const waUrl = `https://wa.me/${formattedWa || defaultWaNumber}`;

    const faqItems: FAQItem[] = [
        {
            question: `Apakah saya butuh keahlian coding untuk menggunakan ${siteName}?`,
            answer: `Sama sekali tidak. Platform ini dirancang instan untuk pemula. Anda cukup mengisi informasi usaha dan mengunggah produk, sistem kami akan membangun website Anda otomatis.`,
        },
        {
            question: "Apakah bisa menghubungkan domain pribadi (.com/.id)?",
            answer: "Bisa. Anda dapat dengan mudah menghubungkan nama domain pribadi Anda secara gratis langsung dari dashboard pengaturan.",
        },
        {
            question: "Bagaimana jika langganan habis atau masa trial selesai?",
            answer: "Data Anda dijamin aman. Kami memberikan masa tenggang selama 30 hari sebelum website otomatis diturunkan ke paket Gratis agar tetap aktif online.",
        },
        {
            question: "Apakah ada biaya transaksi atau komisi tersembunyi?",
            answer: "Tidak ada potongan komisi sepeser pun. Seluruh hasil penjualan dari toko online Anda masuk 100% langsung ke rekening Anda.",
        }
    ];

    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                buttonRefs.current[(idx + 1) % faqItems.length]?.focus();
                break;
            case "ArrowUp":
                e.preventDefault();
                buttonRefs.current[(idx - 1 + faqItems.length) % faqItems.length]?.focus();
                break;
            default:
                break;
        }
    };

    return (
        <section className="py-10 md:py-16 px-4 bg-slate-50/50 relative overflow-hidden border-t border-slate-200/50">
            {/* Ambient Mesh Shadows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-40 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
                {/* Header - Simple and Tight */}
                <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                        Pertanyaan Populer
                    </h2>
                </div>

                {/* FAQ Collapsible Items List */}
                <div className="space-y-3">
                    {faqItems.map((item, idx) => {
                        const isOpen = openQuestion === item.question;
                        return (
                            <div
                                key={idx}
                                className={`border rounded-xl transition-all duration-300 ${
                                    isOpen
                                        ? "bg-white border-sky-500/30 shadow-sm"
                                        : "bg-white/80 border-slate-200/60 hover:border-slate-350 hover:bg-white"
                                }`}
                            >
                                <button
                                    ref={(el) => { buttonRefs.current[idx] = el; }}
                                    type="button"
                                    onClick={() => toggleFAQ(item.question)}
                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-answer-${idx}`}
                                    className="w-full text-left p-4.5 md:p-5 flex items-center justify-between gap-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:outline-none rounded-xl"
                                >
                                    <span className={`text-xs md:text-sm font-bold tracking-tight transition-colors duration-200 ${
                                        isOpen ? "text-sky-600" : "text-slate-800"
                                    }`}>
                                        {item.question}
                                    </span>
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                                        isOpen ? "bg-sky-50 text-sky-600 rotate-180" : "bg-slate-50 text-slate-400"
                                    }`}>
                                        <ChevronDown size={12} />
                                    </div>
                                </button>

                                <div
                                    id={`faq-answer-${idx}`}
                                    role="region"
                                    aria-label={`Jawaban: ${item.question}`}
                                    className={`grid transition-all duration-300 ease-in-out ${
                                        isOpen ? "grid-rows-[1fr] opacity-100 border-t border-slate-100" : "grid-rows-[0fr] opacity-0"
                                    }`}
                                >
                                    <div className="overflow-hidden min-h-0">
                                        <div className="p-4.5 md:p-5 text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold bg-slate-50/30 rounded-b-xl">
                                            {item.answer}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Help Assist - Simple text line */}
                <div className="mt-8 text-center text-xs text-slate-500 font-semibold flex flex-col sm:flex-row items-center justify-center gap-2">
                    <span>Belum menemukan jawaban?</span>
                    <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-700 font-black transition-colors"
                    >
                        <MessageCircle size={13} />
                        Tanya via WhatsApp
                    </a>
                </div>
            </div>
        </section>
    );
}
