import React from "react";
import { AlertCircle } from "lucide-react";
import { getSiteId } from "@/lib/domains/tenant";
import { db } from "@/lib/core/db";
import { LinkButton } from "@/components/ui/LinkButton";
import HistoryBillClient from "@/components/dashboard/HistoryBillClient";
import { getPlatformSettings } from "@/lib/settings/platform";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HistoryBillPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    let siteId = await getSiteId();
    
    // Fallback untuk root domain / dashboard utama (cari situs milik sendiri yang berstatus owner)
    if (!siteId) {
        const ownedSiteLink = await db.siteUser.findFirst({
            where: {
                userId: session.user.id,
                role: "owner"
            },
            select: { siteId: true }
        });
        siteId = ownedSiteLink?.siteId || null;
    } else {
        // Jika siteId terdeteksi dari domain/subdomain, pastikan user saat ini adalah owner situs tersebut
        const isOwner = await db.siteUser.findFirst({
            where: {
                siteId: siteId,
                userId: session.user.id,
                role: "owner"
            }
        });
        if (!isOwner) {
            return (
                <div className="w-full h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                        <AlertCircle size={32} className="text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Akses Ditolak</h2>
                    <p className="text-muted-foreground text-sm mt-2 max-w-xs text-center">
                        Hanya pemilik situs yang dapat melihat riwayat langganan dan tagihan.
                    </p>
                    <LinkButton href="/dashboard" className="mt-8">
                        Kembali ke Dashboard
                    </LinkButton>
                </div>
            );
        }
    }

    if (!siteId) {
        return (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
                <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-6">
                    <AlertCircle size={32} className="text-muted-foreground opacity-40" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Pilih Situs</h2>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs text-center">
                    Silakan buat situs terlebih dahulu untuk melihat riwayat tagihan.
                </p>
                <LinkButton href="/onboarding" className="mt-8">
                    Buat Situs
                </LinkButton>
            </div>
        );
    }

    const transactions = await db.paymentTransaction.findMany({
        where: { siteId },
        take: 100, // Batasi 100 transaksi terbaru untuk mencegah memory spike
        select: {
            id: true,
            amount: true,
            status: true,
            addonType: true,
            addonQuantity: true,
            paymentMethod: true,
            paymentUrl: true,
            createdAt: true,
            updatedAt: true,
            planId: true,
        },
        orderBy: { createdAt: "desc" }
    });

    const planIds = [...new Set(transactions.map(tx => tx.planId))];
    const planDataMap = new Map();
    if (planIds.length > 0) {
        const plans = await db.plan.findMany({
            where: { id: { in: planIds } },
            select: {
                id: true,
                name: true,
                price: true,
                priceYearly: true,
                originalPrice: true,
                originalPriceYearly: true,
                createdAt: true,
                updatedAt: true
            }
        });
        for (const p of plans) {
            planDataMap.set(p.id, p);
        }
    }

    // Fetch Admin Site for payment settings
    const adminSite = await db.site.findUnique({
        where: { subdomain: "admin" },
        select: {
            paymentSettings: {
                select: {
                    id: true,
                    bankName: true,
                    accountHolder: true,
                    accountNumber: true,
                    instructions: true
                }
            }
        }
    });

    const paymentMethods = adminSite?.paymentSettings ? [adminSite.paymentSettings] : [];
    const platform = await getPlatformSettings();
    const whatsappNumber = platform.whatsappNumber || "6281234567890";

    // Serialize data
    const serializedTransactions = transactions.map(tx => {
        const p = planDataMap.get(tx.planId);
        return {
            ...tx,
            amount: tx.amount.toNumber(),
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            plan: p ? {
                ...p,
                price: p.price.toNumber(),
                priceYearly: p.priceYearly ? p.priceYearly.toNumber() : null,
                originalPrice: p.originalPrice ? p.originalPrice.toNumber() : 0,
                originalPriceYearly: p.originalPriceYearly ? p.originalPriceYearly.toNumber() : 0,
            } : null
        };
    });

    return (
        <HistoryBillClient
            transactions={serializedTransactions}
            paymentMethods={paymentMethods}
            whatsappNumber={whatsappNumber}
            siteId={siteId}
        />
    );
}
