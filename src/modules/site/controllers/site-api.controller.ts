import { NextResponse } from "next/server";
import { getApiContext, apiResponse, apiError, validateBody } from "@/lib/api/utils";
import { getPaymentSettings } from "@/modules/shared/utils/settings/payment";
import { getSiteId } from "@/lib/domains/tenant";
import { z } from "zod";
import { FinancialClient } from "@/modules/financial";
import { SiteClient } from "../index";
import { SubscriptionClient } from "@/modules/subscription";
import { createLogger } from "@/lib/core/logger";
import { db } from "@/modules/shared/core/db";

const healthLogger = createLogger("health");

async function checkDatabase(): Promise<boolean> {
  try {
    return await SiteClient.pingDatabase();
  } catch (error) {
    healthLogger.error({ error }, "Database health check failed");
    return false;
  }
}

async function checkStorage(): Promise<boolean> {
  try {
    const settings = await SubscriptionClient.getPlatformSettings();

    const hasR2Config = !!(
      settings &&
      settings.r2AccountId &&
      settings.r2AccessKeyId &&
      settings.r2SecretAccessKey &&
      settings.r2BucketName
    );
    return hasR2Config;
  } catch (error) {
    healthLogger.error({ error }, "Storage settings health check failed");
    return false;
  }
}

const contactFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    subject: z.string().optional().default("No Subject"),
    message: z.string().min(1, "Message is required"),
    emailTo: z.string().email("Invalid destination email").optional(),
});

/**
 * Handler GET untuk settings.
 */
