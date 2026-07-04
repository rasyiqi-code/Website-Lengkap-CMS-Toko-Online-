import { db } from "@/modules/shared/core/db";
import { Resend } from "resend";

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Generic helper to send email via Resend (configured from Admin Settings in Database)
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: SendEmailPayload) {
  try {
    // 1. Fetch platform settings from database
    const platformSettings = await db.platformSettings.findUnique({
      where: { id: "global" }
    });

    const apiKey = platformSettings?.resendApiKey;
    const defaultSenderName = platformSettings?.emailSenderName || "SitusBisnis";
    const defaultSenderAddress = platformSettings?.emailSenderAddress || "noreply@situsbisnis.com";

    // Build sender address (use custom if provided, otherwise default settings)
    const activeFrom = from || `${defaultSenderName} <${defaultSenderAddress}>`;

    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY_NOT_CONFIGURED" };
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: activeFrom,
      to,
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error("[EMAIL_SERVICE_ERROR] Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error("[EMAIL_SERVICE_EXCEPTION] Failed to send email:", error);
    return { success: false, error: error.message || error };
  }
}
