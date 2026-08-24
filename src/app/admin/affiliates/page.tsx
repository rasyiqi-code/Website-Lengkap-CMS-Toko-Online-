import React from "react";
import { db } from "@/lib/core/db";
import AffiliateList from "@/modules/auth/ui/admin/affiliates/AffiliateList";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
    const affiliates = await db.user.findMany({
        where: {
            referrals: {
                some: {} // Only fetch users who have at least 1 referral
            }
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 100, // Batasi 100 affiliate terbaru untuk mencegah memory spike
        select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            createdAt: true,
            _count: {
                select: { referrals: true }
            },
            referrals: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true
                },
                orderBy: {
                    createdAt: "desc"
                }
            }
        }
    });

    return <AffiliateList data={affiliates} />;
}
