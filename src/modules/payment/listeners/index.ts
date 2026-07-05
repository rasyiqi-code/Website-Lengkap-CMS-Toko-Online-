import { eventBus } from "@/modules/shared/core/event-bus";

export async function initPaymentListeners() {
  await eventBus.subscribe("billing.payment.completed", async (data: any, _metadata) => {
    try {
      if (data && data.siteId) {
        const { revalidateTag } = await import("next/cache");
        revalidateTag(`site-${data.siteId}`);
        console.log(`[PaymentListener] Invalidated cache for site: ${data.siteId} following completed payment: ${data.transactionId}`);
      }
    } catch (error) {
      console.error(`[PaymentListener Error] Failed to process billing.payment.completed event:`, error);
    }
  });
}
