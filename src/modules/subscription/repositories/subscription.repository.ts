import { db } from "@/modules/shared/core/db";

/**
 * Mengambil nama paket langganan aktif untuk daftar situs.
 */
export async function findActivePlanNamesForSites(siteIds: string[]) {
    return db.subscription.findMany({
        where: {
            siteId: { in: siteIds },
            status: "active"
        },
        select: {
            siteId: true,
            plan: {
                select: {
                    name: true
                }
            }
        }
    });
}

/**
 * Mengambil subscription aktif atau past_due untuk suatu situs.
 * past_due termasuk karena masih dalam grace period.
 */
export async function findActiveSubscription(siteId: string) {
    const subs = await db.subscription.findMany({
        where: {
            siteId,
            status: { in: ["active", "past_due"] }
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" }
    });
    if (subs.length > 1) {
        console.warn(`[findActiveSubscription] Multiple active/past_due subscriptions found for site '${siteId}' — using the latest. Count: ${subs.length}`);
    }
    return subs[0] || null;
}

/**
 * Mencari langganan aktif dari sekumpulan siteIds (untuk validasi limit situs saat onboarding).
 */
export async function findActiveSubscriptionsBySiteIds(siteIds: string[]) {
    return db.subscription.findMany({
        where: {
            siteId: { in: siteIds },
            status: { in: ["active", "past_due"] }
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Mengambil subscription aktif atau past_due terakhir dari suatu situs.
 */
export async function findLatestSubscription(tx, siteId: string) {
    const client = tx || db;
    return client.subscription.findFirst({
        where: {
            siteId,
            status: { in: ["active", "past_due"] }
        }
    });
}

/**
 * Mengambil subscription terbaru tanpa mempedulikan status.
 */
export async function findLatestSubscriptionAnyStatus(siteId: string) {
    return db.subscription.findFirst({
        where: { siteId },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Mengambil seluruh subscription aktif untuk suatu situs (bisa lebih dari satu).
 * Digunakan untuk mendeteksi dan membersihkan duplikasi.
 */
export async function findAllActiveSubscriptions(siteId: string) {
    return db.subscription.findMany({
        where: { siteId, status: "active" },
        include: { plan: true },
        orderBy: { createdAt: "desc" }
    });
}

/**
 * Membersihkan duplikasi subscription aktif — cancel semua kecuali yang terbaru.
 */
export async function deduplicateActiveSubscriptions(siteId: string) {
    const activeSubs = await db.subscription.findMany({
        where: { siteId, status: "active" },
        orderBy: { createdAt: "desc" }
    });

    if (activeSubs.length <= 1) return 0;

    const [keep, ...toCancel] = activeSubs;
    await db.subscription.updateMany({
        where: { id: { in: toCancel.map(s => s.id) } },
        data: { status: "cancelled" }
    });

    console.warn(`[Deduplicate] Cancelled ${toCancel.length} duplicate active subscriptions for site '${siteId}', keeping '${keep.id}'`);
    return toCancel.length;
}

/**
 * Memperbarui jumlah addon slots pada subscription.
 */
export async function updateSubscriptionAddonSlots(tx, subId: string, quantity: number) {
    const client = tx || db;
    return client.subscription.update({
        where: { id: subId },
        data: {
            addonSlots: {
                increment: quantity
            }
        }
    });
}

/**
 * Menonaktifkan (membatalkan) semua subscription aktif milik situs.
 */
export async function cancelAllSubscriptions(tx, siteId: string) {
    const client = tx || db;
    return client.subscription.updateMany({
        where: { siteId },
        data: { status: "cancelled" }
    });
}

/**
 * Mengambil subscription berdasarkan situs dan paket tertentu.
 */
export async function findSubscriptionBySiteAndPlan(tx, siteId: string, planId: string) {
    const client = tx || db;
    return client.subscription.findFirst({
        where: { siteId, planId }
    });
}

/**
 * Memperbarui subscription yang sudah ada agar aktif kembali.
 */
export async function activateExistingSubscription(tx, subId: string, data: { endDate: Date, addonSlots: number }) {
    const client = tx || db;
    return client.subscription.update({
        where: { id: subId },
        data: {
            status: "active",
            endDate: data.endDate,
            trialEndsAt: null,
            addonSlots: data.addonSlots
        }
    });
}

/**
 * Membuat subscription baru.
 */
export async function createSubscription(tx, data: { siteId: string, planId: string, status: string, startDate: Date, endDate: Date, addonSlots: number }) {
    const client = tx || db;
    return client.subscription.create({
        data: {
            siteId: data.siteId,
            planId: data.planId,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            addonSlots: data.addonSlots
        }
    });
}

/**
 * Memperbarui masa uji coba (trial) subscription.
 */
export async function updateSubscriptionTrial(id: string, data: {
    trialEndsAt: Date;
    trialExtended: boolean;
}) {
    return db.subscription.update({
        where: { id },
        data: {
            trialEndsAt: data.trialEndsAt,
            trialExtended: data.trialExtended
        }
    });
}

/**
 * Mengambil subscription berdasarkan ID.
 */
export async function findSubscriptionById(id: string) {
    return db.subscription.findUnique({
        where: { id },
        include: { plan: true }
    });
}

/**
 * Atomic trial extension — only updates if trialExtended is still false (race condition guard).
 */
export async function updateSubscriptionTrialAtomic(id: string, trialEndsAt: Date) {
    const result = await db.subscription.updateMany({
        where: { id, trialExtended: false },
        data: {
            trialEndsAt,
            trialExtended: true
        }
    });
    return result.count > 0;
}

/**
 * Memperbarui data subscription.
 */
export async function updateSubscription(id: string, data: any) {
    return db.subscription.update({
        where: { id },
        data,
        include: { plan: true }
    });
}

/**
 * Memperbarui status subscription saja tanpa relasi plan.
 */
export async function updateSubscriptionStatusOnly(id: string, status: string) {
    return db.subscription.update({
        where: { id },
        data: { status }
    });
}
