import React from "react";
import { db } from "@/lib/core/db";
import TransactionList from "@/components/admin/TransactionList";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
    const rawTransactions = await db.paymentTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 100, // Batasi 100 transaksi terbaru untuk mencegah memory spike
        select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            proofOfPayment: true,
            notes: true,
            createdAt: true,
            addonType: true,
            addonQuantity: true,
            siteId: true,
            planId: true,
        }
    });

    const planIds = Array.from(new Set(rawTransactions.map(tx => tx.planId)));
    const plans = await db.plan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true, interval: true }
    });
    const planMap = new Map(plans.map(p => [p.id, p]));

    const siteIds = Array.from(new Set(rawTransactions.map(tx => tx.siteId)));
    const sites = await db.site.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, name: true, subdomain: true }
    });
    const siteMap = new Map(sites.map(s => [s.id, s]));

    const transactions = rawTransactions.map(tx => ({
        ...tx,
        plan: planMap.get(tx.planId) || null,
        site: siteMap.get(tx.siteId) || null
    }));

    const serializedTransactions = JSON.parse(JSON.stringify(transactions));

    return <TransactionList initialTransactions={serializedTransactions} />;
}
