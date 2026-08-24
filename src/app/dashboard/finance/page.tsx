import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/core/db";
import UserFinanceView from "@/modules/financial/ui/dashboard/finance/UserFinanceView";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const userId = session.user.id;

    // 1. Fetch user data (balance)
    const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            affiliateBalance: true
        }
    });

    if (!dbUser) redirect("/login");

    const [commissions, withdrawals] = await Promise.all([
        db.commission.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 100
        }),
        db.withdrawal.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 100
        })
    ]);

    const user = {
        ...dbUser,
        commissions,
        withdrawals
    };

    // 2. Query all sites owned by this user along with their payment settings
    const siteLinks = await db.siteUser.findMany({
        where: { userId, role: "owner" },
        select: { siteId: true }
    });
    const userSiteIds = siteLinks.map(l => l.siteId);
    const userSites = await db.site.findMany({
        where: { id: { in: userSiteIds } },
        include: { paymentSettings: true }
    });

    // 3. Filter sites that are using the platform's payment gateway fallback
    const fallbackSites = userSites.filter(site => {
        return !site.paymentSettings?.gatewayMerchantId || !site.paymentSettings?.gatewayApiKey;
    });
    const fallbackSiteIds = fallbackSites.map(site => site.id);

    // 4. Query paid automated orders from these platform fallback sites
    // Batasi 200 order terbaru untuk mencegah memory spike
    const paidFallbackOrders = await db.order.findMany({
        where: {
            siteId: { in: fallbackSiteIds },
            paymentStatus: "paid",
            paymentMethod: { notIn: ["manual", "whatsapp"] }
        },
        orderBy: { createdAt: "desc" },
        take: 200
    });

    const orderSiteIds = [...new Set(paidFallbackOrders.map(o => o.siteId))];
    const orderSites = await db.site.findMany({
        where: { id: { in: orderSiteIds } },
        select: { id: true, name: true }
    });
    const orderSiteMap = new Map(orderSites.map(s => [s.id, s.name]));

    // 5. Self-Healing Balance Synchronization:
    // Recalculate what the user's balance should be (Commissions + Platform Gateway Sales - Withdrawals)
    // and sync it with the database if it doesn't match or is lower due to pre-existing transactions.
    const totalEarnedCommissions = user.commissions.reduce((sum, com) => sum + Number(com.amount), 0);
    const totalEarnedSales = paidFallbackOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalWithdrawals = user.withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

    const expectedBalance = totalEarnedCommissions + totalEarnedSales - totalWithdrawals;
    let finalBalance = Number(user.affiliateBalance);

    if (finalBalance < expectedBalance) {
        await db.user.update({
            where: { id: userId },
            data: { affiliateBalance: expectedBalance }
        });
        finalBalance = expectedBalance;
    }

    // 6. Map the paid fallback orders into standard sale transaction records for frontend rendering
    const sales = paidFallbackOrders.map(order => ({
        id: order.id,
        amount: Number(order.total),
        description: `Penjualan Toko: ${orderSiteMap.get(order.siteId) || ''} (Pesanan #${order.id.slice(0, 8).toUpperCase()})`,
        createdAt: order.createdAt,
        siteName: orderSiteMap.get(order.siteId) || ''
    }));

    // Serialize all values for the client component
    const serializedUser = JSON.parse(JSON.stringify({
        ...user,
        affiliateBalance: finalBalance,
        sales
    }));

    return <UserFinanceView user={serializedUser} />;
}
