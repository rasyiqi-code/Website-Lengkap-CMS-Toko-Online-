import React from "react";
import { db } from "@/lib/core/db";
import SubscriptionList from "@/modules/subscription/ui/admin/subscriptions/SubscriptionList";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
    const rawSubscriptions = await db.subscription.findMany({
        orderBy: { startDate: "desc" },
        take: 100, // Batasi 100 langganan terbaru untuk mencegah memory spike
        select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            addonSlots: true,
            trialEndsAt: true,
            planId: true,
            siteId: true,
            plan: { 
                select: { 
                    id: true, 
                    name: true, 
                    price: true,
                    maxSites: true,
                    maxPosts: true,
                    maxProducts: true,
                    addonSiteBilling: true,
                    features: true
                } 
            }
        }
    });

    const siteIds = Array.from(new Set(rawSubscriptions.map(s => s.siteId)));
    const sites = await db.site.findMany({
        where: { 
            id: { in: siteIds },
            NOT: { subdomain: "admin" } 
        },
        select: { 
            id: true,
            name: true, 
            subdomain: true,
            siteSettings: {
                select: {
                    whatsappNumber: true,
                    contactPhone: true
                }
            }
        } 
    });

    // Ambil data owner situs secara in-memory
    const siteUsers = await db.siteUser.findMany({
        where: { siteId: { in: siteIds }, role: "owner" },
        select: { siteId: true, userId: true }
    });
    const userIds = Array.from(new Set(siteUsers.map(su => su.userId)));
    
    const { IdentityClient } = await import("@/modules/auth");
    const userMap = await IdentityClient.getUsersMap(userIds);
    const siteOwnerMap = new Map();
    for (const su of siteUsers) {
        const u = userMap[su.userId];
        if (u) {
            siteOwnerMap.set(su.siteId, u);
        }
    }

    const siteMap = new Map(sites.map(s => [s.id, s]));

    const subscriptions = rawSubscriptions
        .map(sub => {
            const site = siteMap.get(sub.siteId);
            if (!site) return null;
            const owner = siteOwnerMap.get(sub.siteId);
            return {
                ...sub,
                site: {
                    ...site,
                    users: owner ? [owner] : []
                }
            };
        })
        .filter((sub): sub is Exclude<typeof sub, null> => sub !== null);

    const serializedSubscriptions = JSON.parse(JSON.stringify(subscriptions));

    return <SubscriptionList initialSubscriptions={serializedSubscriptions} />;
}
