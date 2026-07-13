import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/core/db";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const userSites = await db.siteUser.findMany({
        where: { userId: session.user.id, role: "owner" },
        select: { siteId: true }
    });
    const sitesCount = userSites.length;
    const siteIds = userSites.map(s => s.siteId);

    const activeSubscriptions = await db.subscription.findMany({
        where: { 
            siteId: { in: siteIds }, 
            status: { in: ["active", "past_due"] } 
        },
        select: {
            addonSlots: true,
            plan: {
                select: {
                    maxSites: true
                }
            }
        }
    });
    
    const maxSitesAllowed = (() => {
        if (activeSubscriptions.length === 0) return 1;
        let max = 1;
        for (const s of activeSubscriptions) {
            const planLimit = s.plan?.maxSites ?? 1;
            if (planLimit === -1) return -1;
            const total = planLimit + (s.addonSlots || 0);
            if (total > max) {
                max = total;
            }
        }
        return max;
    })();

    // If limit reached, redirect to billing (unless they have 0 sites, then they MUST onboarding)
    if (sitesCount > 0 && maxSitesAllowed !== -1 && sitesCount >= maxSitesAllowed) {
        redirect("/dashboard/billing");
    }

    return <>{children}</>;
}
