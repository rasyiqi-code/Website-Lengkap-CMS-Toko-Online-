import { db } from "@/modules/shared/core/db";
import { eventBus } from "@/modules/shared/core/event-bus";
import { GRACE_PERIOD_DAYS } from "@/lib/billing/constants";

export interface ExpirationResult {
    updatedToExpired: number;
    remindersSent: number;
}

/**
 * Memeriksa dan memperbarui status subscription yang sudah melewati grace period.
 * Juga mengirim notifikasi pengingat untuk subscription yang akan segera berakhir.
 */
export async function checkAndUpdateExpiredSubscriptions(): Promise<ExpirationResult> {
    const result: ExpirationResult = {
        updatedToExpired: 0,
        remindersSent: 0,
    };

    const now = new Date();

    // Cari semua subscription aktif atau past_due
    const activeSubs = await db.subscription.findMany({
        where: { status: { in: ["active", "past_due"] } },
        include: { plan: true },
    });

    const expiredIds: string[] = [];
    const pastDueIds: string[] = [];

    for (const sub of activeSubs) {
        const siteId = sub.siteId;

        // Tentukan kapan subscription benar-benar berakhir (akhir masa tenggang)
        let effectiveEndDate: Date | null = null;

        if (sub.trialEndsAt) {
            effectiveEndDate = new Date(sub.trialEndsAt);
            effectiveEndDate.setDate(effectiveEndDate.getDate() + GRACE_PERIOD_DAYS);
        } else if (sub.endDate) {
            effectiveEndDate = new Date(sub.endDate);
            effectiveEndDate.setDate(effectiveEndDate.getDate() + GRACE_PERIOD_DAYS);
        }

        if (!effectiveEndDate) continue; // Subscription permanen (Free plan 10 tahun)

        const daysUntilEffectiveEnd = Math.ceil((effectiveEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Jika sudah lewat grace period → set status ke "expired"
        if (now >= effectiveEndDate) {
            expiredIds.push(sub.id);
            continue;
        }

        // Jika paid subscription sudah lewat endDate (masih dalam grace period) → set ke "past_due"
        if (sub.endDate && !sub.trialEndsAt && now >= sub.endDate) {
            pastDueIds.push(sub.id);
        }

        // Jika trial sudah berakhir (tapi masih dalam grace period), kirim notifikasi
        if (sub.trialEndsAt && now >= sub.trialEndsAt) {
            if (daysUntilEffectiveEnd <= 7) {
                await sendReminderEmail(siteId, "grace_period_ending", { daysLeft: daysUntilEffectiveEnd });
                result.remindersSent++;
            }
            continue;
        }

        // Subscription akan berakhir dalam waktu dekat - kirim pengingat
        if (sub.endDate && now < sub.endDate) {
            const daysUntilEnd = Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilEnd === 7 || daysUntilEnd === 3 || daysUntilEnd === 1) {
                const template = sub.trialEndsAt ? "trial_expiring_soon" : "subscription_expiring_soon";
                await sendReminderEmail(siteId, template, {
                    daysLeft: daysUntilEnd,
                    planName: sub.plan.name,
                });
                result.remindersSent++;
            }
        }

        // Trial baru saja berakhir
        if (sub.trialEndsAt) {
            const msSinceTrialEnd = now.getTime() - sub.trialEndsAt.getTime();
            const daysSinceTrialEnd = Math.floor(msSinceTrialEnd / (1000 * 60 * 60 * 24));
            if (daysSinceTrialEnd === 0) {
                await sendReminderEmail(siteId, "trial_expired", { daysLeft: GRACE_PERIOD_DAYS });
                result.remindersSent++;
            }
        }
    }

    if (expiredIds.length > 0) {
        const res = await db.subscription.updateMany({
            where: { id: { in: expiredIds } },
            data: { status: "expired" },
        });
        result.updatedToExpired += res.count;
    }

    if (pastDueIds.length > 0) {
        await db.subscription.updateMany({
            where: { id: { in: pastDueIds } },
            data: { status: "past_due" },
        });
    }

    return result;
}

async function sendReminderEmail(
    siteId: string,
    template: string,
    params: Record<string, any>,
) {
    try {
        const ownerInfo = await eventBus.request<any, any>("request.auth.getSiteOwner", { siteId });
        if (!ownerInfo?.email) return;

        const site = await db.site.findUnique({
            where: { id: siteId },
            select: { name: true },
        });

        await eventBus.publish("notification.email.send", {
            template,
            payload: {
                toEmail: ownerInfo.email,
                userName: ownerInfo.name || "Pengguna",
                siteName: site?.name || "Website Anda",
                ...params,
            },
        }, "billing");
    } catch (err) {
        console.error(`[ExpirationService] Failed to send ${template} email:`, err);
    }
}
