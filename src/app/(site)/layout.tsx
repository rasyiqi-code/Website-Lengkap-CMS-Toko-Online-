import { getSiteSettings } from "@/modules/site/ui/site-settings";
import { getMenu } from "@/modules/page/ui/menu";
import { ThemeLayoutSelector } from "@/lib/content/themes";
import { getTenant, getSiteId, getSiteAccessStatus } from "@/lib/domains/tenant";
import { ExpiredSiteView } from "@/components/site/ExpiredSiteView";
import { db } from "@/lib/core/db";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getPlatformSettings } from "@/lib/settings/platform";
import { unstable_cache } from "next/cache";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import nextDynamic from "next/dynamic";
import { SubscriptionClient } from "@/modules/subscription";
import { getPage } from "@/modules/page/ui/content-display";
const SaaSLandingPage = nextDynamic(() => import("@/app/(pages)/SaaSLandingPage"), {
    ssr: true,
    loading: () => <div className="min-h-screen bg-background animate-pulse" />
});

export default async function SiteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [subdomain, siteId] = await Promise.all([
        getTenant(),
        getSiteId()
    ]);

    // If the subdomain is not registered in our database, 
    // AND it's a 2-part domain (likely the main site), show landing page
    // Otherwise (subdomain), return 404
    if (!siteId) {
        const headerList = await headers();
        const host = headerList.get("host") || "";
        const hostname = host.split(":")[0];
        const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
        const parts = hostname.split(".");
        if (parts.length <= 2 || isIp) {
            const [settings, mainMenu, footerMenu, platform, plans] = await Promise.all([
                getSiteSettings(),
                getMenu("main"),
                getMenu("footer"),
                getPlatformSettings(),
                SubscriptionClient.getPricingPlans()
            ]);
            
            return (
                <div className="flex flex-col min-h-screen bg-[#FAFAFA]">
                    <Header 
                        initialSettings={settings} 
                        initialMenuItems={mainMenu?.items || []} 
                        isTenant={false}
                    />
                    <main className="flex-grow">
                        <SaaSLandingPage platform={platform} plans={plans} siteSettings={settings} />
                    </main>
                    <Footer 
                        initialSettings={settings} 
                        initialMenuItems={footerMenu?.items || []} 
                        isTenant={false}
                    />
                </div>
            );
        }
        notFound();
    }

    // Cache the site identity query to prevent repetitive DB hits
    const site = await unstable_cache(
        async () => {
            return await db.site.findUnique({ 
                where: { id: siteId }, 
                select: { 
                    name: true, 
                    subdomain: true, 
                    customDomain: true, 
                    customDomainVerified: true 
                } 
            });
        },
        [`site-identity-${siteId}`],
        { revalidate: 600, tags: [`site-${siteId}`] }
    )();

    if (subdomain && !site) notFound();

    const headerList = await headers();
    const pathname = headerList.get("x-url") || "/";

    // Parallelize all remaining site-specific data fetching
    const [accessStatus, settings, mainMenu, footerMenu, page, platformSettings] = await Promise.all([
        getSiteAccessStatus(),
        getSiteSettings(siteId),
        getMenu("main", siteId),
        getMenu("footer", siteId),
        getPage(pathname, siteId),
        getPlatformSettings()
    ]);

    // Redirect from subdomain to custom domain IF verified
    // But only if we are currently on the subdomain and have a site
    if (site && subdomain === site.subdomain && site.customDomain && site.customDomainVerified) {
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        return redirect(`${protocol}://${site.customDomain}${pathname}`);
    }
    
    // Only show expired view if we are on a tenant subdomain/domain
    if (subdomain && (accessStatus === "expired" || accessStatus === "grace_period" || accessStatus === "no_subscription")) {
        return <ExpiredSiteView status={accessStatus} siteName={site?.name || "Website"} platformName={platformSettings?.siteName || "SitusBisnis"} />;
    }

    const hideHeader = page?.metaData?.some(m => m.key === "hide_header" && m.value === "true") || false;
    const hideFooter = page?.metaData?.some(m => m.key === "hide_footer" && m.value === "true") || false;

    return (
        <ThemeLayoutSelector 
            themeId={settings.activeTheme || "default"} 
            settings={settings} 
            mainMenu={mainMenu} 
            footerMenu={footerMenu}
            isTenant={!!subdomain}
            hideHeader={hideHeader}
            hideFooter={hideFooter}
        >
            {children}
        </ThemeLayoutSelector>
    );
}

