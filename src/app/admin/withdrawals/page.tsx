import React from "react";
import { db } from "@/lib/core/db";
import WithdrawalList from "@/components/admin/WithdrawalList";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
    const withdrawals = await db.withdrawal.findMany({
        orderBy: { createdAt: "desc" },
        take: 100 // Batasi 100 withdrawal terbaru untuk mencegah memory spike
    });

    // Fetch users secara terpisah (soft reference — tanpa FK join)
    const userIds = [...new Set(withdrawals.map(w => w.userId))];
    const users = userIds.length > 0
        ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : [];
    const userMap = new Map(users.map(u => [u.id, { name: u.name, email: u.email }]));

    const enriched = withdrawals.map(w => ({
        ...w,
        user: userMap.get(w.userId) ?? { name: null, email: null }
    }));

    const serialized = JSON.parse(JSON.stringify(enriched));

    return <WithdrawalList initialWithdrawals={serialized} />;
}
