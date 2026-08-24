import { db } from "@/lib/core/db";

// Lazy import @crediblemark/starsender — hanya dimuat saat kirim WhatsApp
let StarSenderClass: any = null;
async function getStarSender() {
    if (!StarSenderClass) {
        const mod = await import("@crediblemark/starsender");
        StarSenderClass = mod.StarSender;
    }
    return StarSenderClass;
}

/**
 * Sends a WhatsApp text notification to a recipient using the platform's StarSender configuration.
 *
 * @param to Recipient phone number (will be formatted automatically)
 * @param body Message content
 */
export async function sendWhatsAppNotification(to: string, body: string) {
  try {
    // 1. Fetch platform settings
    const platformSettings = await db.platformSettings.findUnique({
      where: { id: "global" }
    });

    if (!platformSettings || !platformSettings.starsenderApiKey) {
      console.warn("[WHATSAPP_NOTIFICATION] StarSender API Key is not configured in Platform Settings.");
      return { success: false, error: "NOT_CONFIGURED" };
    }

    // Use Device Key for message sending if available, otherwise fallback to Account API Key
    const activeKey = platformSettings.starsenderDeviceKey || platformSettings.starsenderApiKey;

    if (!activeKey) {
      console.warn("[WHATSAPP_NOTIFICATION] No active key (Device Key or API Key) found.");
      return { success: false, error: "NO_ACTIVE_KEY" };
    }

    // Clean and format phone number (ensure international prefix e.g., 62 for Indonesia)
    let formattedTo = to.replace(/[^0-9]/g, "");
    if (formattedTo.startsWith("0")) {
      formattedTo = "62" + formattedTo.slice(1);
    } else if (!formattedTo.startsWith("62") && formattedTo.length > 5) {
      // If it doesn't start with 62 but starts with 8 (common in Indo numbers like 812xxx), prefix with 62
      if (formattedTo.startsWith("8")) {
        formattedTo = "62" + formattedTo;
      }
    }

    if (!formattedTo) {
      console.warn("[WHATSAPP_NOTIFICATION] Invalid phone number provided:", to);
      return { success: false, error: "INVALID_PHONE_NUMBER" };
    }

    const StarSender = await getStarSender();
    const starsender = new StarSender(activeKey);
    const result = await starsender.messages.sendText(formattedTo, body);

    console.log(`[WHATSAPP_NOTIFICATION] Message sent successfully to ${formattedTo}.`);
    return { success: true, result };
  } catch (error: any) {
    console.error("[WHATSAPP_NOTIFICATION_ERROR] Failed to send WhatsApp notification:", error);
    return { success: false, error: error.message || error };
  }
}