export async function getSettingsApi() {
    try {
        const { session, siteId } = await getApiContext(undefined, { requireSite: false, isPublic: true });
        const settings = await SiteClient.getSiteSettings(siteId || undefined);

        if (session && siteId) {
            const [domainInfo, billingContext] = await Promise.all([
                SiteClient.getSiteDomainInfo(siteId),
                FinancialClient.getSiteSettingsBillingContext(siteId)
            ]);

            return apiResponse({ 
                ...settings, 
                customDomain: domainInfo?.customDomain,
                customDomainVerified: domainInfo?.customDomainVerified,
                plan: billingContext.activePlanName,
                isTrial: billingContext.isTrial,
                trialEndsAt: billingContext.trialEndsAt,
                planPrice: billingContext.activePlanPrice,
                allPlans: billingContext.allPlans,
                planFeatures: billingContext.planFeatures,
                maxSites: billingContext.maxSites
            });
        }

        return apiResponse(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        return apiError("Failed to fetch settings");
    }
}

/**
 * Handler GET untuk payment settings.
 */
export async function getPaymentSettingsApi() {
    try {
        const { siteId, error, status } = await getApiContext(undefined, { isPublic: true });
        if (error) return apiError(error, status);

        const settings = await getPaymentSettings(siteId);
        return apiResponse(settings || {});
    } catch (_error) {
        return apiError("Failed to fetch settings");
    }
}

/**
 * Handler GET untuk site analytics.
 */
export async function getAnalyticsApi() {
    try {
        const siteId = await getSiteId();
        if (!siteId) return apiResponse({ totalViews: 0, todayViews: 0 });

        const stats = await SiteClient.getOrIncrementViews(siteId);

        return apiResponse(stats);
    } catch (error) {
        console.error("Analytics Route Error:", error);
        return apiError("Internal Error");
    }
}

/**
 * Handler GET untuk health check.
 */
export async function getHealthApi() {
  const globalAny = globalThis as any;
  if (typeof globalAny.Bun !== "undefined" && typeof globalAny.Bun.gc === "function") {
    globalAny.Bun.gc(true);
  }

  const [dbHealthy, storageHealthy] = await Promise.all([
    checkDatabase(),
    checkStorage(),
  ]);

  const isHealthy = dbHealthy;
  const statusCode = isHealthy ? 200 : 503;

  if (!isHealthy) {
    healthLogger.error({ db: dbHealthy }, "Critical database health check failed");
  } else if (!storageHealthy) {
    healthLogger.info({ storage: false }, "Storage (R2) is not configured");
  }

  // ── Memory usage monitoring ──
  const mem = process.memoryUsage();
  const formatBytes = (bytes: number) => {
    const mb = (bytes / 1024 / 1024).toFixed(2);
    return `${mb} MB`;
  };

  // Hitung batas heap dari NODE_OPTIONS (--max-old-space-size)
  const nodeOptions = process.env.NODE_OPTIONS || "";
  const heapLimitMatch = nodeOptions.match(/--max-old-space-size=(\d+)/);
  const heapLimitMB = heapLimitMatch ? parseInt(heapLimitMatch[1]) : null;

  // Hitung persentase penggunaan heap
  const heapUsedMB = mem.heapUsed / 1024 / 1024;
  const heapTotalMB = mem.heapTotal / 1024 / 1024;
  const heapUsagePercent = heapTotalMB > 0 ? ((heapUsedMB / heapTotalMB) * 100).toFixed(1) : "0.0";

  // Warning threshold: jika heap usage > 80% dari heap limit
  const isMemoryHigh = heapLimitMB ? heapUsedMB > heapLimitMB * 0.8 : false;

  if (isMemoryHigh) {
    healthLogger.warn(
      { heapUsedMB: heapUsedMB.toFixed(2), heapLimitMB },
      "High memory usage detected"
    );
  }

  // ── Process info ──
  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeFormatted = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      uptime: uptimeFormatted,
      checks: {
        database: dbHealthy ? "healthy" : "unhealthy",
        storage: storageHealthy ? "configured" : "not-configured",
        memory: isMemoryHigh ? "high" : "normal",
      },
      memory: {
        rss: formatBytes(mem.rss),
        heapUsed: formatBytes(mem.heapUsed),
        heapTotal: formatBytes(mem.heapTotal),
        external: formatBytes(mem.external),
        arrayBuffers: formatBytes(mem.arrayBuffers),
        heapUsagePercent: `${heapUsagePercent}%`,
        heapLimit: heapLimitMB ? `${heapLimitMB} MB` : "not-set",
        // Warning: jika melebihi 80% dari heap limit
        warning: isMemoryHigh ? `Heap usage (${heapUsedMB.toFixed(0)}MB) melebihi 80% dari limit (${heapLimitMB}MB)` : null,
      },
      // Environment info untuk debugging
      environment: {
        nodeEnv: process.env.NODE_ENV || "unknown",
        runtime: typeof globalThis.Bun !== "undefined" ? "bun" : "node",
        pid: process.pid,
        pgbouncer: (process.env.DATABASE_URL || "").includes("pgbouncer=true"),
      },
    },
    { status: statusCode }
  );
}

/**
 * Handler POST untuk contact submission.
 */
export async function postContactApi(req: Request) {
    try {
        const siteId = await getSiteId();
        if (!siteId) {
            return apiError("Site context required", 400);
        }
        
        const { data, error, details, status } = await validateBody(req, contactFormSchema);
        if (error) return apiError(error, status, details);

        const { emailTo: _emailTo, ...submissionData } = data;

        await SiteClient.createContactSubmission(siteId, submissionData);

        return apiResponse({ success: true, message: "Message sent successfully" });
    } catch (error) {
        console.error("Contact Form Error:", error);
        return apiError("Internal Error");
    }
}

/**
 * Handler GET untuk mengambil contact submissions.
 */
export async function getContactApi(_req: Request) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "editor", "owner"]);
        if (error) return apiError(error, status);

        const submissions = await SiteClient.getContactSubmissions(siteId);
        return apiResponse(submissions);
    } catch (error) {
        console.error("Fetch Submissions Error:", error);
        return apiError("Internal Error");
    }
}

