import * as Sentry from "@sentry/nextjs";

// Lazy init: hanya inisialisasi Sentry jika DSN dikonfigurasi untuk menghemat ~20-50MB RAM di client
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Kurangi trace rate di production menjadi 1% untuk menghemat performa RAM/CPU client browser
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 1.0,
    // Kurangi perekaman sesi (Session Replays) di production menjadi 1% untuk menghemat RAM/bandwidth client browser
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
