"use client";

import React from "react";
import { ExternalLink, Settings, PenTool, Layout } from "lucide-react";
import Link from "next/link";

interface SiteCardProps {
    site: any;
    rootDomain: string;
    onOpenSettings: (_site: any) => void;
}

export function SiteCard({ site, rootDomain, onOpenSettings }: SiteCardProps) {
    const sub = site.subscriptions[0];
    const planName = sub?.plan?.name || "Free";
    const isVerified = site.customDomainVerified;
    const domain = (site.customDomain && isVerified) ? site.customDomain : `${site.subdomain}.${rootDomain}`;
    
    const protocol = rootDomain.includes("localhost") ? "http" : "https";
    const siteUrl = `${protocol}://${domain}`;
    
    const targetDashboardUrl = `${protocol}://${domain}/dashboard`;
    const targetEditorUrl = `${protocol}://${domain}/credbuild`;
    
    const dashboardUrl = `/api/auth/bridge?target=${encodeURIComponent(targetDashboardUrl)}`;
    const editorUrl = `/api/auth/bridge?target=${encodeURIComponent(targetEditorUrl)}`;

    const statusInfo = (() => {
        if (!sub) return { label: "Tanpa Paket", class: "text-muted-foreground bg-muted/10 border-muted/20" };
        
        const now = new Date();
        
        // Permanent plan (e.g. Free)
        if (sub.status === "active" && !sub.trialEndsAt && !sub.endDate) {
            return { label: "Aktif", class: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
        }
        
        if (sub.trialEndsAt) {
            const trialEnd = new Date(sub.trialEndsAt);
            if (now <= trialEnd) {
                return { label: "Trial Aktif", class: "text-sky-500 bg-sky-500/10 border-sky-500/20" };
            } else {
                const graceEnd = new Date(trialEnd);
                graceEnd.setDate(graceEnd.getDate() + 30);
                if (now <= graceEnd) {
                    return { label: "Masa Tenggang", class: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
                } else {
                    return { label: "Expired", class: "text-red-500 bg-red-500/10 border-red-500/20" };
                }
            }
        }
        
        if (sub.endDate) {
            const end = new Date(sub.endDate);
            if (now <= end) {
                return { label: "Aktif", class: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
            } else {
                const graceEnd = new Date(end);
                graceEnd.setDate(graceEnd.getDate() + 30);
                if (now <= graceEnd) {
                    return { label: "Masa Tenggang", class: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
                } else {
                    return { label: "Expired", class: "text-red-500 bg-red-500/10 border-red-500/20" };
                }
            }
        }
        
        if (sub.status === "cancelled" || sub.status === "expired") {
            return { label: "Expired", class: "text-red-500 bg-red-500/10 border-red-500/20" };
        }
        
        if (sub.status === "past_due") {
            return { label: "Masa Tenggang", class: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
        }
        
        return { label: "Aktif", class: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    })();

    return (
        <div className="group bg-card border border-border rounded-md overflow-hidden shadow-sm hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 flex flex-col">
            {/* Preview Area / Header */}
            <div className="bg-muted/20 border-b border-border/50 py-3 px-4 flex items-center justify-between relative overflow-hidden">
                <h3 className="text-lg font-black text-foreground tracking-tighter leading-none group-hover:text-primary transition-colors">{site.name}</h3>
                <div className="p-1.5 bg-background/80 backdrop-blur-xl border border-border rounded-md opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                    <Link href={siteUrl} target="_blank">
                        <ExternalLink size={12} className="text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                </div>
            </div>

            {/* Content Stats */}
            <div className="p-4 space-y-3 flex-grow">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-primary uppercase bg-primary/10 border border-primary/20 px-2 py-1 rounded tracking-widest">
                            {site.subscriptions[0]?.trialEndsAt && new Date(site.subscriptions[0].trialEndsAt) > new Date() 
                                ? "Trial Period" 
                                : planName}
                        </span>
                        {site.customDomain && (
                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest border ${
                                isVerified 
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                                {isVerified ? "Domain Aktif" : "Domain Pending"}
                            </span>
                        )}
                    </div>
                    <span className={`text-[8px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded border ${statusInfo.class}`}>
                        {statusInfo.label}
                    </span>
                </div>

                {/* Info Pemilik dan Role */}
                <div className="border-t border-border/40 pt-2.5 pb-1 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground font-semibold">Pemilik:</span>
                        <span className="font-bold text-foreground truncate max-w-[150px]" title={site.ownerName || "-"}>
                            {site.ownerName || "-"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground font-semibold">Peran Anda:</span>
                        <span className={`font-black uppercase tracking-widest text-[8px] px-1.5 py-0.5 rounded ${
                            site.userRole === "owner" 
                                ? "bg-primary/10 text-primary border border-primary/20" 
                                : site.userRole === "editor"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        }`}>
                            {site.userRole}
                        </span>
                    </div>
                </div>

                <div className={`grid ${site.userRole === "owner" ? "grid-cols-3" : "grid-cols-2"} gap-2 mt-1`}>
                    <a
                        href={editorUrl}
                        className="flex flex-col items-center justify-center p-2.5 rounded-md border border-border bg-muted/5 hover:bg-primary/5 hover:border-primary/20 transition-all group/item space-y-1"
                    >
                        <div className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center group-hover/item:border-primary/30 transition-all">
                            <PenTool size={14} className="text-muted-foreground group-hover/item:text-primary transition-colors" />
                        </div>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest group-hover/item:text-primary transition-colors">Editor</span>
                    </a>
                    <a
                        href={dashboardUrl}
                        className="flex flex-col items-center justify-center p-2.5 rounded-md border border-border bg-muted/5 hover:bg-primary/5 hover:border-primary/20 transition-all group/item space-y-1"
                    >
                        <div className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center group-hover/item:border-primary/30 transition-all">
                            <Layout size={14} className="text-muted-foreground group-hover/item:text-primary transition-colors" />
                        </div>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest group-hover/item:text-primary transition-colors">Masuk</span>
                    </a>
                    {site.userRole === "owner" && (
                        <button
                            type="button"
                            onClick={() => onOpenSettings(site)}
                            className="flex flex-col items-center justify-center p-2.5 rounded-md border border-border bg-muted/5 hover:bg-primary/5 hover:border-primary/20 transition-all group/item space-y-1 outline-none"
                        >
                            <div className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center group-hover/item:border-primary/30 transition-all">
                                <Settings size={14} className="text-muted-foreground group-hover/item:text-primary transition-colors" />
                            </div>
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest group-hover/item:text-primary transition-colors">Domain</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
