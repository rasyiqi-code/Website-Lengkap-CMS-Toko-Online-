"use client";

import React, { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { SiteSettings } from "@/types/site-settings";


interface FloatingChatProps {
    settings?: SiteSettings | null;
}

export default function FloatingChat({ settings }: FloatingChatProps) {
    // Logic simplified: receive settings from parent, no internal fetch needed if parent provides it. 
    // However, keeping fetch as fallback would require useEffect, but we want to avoid double fetch.
    // If settings are passed, use them. If not, return null or fetch? 
    // Given the architecture, I'll assume parent provides it, or if missing, it simply doesn't show (which is safer than layout shift).
    // Actually, I'll keep the internal fetch as fallback for robustness but prefer props.

    const [internalSettings, setInternalSettings] = useState<SiteSettings | null>(settings || null);

    useEffect(() => {
        if (!settings && !internalSettings) {
            fetch("/api/settings")
                .then(res => res.json())
                .then(data => setInternalSettings(data))
                .catch(err => console.error(err));
        }
    }, [settings, internalSettings]);

    const activeSettings = settings || internalSettings;
    const targetNumber = activeSettings?.whatsappNumber || activeSettings?.socialWhatsapp;
    
    // Gunakan state untuk mengecek pathname agar tidak ada hydration mismatch (#418)
    const [isProductPage, setIsProductPage] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            setIsProductPage(window.location.pathname.includes("/products/"));
        }, 0);
    }, []);

    if (!activeSettings?.showFloatingChat || !targetNumber || isProductPage) return null;

    const whatsappUrl = `https://wa.me/${targetNumber}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20bd5a] transition-all hover:scale-110 flex items-center justify-center outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/50"
            aria-label="Chat with us on WhatsApp"
        >
            <MessageCircle size={28} />
        </a>
    );
}
