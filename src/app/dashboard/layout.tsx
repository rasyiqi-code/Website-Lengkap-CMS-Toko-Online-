import React from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSiteSettings } from "@/modules/site/ui/site-settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSiteId, getSiteAccessStatus, getTenant } from "@/lib/domains/tenant";
import { AlertCircle, CreditCard } from "lucide-react";
import Link from "next/link";
import { SiteClient } from "@/modules/site";
import { IdentityClient } from "@/modules/auth";
import { generateBridgeToken } from "@/lib/api/utils";
import { db } from "@/lib/core/db";

import { headers } from "next/headers";
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    const siteId = await getSiteId();
    const tenant = await getTenant();
    const headersList = await headers();
    const pathname = headersList.get("x-url") || "/dashboard";
    const host = headersList.get("host") || "";

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

    if (!session) {
        // If we are on a subdomain, redirect to the auth bridge on the root domain
        if (tenant && host !== rootDomain && host !== `www.${rootDomain}`) {
            const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
            const targetUrl = `${protocol}://${host}${pathname}`;
            const bridgeUrl = `${protocol}://${rootDomain}/api/auth/bridge?target=${encodeURIComponent(targetUrl)}`;
            return redirect(bridgeUrl);
        }

        // Otherwise (root domain), just go to login
        return redirect("/login");
    }

    // Only check for onboarding if no sites exist
    if (!siteId && session.user.role !== "admin") {
        const siteCountRes = await SiteClient.getUserSiteCount(session.user.id);
        const siteCount = siteCountRes.count;

        if (siteCount === 0) {
            if (pathname !== "/onboarding") {
                redirect("/onboarding");
            }
        }
    }

    // Platform Admin Redirect - Strictly enforce /admin for platform administrators on the root domain
    if (!siteId && session.user.role === "admin") {
        redirect("/admin");
    }

    // Verify that the logged-in user belongs to this site (unless they are platform admin)
    if (siteId && session.user.role !== "admin") {
        const isUserLinked = await SiteClient.verifyUserSiteAccess(session.user.id, siteId);

        if (!isUserLinked) {
            // Find if user is associated with any other site(s)
            const userSitesRes = await IdentityClient.getUserSites(session.user.id);
            const firstUserSite = userSitesRes.sites[0];

            const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
            const currentRootDomain = host.includes("localhost") ? "localhost:3000" : (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000");

            if (firstUserSite) {
                // Generate a session bridge token using our external utility function (avoids impure Date.now() call in render)
                const bridgeToken = generateBridgeToken(session.user.id);

                // Redirect user to their own site's dashboard via the auth bridge accept endpoint
                return redirect(`${protocol}://${firstUserSite.subdomain}.${currentRootDomain}/api/auth/bridge/accept?token=${bridgeToken}&redirect=/dashboard`);
            } else {
                // Redirect user to onboarding on the root domain
                return redirect(`${protocol}://${currentRootDomain}/onboarding`);
            }
        }
    }

    const settings = await getSiteSettings(siteId || undefined);
    const siteStatus = await getSiteAccessStatus();

    // Block full dashboard access if EXPIRED (past grace period)
    // But allow billing, history-bill, and subscriptions to stay accessible
    const allowedBillingPaths = ["/dashboard/billing", "/dashboard/history-bill", "/dashboard/subscriptions"];
    if (siteStatus === "expired" && !allowedBillingPaths.includes(pathname)) {
        redirect("/dashboard/billing");
    }

    // Ambil role efektif pengguna di situs ini
    let userRole = "user";
    if (siteId && session?.user?.id) {
        if (session.user.role === "admin") {
            userRole = "owner";
        } else {
            const link = await db.siteUser.findUnique({
                where: {
                    siteId_userId: {
                        siteId,
                        userId: session.user.id
                    }
                },
                select: { role: true }
            });
            userRole = link?.role || "user";
        }
    } else if (!siteId && session?.user?.role === "admin") {
        userRole = "admin";
    } else if (!siteId) {
        userRole = "owner";
    }

    return (
        <DashboardShell initialSettings={settings} siteId={siteId} userRole={userRole}>
            {siteStatus === "grace_period" && pathname !== "/dashboard/billing" && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-[5px] py-2 flex items-center justify-between animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-500" size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                            Masa Berlaku Habis (Masa Tenggang 30 Hari)
                        </span>
                    </div>
                    <Link
                        href="/dashboard/billing"
                        className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                        <CreditCard size={12} /> Perbarui Sekarang
                    </Link>
                </div>
            )}
            {children}
        </DashboardShell>
    );
}