const onboardingSchema = z.object({
    siteName: z.string().min(1, "Site name is required"),
    subdomain: z.string().min(1, "Subdomain is required"),
});

/**
 * Handler POST untuk onboarding (membuat site baru).
 */
export async function postOnboardingApi(req: Request) {
    try {
        const { session, error, status } = await getApiContext(undefined, { requireSite: false });
        if (error) return apiError(error, status);
        if (!session?.user?.id) return apiError("Unauthorized", 401);

        const { data, error: vError, details, status: vStatus } = await validateBody(req, onboardingSchema);
        if (vError) return apiError(vError, vStatus, details);

        const normalizedSubdomain = data.subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");

        try {
            await SiteClient.checkSubdomainAvailability(normalizedSubdomain);
        } catch (err: any) {
            if (err.message === "SUBDOMAIN_TAKEN") return apiError("Subdomain already taken", 400);
            throw err;
        }

        const { siteIds, count } = await SiteClient.getUserOwnedSiteCount(session.user.id);
        const limitCheck = await SubscriptionClient.checkUserSitesLimit(siteIds, count);
        if (!limitCheck.allowed) {
            return apiError(limitCheck.message || "Limit tercapai", 403);
        }

        const { InfrastructureClient } = await import("@/modules/infrastructure");
        const site = await InfrastructureClient.provisionSite(session.user.id, data.siteName, normalizedSubdomain);

        return apiResponse({ success: true, site });
    } catch (error) {
        console.error("[ONBOARDING_API] Error:", error);
        return apiError("Failed to create site");
    }
}

/**
 * Handler GET untuk validasi settings (GTM, dll).
 */
export async function validateSettingApi(req: Request) {
    try {
        const { error, status } = await getApiContext(["admin", "owner", "editor"], { requireSite: false });
        if (error) return apiError(error, status);

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const value = searchParams.get("value")?.trim();

        if (!type || !value) {
            return NextResponse.json({ valid: false, error: "Missing type or value parameter" }, { status: 400 });
        }

        if (type === "gtm") {
            if (!/^GTM-[A-Z0-9]{4,8}$/.test(value)) {
                return NextResponse.json({ valid: false });
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const res = await fetch(`https://www.googletagmanager.com/gtm.js?id=${value}`, {
                    method: "HEAD",
                    signal: controller.signal,
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                });
                clearTimeout(timeoutId);
                return NextResponse.json({ valid: res.status === 200 });
            } catch (err) {
                console.warn("[ValidateGTM:FetchError]", err);
                return NextResponse.json({ valid: false });
            }
        }

        return NextResponse.json({ valid: false, error: "Unsupported validation type" }, { status: 400 });
    } catch (err) {
        console.error("[ValidateRouteError]", err);
        return apiError("Internal server error", 500);
    }
}

/**
 * Handler GET untuk admin settings.
 */
export async function getAdminSettingsApi() {
    try {
        const { error, status } = await getApiContext(["admin"], { requireSite: false });
        if (error) return apiError(error, status);

        const settings = await SiteClient.getSiteSettings();
        return apiResponse(settings);
    } catch (error) {
        console.error("Admin Settings Error:", error);
        return apiError("Failed to fetch admin settings");
    }
}

/**
 * Handler GET untuk mengambil detail site oleh admin.
 */
export async function getAdminSiteApi(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error, status } = await getApiContext(["admin"], { requireSite: false });
        if (error) return apiError(error, status);

        const { id } = await params;
        const site = await SiteClient.getSiteDetail(id);
        if (!site) return apiError("Site not found", 404);

        return apiResponse(site);
    } catch (error) {
        console.error("Admin Site Error:", error);
        return apiError("Failed to fetch site");
    }
}

/**
 * Handler POST untuk search endpoint.
 */
