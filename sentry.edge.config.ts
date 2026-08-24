import * as Sentry from "@sentry/nextjs";

// Lazy init: hanya inisialisasi Sentry jika DSN dikonfigurasi untuk menghemat ~10-20MB RAM
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Kurangi trace rate edge/middleware di production menjadi 1% untuk menghemat performa
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 1.0,
    environment: process.env.NODE_ENV || "development",
  });
}
