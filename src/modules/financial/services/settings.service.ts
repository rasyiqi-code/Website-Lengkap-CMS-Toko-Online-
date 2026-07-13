import { SubscriptionClient } from "@/modules/subscription";
import { db } from "@/modules/shared/core/db";

/**
 * Mengambil konteks billing untuk halaman settings situs:
 * - Langganan aktif + nama plan
 * - Semua plan (untuk dropdown upgrade)
 */
export async function getSiteSettingsBillingContext(siteId: string) {
    const [subscription, allPlans] = await Promise.all([
        SubscriptionClient.getActiveSubscription(siteId),
        SubscriptionClient.getAllPlans()
    ]);

    const plan = subscription?.plan as any;
    const activePlanName = plan?.name || allPlans.find((p: any) => Number(p.price) === 0)?.name || "Free";
    const activePlanPrice = plan?.price ? Number(plan.price) : 0;

    // Hitung status masa aktif
    const now = new Date();
    let isExpired = false;
    let isGracePeriod = false;

    if (subscription) {
        if (subscription.trialEndsAt) {
            const trialEnd = new Date(subscription.trialEndsAt);
            if (now > trialEnd) {
                const graceEnd = new Date(trialEnd);
                graceEnd.setDate(graceEnd.getDate() + 30);
                if (now <= graceEnd) isGracePeriod = true;
                else isExpired = true;
            }
        } else if (subscription.endDate) {
            const end = new Date(subscription.endDate);
            if (now > end) {
                const graceEnd = new Date(end);
                graceEnd.setDate(graceEnd.getDate() + 30);
                if (now <= graceEnd) isGracePeriod = true;
                else isExpired = true;
            }
        } else if (subscription.status === "cancelled" || subscription.status === "expired") {
            isExpired = true;
        } else if (subscription.status === "past_due") {
            isGracePeriod = true;
        }
    }

    return {
        activePlanName,
        activePlanPrice,
        isTrial: subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) > new Date() : false,
        trialEndsAt: subscription?.trialEndsAt ?? null,
        isExpired,
        isGracePeriod,
        maxSites: plan?.maxSites || 1,
        planFeatures: {
            ...(plan?.features as any || {}),
            maxPosts: plan?.maxPosts,
            maxAssets: plan?.maxAssets,
            maxProducts: plan?.maxProducts,
            maxTestimonials: plan?.maxTestimonials,
            maxOrders: plan?.maxOrders,
        },
        allPlans: allPlans.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price)
        }))
    };
}

/**
 * Mengambil konteks data langganan lengkap untuk halaman Billing Dashboard.
 */
