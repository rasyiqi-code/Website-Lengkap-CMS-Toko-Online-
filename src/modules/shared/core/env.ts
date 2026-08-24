import * as z from "zod";

const isDevelopment = process.env.NODE_ENV === "development" || 
                       process.env.NODE_ENV === "test" || 
                       process.env.IS_E2E === "true" ||
                       process.env.NEXT_PHASE === "phase-production-build" ||
                       process.env.SKIP_ENV_VALIDATION === "true";

const envSchema = z.object({
  // Required in all environments
  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().min(1, "NEXTAUTH_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().min(1, "NEXT_PUBLIC_APP_URL is required"),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1, "NEXT_PUBLIC_ROOT_DOMAIN is required"),

  // Optional with defaults
  DEFAULT_SITE_NAME: z.string().default("My Platform - Platform Website Instan"),
  DEFAULT_SITE_DESC: z.string().default("Bikin website bisnis dan toko online instan dengan mudah. Solusi platform website terbaik untuk UMKM dengan fitur lengkap dan SEO otomatis."),
  DEFAULT_BANK_NAME: z.string().default("Example Bank"),
  DEFAULT_BANK_ACCOUNT: z.string().default("0000000000"),
  DEFAULT_BANK_HOLDER: z.string().default("Store Owner"),
  DEFAULT_CURRENCY: z.string().default("IDR"),
  DEFAULT_INSTRUCTIONS: z.string().default("Please include your order number in the transfer note."),
  DEFAULT_THEME: z.string().default("default"),
  DEFAULT_BRAND_COLOR: z.string().default("#0ea5e9"),

  // Optional - Storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // Optional - Redis
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Optional - Direct connection (bypassing PgBouncer pooler)
  DIRECT_URL: z.string().url().optional(),

  // Optional - Logging
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).optional(),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  DEFAULT_SITE_NAME: process.env.DEFAULT_SITE_NAME,
  DEFAULT_SITE_DESC: process.env.DEFAULT_SITE_DESC,
  DEFAULT_BANK_NAME: process.env.DEFAULT_BANK_NAME,
  DEFAULT_BANK_ACCOUNT: process.env.DEFAULT_BANK_ACCOUNT,
  DEFAULT_BANK_HOLDER: process.env.DEFAULT_BANK_HOLDER,
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY,
  DEFAULT_INSTRUCTIONS: process.env.DEFAULT_INSTRUCTIONS,
  DEFAULT_THEME: process.env.DEFAULT_THEME,
  DEFAULT_BRAND_COLOR: process.env.DEFAULT_BRAND_COLOR,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  REDIS_URL: process.env.REDIS_URL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
});

let envData = parsed.data;

if (!parsed.success) {
  const errorMessages = parsed.error.issues.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
  if (isDevelopment) {
    console.warn("⚠️  Environment validation warnings (build/development mode):");
    console.warn(errorMessages);
    
    // Provide a safe dummy fallback object to prevent build-time import crashes
    envData = {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dummy-secret-at-least-32-characters-long",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000",
      DEFAULT_SITE_NAME: process.env.DEFAULT_SITE_NAME || "My Platform",
      DEFAULT_SITE_DESC: process.env.DEFAULT_SITE_DESC || "Platform Website Instan",
      DEFAULT_BANK_NAME: "Example Bank",
      DEFAULT_BANK_ACCOUNT: "0000000000",
      DEFAULT_BANK_HOLDER: "Store Owner",
      DEFAULT_CURRENCY: "IDR",
      DEFAULT_INSTRUCTIONS: "",
      DEFAULT_THEME: "default",
      DEFAULT_BRAND_COLOR: "#0ea5e9",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    } as any;
  } else {
    console.error("❌ Environment validation failed:");
    console.error(errorMessages);
    throw new Error("Invalid environment variables");
  }
}

export const env = envData!;
