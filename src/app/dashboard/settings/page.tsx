import React from "react";
import SettingsForm from "@/modules/site/ui/dashboard/settings/SettingsForm";
import { getApiContext } from "@/lib/api/utils";
import { SiteClient } from "@/modules/site";
import { FinancialClient } from "@/modules/financial";
import { getPaymentSettings } from "@/modules/shared/utils/settings/payment";
import { AlertCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";

export const dynamic = "force-dynamic";

export default async function MasterSettingsPage() {
    const context = await getApiContext(["admin", "owner"], { requireSite: true });
    if ("error" in context) {
        return (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
                    <AlertCircle size={32} className="text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Akses Ditolak</h2>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs text-center">
                    Hanya pemilik situs yang dapat mengelola dan mengubah setelan website.
                </p>
                <LinkButton href="/dashboard" className="mt-8">
                    Kembali ke Dashboard
                </LinkButton>
            </div>
        );
    }
    const { session, siteId } = context;
    
    // Ambil pengaturan umum situs
    const settings = await SiteClient.getSiteSettings(siteId || undefined);
    let fullSettings: any = { ...settings };

    if (session && siteId) {
        const [domainInfo, billingContext] = await Promise.all([
            SiteClient.getSiteDomainInfo(siteId),
            FinancialClient.getSiteSettingsBillingContext(siteId)
        ]);

        fullSettings = {
            ...(settings as any),
            customDomain: domainInfo?.customDomain,
            customDomainVerified: domainInfo?.customDomainVerified,
            plan: billingContext.activePlanName,
            isTrial: billingContext.isTrial,
            trialEndsAt: billingContext.trialEndsAt ? String(billingContext.trialEndsAt) : null,
            isExpired: billingContext.isExpired,
            isGracePeriod: billingContext.isGracePeriod,
            planPrice: billingContext.activePlanPrice,
            allPlans: billingContext.allPlans,
            planFeatures: billingContext.planFeatures,
            maxSites: billingContext.maxSites
        };
    }

    // Ambil pengaturan pembayaran situs
    let paymentData = null;
    if (siteId) {
        paymentData = await getPaymentSettings(siteId);
    }

    // Serialisasikan decimal atau objek non-serializable jika ada
    const serializedSettings = JSON.parse(JSON.stringify(fullSettings));
    const serializedPaymentData = JSON.parse(JSON.stringify(paymentData || {}));

    return (
        <SettingsForm 
            initialSettings={serializedSettings} 
            initialPaymentData={serializedPaymentData} 
        />
    );
}
