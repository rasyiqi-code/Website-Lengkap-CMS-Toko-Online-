import React from "react";
import { db } from "@/lib/core/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreditCard, Globe, ArrowRight, ExternalLink, Calendar, PlusCircle, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableContainer, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    // 1. Ambil semua situs di mana pengguna saat ini adalah pemilik (owner)
    const siteLinks = await db.siteUser.findMany({
        where: {
            userId: (session.user as any).id,
            role: "owner"
        },
        select: { siteId: true }
    });

    const ownedSiteIds = siteLinks.map(l => l.siteId);

    const sites = await db.site.findMany({
        where: { id: { in: ownedSiteIds } },
        select: {
            id: true,
            name: true,
            subdomain: true,
            customDomain: true,
        }
    });

    // 2. Ambil seluruh data langganan yang berkaitan dengan situs-situs tersebut
    const subscriptions = await db.subscription.findMany({
        where: { siteId: { in: ownedSiteIds } },
        include: { plan: true },
        orderBy: { createdAt: "desc" }
    });

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

    // 3. Petakan situs dengan langganannya dan tentukan status efisiensinya
    const siteSubsData = sites.map(site => {
        const sub = subscriptions.find(s => s.siteId === site.id);

        let status = "no_subscription";
        let statusLabel = "Tanpa Langganan";
        let statusColor = "text-muted-foreground bg-muted/10 border-muted/20";
        let trialDaysLeft: number | null = null;
        let graceDaysLeft: number | null = null;
        let isTrial = false;
        let isExpired = false;

        if (sub) {
            const now = new Date();

            // Paket permanen (misal Free)
            if (sub.status === "active" && !sub.trialEndsAt && !sub.endDate) {
                status = "active";
                statusLabel = "Aktif";
                statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            }
            // Paket dengan masa trial
            else if (sub.trialEndsAt) {
                isTrial = true;
                const trialEnd = new Date(sub.trialEndsAt);
                if (now <= trialEnd) {
                    status = "active";
                    statusLabel = "Trial Aktif";
                    statusColor = "text-sky-500 bg-sky-500/10 border-sky-500/20";
                    trialDaysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24));
                } else {
                    const graceEnd = new Date(trialEnd);
                    graceEnd.setDate(graceEnd.getDate() + 30);
                    if (now <= graceEnd) {
                        status = "grace_period";
                        statusLabel = "Masa Tenggang";
                        statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                        graceDaysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 3600 * 24));
                    } else {
                        status = "expired";
                        statusLabel = "Kedaluwarsa";
                        statusColor = "text-red-500 bg-red-500/10 border-red-500/20";
                        isExpired = true;
                    }
                }
            }
            // Paket berbayar dengan batas tanggal berakhir (endDate)
            else if (sub.endDate) {
                const end = new Date(sub.endDate);
                if (now <= end) {
                    status = "active";
                    statusLabel = "Aktif";
                    statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                } else {
                    const graceEnd = new Date(end);
                    graceEnd.setDate(graceEnd.getDate() + 30);
                    if (now <= graceEnd) {
                        status = "grace_period";
                        statusLabel = "Masa Tenggang";
                        statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                        graceDaysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 3600 * 24));
                    } else {
                        status = "expired";
                        statusLabel = "Kedaluwarsa";
                        statusColor = "text-red-500 bg-red-500/10 border-red-500/20";
                        isExpired = true;
                    }
                }
            }
            // Pengecekan fallback status DB langsung
            else {
                if (sub.status === "cancelled" || sub.status === "expired") {
                    status = "expired";
                    statusLabel = "Kedaluwarsa";
                    statusColor = "text-red-500 bg-red-500/10 border-red-500/20";
                    isExpired = true;
                } else if (sub.status === "past_due") {
                    status = "grace_period";
                    statusLabel = "Masa Tenggang";
                    statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                } else {
                    status = "active";
                    statusLabel = "Aktif";
                    statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                }
            }
        }

        return {
            site,
            subscription: sub,
            status,
            statusLabel,
            statusColor,
            trialDaysLeft,
            graceDaysLeft,
            isTrial,
            isExpired
        };
    });

    return (
        <div className="w-full animate-in fade-in duration-700 pb-32 space-y-6 text-foreground">
            <PageHeader
                title="Langganan Saya"
                subtitle="Kelola paket langganan, masa aktif, dan addon untuk setiap situs Anda."
                icon={<CreditCard />}
            />

            {siteSubsData.length === 0 ? (
                <div className="w-full bg-card border border-border/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                        <Globe size={32} className="text-muted-foreground opacity-40" />
                    </div>
                    <h3 className="text-lg font-bold">Belum Ada Situs</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Anda tidak memiliki situs aktif untuk dikelola langganannya. Silakan buat situs baru terlebih dahulu.
                    </p>
                </div>
            ) : (
                <TableContainer>
                    <THead>
                        <TR>
                            <TH>Situs / Domain</TH>
                            <TH>Paket & Addon</TH>
                            <TH>Status</TH>
                            <TH>Masa Berlaku / Expired</TH>
                            <TH align="right">Aksi</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {siteSubsData.map(({ site, subscription, statusLabel, statusColor, trialDaysLeft, graceDaysLeft, isTrial, isExpired }) => {
                            const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
                            const billingUrl = `${protocol}://${site.subdomain}.${rootDomain}/dashboard/billing`;

                            return (
                                <TR key={site.id}>
                                    <TD>
                                        <div className="flex flex-col py-1">
                                            <span className="text-sm font-bold text-foreground">
                                                {site.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                                                <Globe size={10} />
                                                {site.customDomain || `${site.subdomain}.${rootDomain}`}
                                            </span>
                                        </div>
                                    </TD>
                                    <TD>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground">
                                                Paket {subscription?.plan?.name || "Dasar"}
                                            </span>
                                            {subscription?.addonSlots > 0 ? (
                                                <span className="text-[9px] text-amber-500 font-extrabold flex items-center gap-1 mt-0.5">
                                                    <PlusCircle size={10} />
                                                    {subscription.addonSlots} Slot Situs Tambahan
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-muted-foreground font-semibold mt-0.5">
                                                    Tanpa Addon
                                                </span>
                                            )}
                                        </div>
                                    </TD>
                                    <TD>
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>
                                            {statusLabel}
                                        </span>
                                    </TD>
                                    <TD>
                                        <div className="flex flex-col text-xs">
                                            {subscription ? (
                                                <>
                                                    <span className="font-semibold text-foreground flex items-center gap-1">
                                                        <Calendar size={12} className="text-muted-foreground" />
                                                        {subscription.endDate || subscription.trialEndsAt ? (
                                                            new Date(subscription.endDate || subscription.trialEndsAt).toLocaleDateString("id-ID", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric"
                                                            })
                                                        ) : (
                                                            "Permanen"
                                                        )}
                                                    </span>
                                                    {trialDaysLeft !== null && trialDaysLeft > 0 && (
                                                        <span className="text-[9px] text-sky-500 font-bold mt-0.5">
                                                            {trialDaysLeft} Hari trial tersisa
                                                        </span>
                                                    )}
                                                    {graceDaysLeft !== null && graceDaysLeft > 0 && (
                                                        <span className="text-[9px] text-amber-500 font-bold mt-0.5 flex items-center gap-1">
                                                            <AlertTriangle size={10} />
                                                            Masa tenggang {graceDaysLeft} hari lagi
                                                        </span>
                                                    )}
                                                    {isExpired && (
                                                        <span className="text-[9px] text-red-500 font-black mt-0.5">
                                                            Telah kedaluwarsa
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground font-semibold">
                                                    -
                                                </span>
                                            )}
                                        </div>
                                    </TD>
                                    <TD align="right">
                                        <a
                                            href={billingUrl}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-md ${
                                                isExpired
                                                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/20"
                                                    : statusLabel === "Masa Tenggang"
                                                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                                                    : "bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/10 hover:shadow-lg hover:shadow-sky-500/20"
                                            }`}
                                        >
                                            <span>
                                                {isExpired ? "Aktifkan Kembali" : statusLabel === "Masa Tenggang" ? "Perpanjang Segera" : "Kelola"}
                                            </span>
                                            <ExternalLink size={10} />
                                        </a>
                                    </TD>
                                </TR>
                            );
                        })}
                    </TBody>
                </TableContainer>
            )}
        </div>
    );
}
