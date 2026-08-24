import React from "react";
import { db } from "@/lib/core/db";
import CouponList from "@/components/admin/CouponList";
import { IdentityClient } from "@/modules/auth";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
    const rawCoupons = await db.coupon.findMany({
        orderBy: {
            createdAt: "desc"
        },
        take: 100 // Batasi 100 coupon terbaru untuk mencegah memory spike
    });

    const affiliateIds = Array.from(new Set(rawCoupons.map(c => c.affiliateId).filter(Boolean))) as string[];
    const usersMap = await IdentityClient.getUsersMap(affiliateIds);

    const coupons = rawCoupons.map(coupon => ({
        ...coupon,
        affiliate: coupon.affiliateId ? usersMap[coupon.affiliateId] || null : null
    }));


    const users = await db.user.findMany({
        select: {
            id: true,
            name: true,
            email: true
        },
        orderBy: {
            name: "asc"
        }
    });

    const serializedCoupons = JSON.parse(JSON.stringify(coupons));
    const serializedUsers = JSON.parse(JSON.stringify(users));

    return <CouponList initialCoupons={serializedCoupons} affiliates={serializedUsers} />;
}
