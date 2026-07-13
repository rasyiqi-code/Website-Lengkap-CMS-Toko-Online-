import * as subscriptionRepo from "../repositories/subscription.repository";
import { LimitType, LimitCheckResult } from "../index";
import { eventBus } from "@/modules/shared/core/event-bus";

const LIMIT_CONFIG: Record<LimitType, {
    field: string;
    label: string;
    dependency?: string;
    countFn: (_siteId: string) => Promise<number>;
}> = {
    maxPosts: {
        field: "maxPosts",
        label: "posts",
        dependency: "hasBlog",
        countFn: (siteId) => eventBus.request("request.content.countPosts", { siteId })
    },
    maxProducts: {
        field: "maxProducts",
        label: "products",
        dependency: "hasProducts",
        countFn: (siteId) => eventBus.request("request.catalog.countProducts", { siteId })
    },
    maxOrders: {
        field: "maxOrders",
        label: "orders",
        dependency: "hasOrders",
        countFn: (siteId) => eventBus.request("request.order.countOrders", { siteId })
    },
    maxTestimonials: {
        field: "maxTestimonials",
        label: "testimonials",
        dependency: "hasTestimonials",
        countFn: (siteId) => eventBus.request("request.content.countTestimonials", { siteId })
    },
    maxAssets: {
        field: "maxAssets",
        label: "MB storage",
        dependency: "hasGallery", 
        countFn: async (siteId) => {
            const bytes: number = await eventBus.request("request.content.getMediaSize", { siteId });
            return bytes / (1024 * 1024);
        }
    }
};

/**
 * Memverifikasi apakah suatu situs melampaui limitasi paket langganannya.
 */
export async function checkSiteLimit(siteId: string, type: LimitType): Promise<LimitCheckResult> {
    const subscription = await subscriptionRepo.findActiveSubscription(siteId);

    if (!subscription || !subscription.plan) {
        return {
            allowed: false,
            message: "No active subscription found. Please select a plan in the billing dashboard."
        };
    }

    const plan = subscription.plan;
    const config = LIMIT_CONFIG[type];

    if (config.dependency) {
        const features = (plan.features as any) || {};
        const isEnabled = features[config.dependency] === true;
        if (!isEnabled) {
            return {
                allowed: false,
                message: `Feature Disabled: The ${config.label} module is not included in your current plan. Please upgrade to unlock this feature.`
            };
        }
    }

    const limit = (plan as any)[config.field] ?? -1;
    if (limit === -1) {
        return { allowed: true };
    }

    const count = await config.countFn(siteId);
    if (count >= limit) {
        return {
            allowed: false,
            message: `Resource Limit Exceeded: Your ${plan.name} plan is capped at ${limit} ${config.label}. Upgrade your plan in the billing tab to unlock more.`
        };
    }

    return { allowed: true };
}

/**
 * Memverifikasi apakah pengguna sudah mencapai batas jumlah situs dalam paketnya.
 * Digunakan saat onboarding situs baru.
 */
export async function checkUserSitesLimit(siteIds: string[], currentSiteCount: number): Promise<{
    allowed: boolean;
    message?: string;
    planName?: string;
    maxSitesAllowed?: number;
}> {
    const subscriptions = await subscriptionRepo.findActiveSubscriptionsBySiteIds(siteIds);
    const now = new Date();

    // Hanya hitung langganan yang belum kedaluwarsa masa trial atau tanggal berbayarnya
    const activeSubs = subscriptions.filter(sub => {
        if (sub.trialEndsAt && now > new Date(sub.trialEndsAt)) return false;
        if (sub.endDate && now > new Date(sub.endDate)) return false;
        return true;
    });

    const maxSitesAllowed = (() => {
        if (activeSubs.length === 0) return 1;
        let max = 1;
        for (const sub of activeSubs) {
            const planLimit = sub.plan?.maxSites ?? 1;
            if (planLimit === -1) return -1;
            const total = planLimit + (sub.addonSlots || 0);
            if (total > max) {
                max = total;
            }
        }
        return max;
    })();

    const planName = activeSubs.length > 0 ? activeSubs[0].plan?.name : "Free";

    if (maxSitesAllowed !== -1 && currentSiteCount >= maxSitesAllowed) {
        return {
            allowed: false,
            planName,
            maxSitesAllowed,
            message: `Limit paket tercapai. Paket Anda (${planName}) hanya mengizinkan ${maxSitesAllowed} situs. Silakan upgrade atau hapus situs yang ada.`
        };
    }

    return { allowed: true, planName, maxSitesAllowed: maxSitesAllowed === -1 ? undefined : maxSitesAllowed };
}