export async function getSubscriptionContext(siteId: string) {
    const [subscription, dbPlans, adminSite, platformSettings] = await Promise.all([
        SubscriptionClient.getActiveSubscription(siteId),
        SubscriptionClient.getPricingPlans(),
        db.site.findUnique({
            where: { subdomain: "admin" },
            select: {
                siteSettings: {
                    select: {
                        whatsappNumber: true
                    }
                },
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
        }),
        db.platformSettings.findUnique({
            where: { id: "global" },
            select: { paymentGateway: true }
        })
    ]);

    // Serialize data for Client Component
    const serializedPlans = dbPlans.map((plan: any) => ({
        ...plan,
        price: Number(plan.price),
        priceYearly: plan.priceYearly ? Number(plan.priceYearly) : null,
        originalPrice: plan.originalPrice ? Number(plan.originalPrice) : null,
        originalPriceYearly: plan.originalPriceYearly ? Number(plan.originalPriceYearly) : null,
    }));

    let serializedCurrentPlan: any = (subscription?.plan as any) ? {
        ...(subscription.plan as any),
        price: Number((subscription.plan as any).price),
        priceYearly: (subscription.plan as any).priceYearly ? Number((subscription.plan as any).priceYearly) : null,
        originalPrice: (subscription.plan as any).originalPrice ? Number((subscription.plan as any).originalPrice) : null,
        originalPriceYearly: (subscription.plan as any).originalPriceYearly ? Number((subscription.plan as any).originalPriceYearly) : null,
        subscriptionId: subscription.id,
        endDate: subscription.endDate ? subscription.endDate.toISOString() : null,
        trialEndsAt: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
        trialExtended: subscription.trialExtended || false,
        status: subscription.status,
        addonSlots: subscription.addonSlots || 0
    } : null;

    // Fallback: Jika tidak ada subscription aktif, cari subscription terakhir (mungkin expired)
    // agar bisa menampilkan informasi plan yang benar
    if (!serializedCurrentPlan) {
        const latestSub = subscription ? null : await db.subscription.findFirst({
            where: { siteId },
            include: { plan: true },
            orderBy: { createdAt: "desc" }
        });

        if (latestSub) {
            serializedCurrentPlan = {
                ...(latestSub.plan as any),
                price: Number((latestSub.plan as any).price),
                priceYearly: (latestSub.plan as any).priceYearly ? Number((latestSub.plan as any).priceYearly) : null,
                originalPrice: (latestSub.plan as any).originalPrice ? Number((latestSub.plan as any).originalPrice) : null,
                originalPriceYearly: (latestSub.plan as any).originalPriceYearly ? Number((latestSub.plan as any).originalPriceYearly) : null,
                subscriptionId: latestSub.id,
                endDate: latestSub.endDate ? latestSub.endDate.toISOString() : null,
                trialEndsAt: latestSub.trialEndsAt ? latestSub.trialEndsAt.toISOString() : null,
                trialExtended: latestSub.trialExtended || false,
                status: latestSub.status,
                addonSlots: latestSub.addonSlots || 0
            };
        } else {
            const freePlan: any = dbPlans.find((p: any) => p.name.toLowerCase() === 'free');
            if (freePlan) {
                serializedCurrentPlan = {
                    ...freePlan,
                    price: Number(freePlan.price),
                    priceYearly: freePlan.priceYearly ? Number(freePlan.priceYearly) : null,
                    originalPrice: freePlan.originalPrice ? Number(freePlan.originalPrice) : null,
                    originalPriceYearly: freePlan.originalPriceYearly ? Number(freePlan.originalPriceYearly) : null,
                    subscriptionId: null,
                    endDate: null,
                    status: 'none'
                };
            }
        }
    }

    const paymentMethods = adminSite?.paymentSettings ? [adminSite.paymentSettings] : [];
    const whatsappNumber = adminSite?.siteSettings?.whatsappNumber || "6281234567890";

    return {
        plans: serializedPlans,
        currentPlan: serializedCurrentPlan,
        paymentMethods,
        whatsappNumber,
        paymentGateway: platformSettings?.paymentGateway || "midtrans"
    };
}

/**
 * Mengambil seluruh data settings platform admin untuk halaman Admin Settings.
 */
export async function getAdminSettingsContext() {
    const [adminSite, plans, platformSettings] = await Promise.all([
        db.site.findUnique({
            where: { subdomain: "admin" },
            include: {
                siteSettings: {
                    select: {
                        siteName: true,
                        contactEmail: true,
                        contactPhone: true,
                        whatsappNumber: true,
                        footerAddress: true,
                        allowRegistration: true
                    }
                },
                paymentSettings: true
            }
        }),
        db.plan.findMany({
            orderBy: { price: "asc" },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                priceYearly: true,
                originalPrice: true,
                originalPriceYearly: true,
                trialDays: true,
                interval: true,
                features: true,
                maxPosts: true,
                maxProducts: true,
                maxAssets: true,
                maxTestimonials: true,
                maxOrders: true,
                maxSites: true,
                showInPricing: true,
                createdAt: true,
                updatedAt: true
            }
        }),
        db.platformSettings.findUnique({
            where: { id: "global" }
        })
    ]);

    return {
        adminSite,
        plans,
        platformSettings
    };
}
