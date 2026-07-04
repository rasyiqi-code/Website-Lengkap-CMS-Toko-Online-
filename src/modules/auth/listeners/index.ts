import { eventBus } from "@/modules/shared/core/event-bus";
import { awardAffiliateCommission } from "../services/affiliate.service";
import { db } from "@/modules/shared/core/db";

/**
 * Menginisialisasi seluruh event listener untuk modul auth.
 */
export async function initAuthListeners() {
  await eventBus.subscribe("affiliate.commission.awarded", async (data: any, _metadata) => {
    try {
      // Idempotency check: skip if commission already exists for this transaction
      if (data.transactionId) {
        const existing = await db.commission.findFirst({
          where: { transactionId: data.transactionId }
        });
        if (existing) {
          return;
        }
      }
      
      // Panggil service modul auth untuk memberikan komisi
      await awardAffiliateCommission(db, {
        userId: data.userId,
        amount: data.amount,
        transactionId: data.transactionId,
        description: data.description
      });
    } catch (error) {
      console.error(`[AuthListener Error] Gagal memproses komisi afiliasi untuk transaksi: ${data.transactionId}:`, error);
    }
  });

  // Reply listener untuk mengambil data pemilik situs
  eventBus.reply<{ siteId: string }, any>(
    "request.auth.getSiteOwner",
    async (data) => {
      const { getSiteOwner } = await import("../services/auth.service");
      return getSiteOwner(data.siteId);
    }
  );

  eventBus.reply<{ userIds: string[] }, any>(
    "request.auth.getUsersMap",
    async (data) => {
      const { getUsersMap } = await import("../services/user.service");
      return getUsersMap(data.userIds);
    }
  );

  eventBus.reply<{ userId: string }, any>(
    "request.auth.getUserById",
    async (data) => {
      const { getUserById } = await import("../services/user.service");
      return getUserById(data.userId);
    }
  );

  eventBus.reply<{ userId: string; referredById: string }, any>(
    "request.auth.updateUserReferrer",
    async (data) => {
      const { updateUserReferrer } = await import("../services/affiliate.service");
      return updateUserReferrer(data.userId, data.referredById);
    }
  );
}
