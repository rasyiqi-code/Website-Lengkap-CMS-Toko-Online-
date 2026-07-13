import React from "react";
import { CheckCircle2, ArrowUpRight, PenTool, ImageIcon, ShoppingCart, Globe, Package, Layout, Tags, Heart, Mail } from "lucide-react";
import { isFeatureEnabled } from "@/lib/billing/features";
import { Plan } from "./types";

interface PlansListProps {
    plans: Plan[];
    currentPlan: any | null;
    previewPlan: Plan | null;
    setPreviewPlan: (_plan: Plan) => void;
    isExpired?: boolean;
}

export function PlansList({
    plans,
    currentPlan,
    previewPlan,
    setPreviewPlan,
    isExpired = false
}: PlansListProps) {
    return (
        <div className="bg-card border border-border rounded-xl p-4 shadow-md space-y-4">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 border-l-2 border-primary pl-3">Pilihan Paket</h3>
            <div className="space-y-2">
                {plans.filter(p => Number(p.price) > 0).map((plan) => {
                    const isRegistered = plan.id === currentPlan?.id;
                    const isActive = isRegistered && !isExpired;
                    const isPreviewing = plan.id === previewPlan?.id;

                    return (
                        <div
                            key={plan.id}
                            onClick={() => setPreviewPlan(plan)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden group ${isPreviewing
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm shadow-primary/5"
                                : isActive
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-border hover:border-primary/50 bg-muted/5"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute top-0 right-0 p-1 bg-primary text-primary-foreground rounded-bl-lg">
                                    <CheckCircle2 size={10} />
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{plan.name}</span>
                                </div>
                                {isActive && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 text-primary rounded border border-primary/30 animate-pulse">
                                        <CheckCircle2 size={8} className="fill-primary/20" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Aktif</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xl font-black text-foreground tracking-tighter uppercase leading-none">
                                {Number(plan.price) > 0 ? `Rp ${Number(plan.price).toLocaleString()}` : "Gratis"}
                                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest ml-0.5 opacity-50">
                                    / {plan.interval?.toLowerCase() === 'month' ? 'bln' : plan.interval?.toLowerCase() === 'year' ? 'thn' : plan.interval}
                                </span>
                            </p>

                            <div className="flex items-center gap-2 mt-2.5 opacity-40">
                                {isFeatureEnabled(plan.name, plan.features, "hasBlog") && <PenTool size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasGallery") && <ImageIcon size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasOrders") && <ShoppingCart size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasCart") && <ShoppingCart size={10} className="text-primary" />}
                                {isFeatureEnabled(plan.name, plan.features, "hasCustomDomain") && <Globe size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasProducts") && <Package size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasPortfolio") && <Layout size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasTaxonomies") && <Tags size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasTestimonials") && <Heart size={10} />}
                                {isFeatureEnabled(plan.name, plan.features, "hasInbox") && <Mail size={10} />}
                            </div>

                            {!isActive ? (
                                <button className={`w-full mt-3.5 text-[9px] font-black uppercase tracking-[0.2em] py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${isPreviewing
                                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
                                    : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
                                    }`}>
                                    {isPreviewing 
                                        ? "Sedang Dilihat" 
                                        : isRegistered 
                                            ? "Perpanjang Paket" 
                                            : "Pilih Paket"} <ArrowUpRight size={10} />
                                </button>
                            ) : (
                                <div className="w-full mt-3.5 border border-primary/20 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.2em] py-2 rounded-lg flex items-center justify-center gap-2">
                                    Paket Anda Saat Ini
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
