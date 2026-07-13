import React from "react";
import { db } from "@/lib/core/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Globe, Plus, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/LinkButton";
import { SiteList } from "@/modules/site/ui/dashboard/sites/SiteList";

export default async function MySitesPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const siteLinks = await db.siteUser.findMany({
        where: { userId: (session.user as any).id },
        select: { siteId: true, role: true }
    });

    const userSiteIds = siteLinks.map(l => l.siteId);
    const rawSites = await db.site.findMany({
        where: { id: { in: userSiteIds } },
        select: {
            id: true,
            name: true,
            subdomain: true,
            customDomain: true,
            customDomainVerified: true
        }
    });
    
    // Dapatkan data subscription dan owner info untuk masing-masing siteId
    const sites = await Promise.all(rawSites.map(async (site) => {
        const link = siteLinks.find(l => l.siteId === site.id);
        
        // Cari nama owner dari site ini
        const ownerLink = await db.siteUser.findFirst({
            where: { siteId: site.id, role: "owner" },
            select: { userId: true }
        });
        let ownerName = "-";
        if (ownerLink) {
            const ownerUser = await db.user.findUnique({
                where: { id: ownerLink.userId },
                select: { name: true }
            });
            ownerName = ownerUser?.name || "-";
        }

        const sub = await db.subscription.findFirst({
            where: { siteId: site.id, status: { in: ["active", "past_due"] } },
            select: {
                status: true,
                endDate: true,
                trialEndsAt: true,
                plan: {
                    select: {
                        name: true,
                        features: true
                    }
                }
            }
        });
        return {
            ...site,
            userRole: link?.role || "user",
            ownerName,
            subscriptions: sub ? [sub] : []
        };
    }));
    
    const ownedSites = sites.filter(s => s.userRole === "owner");
    const ownedSiteIds = ownedSites.map(s => s.id);
    
    // Calculate global resource limit for this user
    // We look at the subscription with the highest limit
    const activeSubscriptions = await db.subscription.findMany({
        where: { 
            siteId: { in: ownedSiteIds }, 
            status: { in: ["active", "past_due"] } 
        },
        select: {
            addonSlots: true,
            plan: {
                select: {
                    maxSites: true
                }
            }
        }
    });
    
    // Total Limit = Plan Max Sites + Purchased Addon Slots
    const maxSitesAllowed = (() => {
        if (activeSubscriptions.length === 0) return 1;
        let max = 1;
        for (const s of activeSubscriptions) {
            const planLimit = s.plan?.maxSites ?? 1;
            if (planLimit === -1) return -1;
            const total = planLimit + (s.addonSlots || 0);
            if (total > max) {
                max = total;
            }
        }
        return max;
    })();

    const isLimitReached = maxSitesAllowed !== -1 && ownedSites.length >= maxSitesAllowed;

    if (sites.length === 0) {
        redirect("/onboarding");
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

    return (
        <div className="w-full animate-in fade-in duration-700 pb-32 space-y-6">
            <PageHeader
                title="Situs Saya"
                subtitle="Kelola semua website Anda dalam satu tempat."
                icon={<Globe />}
            >
                {isLimitReached ? (
                    <LinkButton
                        href="/dashboard/billing"
                        icon={<ArrowUpRight size={16} />}
                        className="bg-amber-500 text-black shadow-amber-500/20 animate-pulse"
                    >
                        Upgrade Limit
                    </LinkButton>
                ) : (
                    <LinkButton
                        href="/onboarding"
                        icon={<Plus size={16} />}
                    >
                        Tambah Situs
                    </LinkButton>
                )}
            </PageHeader>

            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${isLimitReached ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min((ownedSites.length / (maxSitesAllowed === -1 ? (ownedSites.length || 1) : maxSitesAllowed)) * 100, 100)}%` }}
                    />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Usage: {ownedSites.length} / {maxSitesAllowed === -1 ? '∞' : maxSitesAllowed} Sites
                </span>
            </div>
            <SiteList initialSites={sites} rootDomain={rootDomain} isLimitReached={isLimitReached} />
        </div>
    );
}
