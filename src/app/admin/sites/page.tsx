import React from "react";
import { db } from "@/lib/core/db";
import SiteList from "@/modules/site/ui/admin/sites/SiteList";

export const dynamic = "force-dynamic";

export default async function AdminSitesPage() {
    const dbSites = await db.site.findMany({
        orderBy: { createdAt: "desc" },
        take: 100, // Batasi 100 situs terbaru untuk mencegah memory spike
        where: {
            NOT: { subdomain: "admin" }
        },
        select: {
            id: true,
            name: true,
            subdomain: true,
            customDomain: true,
            createdAt: true
        }
    });

    const { IdentityClient } = await import("@/modules/auth");
    const rawSites = await Promise.all(dbSites.map(async (site) => {
        const owner = await IdentityClient.getSiteOwner(site.id);
        return {
            ...site,
            users: owner ? [{ name: owner.name, email: owner.email }] : []
        };
    }));

    const sites = await Promise.all(rawSites.map(async (site) => {
        const subs = await db.subscription.findMany({
            where: { siteId: site.id, status: "active" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
                id: true,
                trialEndsAt: true,
                trialExtended: true,
                plan: { select: { name: true } }
            }
        });
        return {
            ...site,
            subscriptions: subs
        };
    }));

    const serializedSites = JSON.parse(JSON.stringify(sites));

    return <SiteList initialSites={serializedSites} />;
}
