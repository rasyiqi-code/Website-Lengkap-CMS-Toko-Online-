"use client";

import React, { useSyncExternalStore } from "react";
import { Facebook, Twitter, Link2, Share2 } from "lucide-react";
import toast from "react-hot-toast";

interface ShareButtonsProps {
    title: string;
}

const subscribe = () => () => {};
const getSnapshot = () => window.location.href;
const getServerSnapshot = () => "";

export default function ShareButtons({ title }: ShareButtonsProps) {
    const shareUrl = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Tautan berhasil disalin!");
        } catch {
            toast.error("Gagal menyalin tautan");
        }
    };

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " - " + shareUrl)}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;

    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Share2 size={12} />
                Bagikan:
            </span>
            <div className="flex items-center gap-1.5">
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center transition-colors shadow-sm hover:shadow"
                    title="Bagikan ke WhatsApp"
                >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                </a>
                <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center transition-colors shadow-sm hover:shadow"
                    title="Bagikan ke Facebook"
                >
                    <Facebook size={13} />
                </a>
                <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-600 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 dark:text-sky-400 flex items-center justify-center transition-colors shadow-sm hover:shadow"
                    title="Bagikan ke Twitter / X"
                >
                    <Twitter size={13} />
                </a>
                <button
                    onClick={handleCopy}
                    className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors shadow-sm hover:shadow cursor-pointer"
                    title="Salin Tautan"
                >
                    <Link2 size={13} />
                </button>
            </div>
        </div>
    );
}