export async function searchApi(req: Request) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "owner", "editor", "user"]);
        if (error) return apiError(error, status);

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q");

        if (!q) return apiResponse([]);

        const { PostClient } = await import("@/modules/post");
        const results = await PostClient.searchAll(siteId, q);
        return apiResponse(results);
    } catch (error) {
        console.error("Search API Error:", error);
        return apiError("Search failed");
    }
}

/**
 * Handler PATCH untuk update site settings.
 */
export async function updateSettingsApi(req: Request) {
    try {
        const { error: authError, status: authStatus, siteId } = await getApiContext(["admin", "owner"], { requireSite: true });
        if (authError || !siteId) return apiError(authError || "Unauthorized", authStatus);

        const body = await req.json();
        const { customDomain: _, ...settingsData } = body;

        const updatedSettings = await SiteClient.updateSiteSettings(settingsData, siteId);

        const currentSite = await db.site.findUnique({
            where: { id: siteId },
            select: { customDomain: true }
        });

        return apiResponse({ ...updatedSettings, customDomain: currentSite?.customDomain });
    } catch (error) {
        console.error("Error updating settings:", error);
        return apiError("Failed to update settings");
    }
}

/**
 * Handler POST untuk update payment settings.
 */
export async function updatePaymentSettingsApi(req: Request) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "editor", "owner"]);
        if (error) return apiError(error, status);

        const body = await req.json();
        const {
            bankName, accountNumber, accountHolder, instructions, currency,
            paymentGateway, gatewayMerchantId, gatewayClientKey, gatewayApiKey,
            gatewaySandbox, gatewayEnabled, manualEnabled
        } = body;

        await db.paymentSettings.upsert({
            where: { siteId },
            update: {
                bankName, accountNumber, accountHolder, currency, instructions,
                paymentGateway, gatewayMerchantId, gatewayClientKey, gatewayApiKey,
                gatewaySandbox, gatewayEnabled, manualEnabled,
                updatedAt: new Date()
            },
            create: {
                siteId, bankName, accountNumber, accountHolder, currency, instructions,
                paymentGateway, gatewayMerchantId, gatewayClientKey, gatewayApiKey,
                gatewaySandbox, gatewayEnabled, manualEnabled
            }
        });

        return apiResponse({ success: true });
    } catch (error) {
        console.error("Payment settings error:", error);
        return apiError("Failed to save settings");
    }
}

/**
 * Handler PATCH untuk update admin settings platform.
 */
export async function updateAdminSettingsApi(req: Request) {
    try {
        const { error, status } = await getApiContext(["admin"], { requireSite: false });
        if (error) return apiError(error, status);

        const body = await req.json();
        const storage = body.storage;

        const adminSite = await db.site.findUnique({ where: { subdomain: "admin" } });
        if (!adminSite) return apiError("Platform admin site not found", 404);

        if (body.siteName) {
            await SubscriptionClient.updateAdminSiteBranding(adminSite.id, {
                siteName: body.siteName,
                contactEmail: body.contactEmail,
                contactPhone: body.contactPhone,
                whatsappNumber: body.whatsappNumber,
                footerAddress: body.footerAddress,
                allowRegistration: body.allowRegistration,
            });
        }

        if (body.plans && Array.isArray(body.plans)) {
            await SubscriptionClient.upsertPlans(body.plans);
        }

        if (body.paymentMethods && Array.isArray(body.paymentMethods)) {
            await SubscriptionClient.updateAdminPaymentMethods(adminSite.id, body.paymentMethods);
        }

        if (storage) {
            await SubscriptionClient.updatePlatformSettings({
                r2AccessKeyId: storage.accessKeyId,
                r2SecretAccessKey: storage.secretAccessKey,
                r2BucketName: storage.bucketName,
                r2PublicDomain: storage.publicDomain,
                r2Endpoint: storage.endpoint,
                affiliateCommissionRate: body.affiliateCommissionRate,
                affiliateRecurringCommission: body.affiliateRecurringCommission,
                affiliateRecurringCommissionRate: body.affiliateRecurringCommissionRate,
                paymentGateway: body.paymentGateway,
                gatewayMerchantId: body.gatewayMerchantId,
                gatewayClientKey: body.gatewayClientKey,
                gatewayApiKey: body.gatewayApiKey,
                gatewaySandbox: body.gatewaySandbox,
                gatewayApiType: body.gatewayApiType,
                aiProvider: body.aiProvider,
                aiApiKey: body.aiApiKey,
                starsenderApiKey: body.starsenderApiKey,
                starsenderDeviceKey: body.starsenderDeviceKey,
                resendApiKey: body.resendApiKey,
                emailSenderName: body.emailSenderName,
                emailSenderAddress: body.emailSenderAddress,
            });
        }

        const { revalidatePath, revalidateTag } = await import("next/cache");
        revalidateTag("platform", "default");
        revalidateTag("pricing-plans", "default");
        revalidatePath("/pricing");
        revalidatePath("/about");
        revalidatePath("/contact");

        return apiResponse({ success: true, message: "Settings updated" });
    } catch (e) {
        console.error("Update Admin Settings Error:", e);
        return apiError("Failed to update platform settings");
    }
}

