"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Globe, Layout, Check, Plus, Search, Home } from "lucide-react";
import Link from "next/link";
import { getRootDomain, getProtocol } from "@/lib/domains/utils";
import { getUserSitesAction } from "@/modules/auth/public-actions";

interface Site {
    id: string;
    name: string;
    subdomain: string;
    customDomain: string | null;
}

interface StoreSwitcherProps {
    currentSiteId: string | null;
    currentSiteName: string | null;
}

export default function StoreSwitcher({ currentSiteId, currentSiteName }: StoreSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [sites, setSites] = useState<Site[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Simpan host di state agar tidak ada hydration mismatch (SSR vs client)
    const [host, setHost] = useState<string | null>(null);
    useEffect(() => {
        setHost(window.location.host);
    }, []);

    const rootDomain = getRootDomain(host);

    const fetchSites = async () => {
        setIsLoading(true);
        try {
            const data = await getUserSitesAction();
            if (data.success && data.sites) {
                setSites(data.sites as any[]);
            }
        } catch (error) {
            console.error("Failed to fetch sites:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        if (nextOpen && sites.length === 0) {
            fetchSites();
        }
    };

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getSiteUrl = (site: Site) => {
        const domain = site.customDomain || `${site.subdomain}.${rootDomain}`;
        const protocol = getProtocol(host);
        return `${protocol}://${domain}/dashboard`;
    };

    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside and escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const handleFocusOut = (e: React.FocusEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative store-switcher-container" ref={containerRef} onBlur={handleFocusOut}>
            <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={handleToggle}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted/60 transition-all text-left group focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 outline-none"
            >
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary transition-all group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground" aria-hidden="true">
                    <Globe size={14} />
                </div>
                <p className="text-[11px] font-semibold text-foreground truncate flex-1">
                    {currentSiteName || "Pilih Situs"}
                </p>
                <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[260px] bg-card border border-border shadow-2xl rounded-xl z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left overflow-hidden">
                    {/* Search */}
                    <div className="p-1 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-2 top-2 text-muted-foreground" size={12} aria-hidden="true" />
                            <input
                                type="text"
                                placeholder="Cari situs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/50 border-none rounded-md pl-7 pr-3 py-1.5 text-[11px] focus:ring-1 focus:ring-primary outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium"
                                autoFocus
                                aria-label="Cari situs"
                            />
                        </div>
                    </div>

                    {/* Site List */}
                    <div role="listbox" aria-label="Daftar situs Anda" className="max-h-[280px] overflow-y-auto p-1 custom-scrollbar space-y-0.5">
                        {isLoading ? (
                            <div className="p-4 text-center">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-[10px] font-medium text-muted-foreground">Memuat...</p>
                            </div>
                        ) : filteredSites.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-xs text-muted-foreground">Tidak ditemukan.</p>
                            </div>
                        ) : (
                            filteredSites.map((site) => {
                                const bridgeUrl = `/api/auth/bridge?target=${encodeURIComponent(getSiteUrl(site))}`;
                                return (
                                    <a
                                        key={site.id}
                                        href={bridgeUrl}
                                        role="option"
                                        aria-selected={site.id === currentSiteId}
                                        className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors group focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 outline-none ${
                                            site.id === currentSiteId ? "bg-primary/5" : ""
                                        }`}
                                    >
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                                            site.id === currentSiteId ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-background"
                                        }`} aria-hidden="true">
                                            <Layout size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-semibold text-foreground truncate">{site.name}</p>
                                            <p className="text-[10px] text-muted-foreground/60 truncate font-medium">{site.customDomain || `${site.subdomain}.${rootDomain}`}</p>
                                        </div>
                                        {site.id === currentSiteId && (
                                            <Check size={14} className="text-primary" aria-hidden="true" />
                                        )}
                                    </a>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-0.5 border-t border-border bg-muted/20 space-y-0.5">
                        <a
                            href={host ? `${window.location.protocol}//${rootDomain}/dashboard` : "/dashboard"}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-all group focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 outline-none"
                        >
                            <div className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center group-hover:border-primary/30" aria-hidden="true">
                                <Home size={14} className="text-muted-foreground group-hover:text-primary" />
                            </div>
                            <span className="text-[10px] font-semibold">Semua Situs</span>
                        </a>

                        <Link
                            href="/onboarding"
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-all group focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 outline-none"
                        >
                            <div className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center group-hover:border-primary/30" aria-hidden="true">
                                <Plus size={14} className="text-muted-foreground group-hover:text-primary" />
                            </div>
                            <span className="text-[10px] font-semibold">Situs Baru</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