/**
 * Handler POST untuk fetch AI models by provider.
 */
export async function fetchAiModelsApi(req: Request) {
    try {
        const { error, status } = await getApiContext(["admin"]);
        if (error) return NextResponse.json({ error }, { status });

        const { provider, apiKey } = await req.json();
        if (!apiKey || !apiKey.trim()) {
            return NextResponse.json({ models: [] });
        }

        const trimmedKey = apiKey.trim();
        let models: string[] = [];

        if (provider === "gemini") {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`);
            if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data.models)) {
                models = data.models
                    .map((m: any) => m.name.replace(/^models\//, ""))
                    .filter((name: string) => name.includes("gemini") || name.includes("text"));
            }
        } else {
            const urls: Record<string, string> = {
                openai: "https://api.openai.com/v1/models",
                openrouter: "https://openrouter.ai/api/v1/models",
                groq: "https://api.groq.com/openai/v1/models",
                nvidia: "https://integrate.api.nvidia.com/v1/models",
            };
            const url = urls[provider] || "https://api.openai.com/v1/models";

            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${trimmedKey}` },
            });

            if (!res.ok) throw new Error(`${provider} API returned status ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data.data)) {
                models = data.data.map((m: any) => m.id);
            }
        }

        models.sort();
        return NextResponse.json({ models });
    } catch (err: any) {
        console.error("Fetch models error:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch models" }, { status: 500 });
    }
}

/**
 * Handler DELETE untuk menghapus site oleh admin.
 */
export async function deleteAdminSiteApi(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error, status } = await getApiContext(["admin"], { requireSite: false });
        if (error) return apiError(error, status);

        const { id } = await params;
        if (!id) return apiError("Site ID required", 400);

        await SiteClient.deleteSite(id);
        return apiResponse({ success: true, message: "Site deleted successfully" });
    } catch (e) {
        console.error("Delete Site Error:", e);
        return apiError("Failed to delete site");
    }
}

/**
 * Handler PATCH untuk update site oleh admin (set_free / extend_trial).
 */
export async function updateAdminSiteApi(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { error, status } = await getApiContext(["admin"], { requireSite: false });
        if (error) return apiError(error, status);

        const { id } = await params;
        const body = await req.json();
        const { action, days } = body;

        if (action === "set_free") {
            const result = await FinancialClient.setSiteToFreePlan(id);
            return apiResponse(result);
        }

        if (action === "extend_trial") {
            const result = await FinancialClient.extendSiteTrial(id, days ?? 7);
            return apiResponse(result);
        }

        return apiError("Invalid action", 400);
    } catch (e) {
        console.error("Patch Site Error:", e);
        return apiError("Failed to update site");
    }
}
