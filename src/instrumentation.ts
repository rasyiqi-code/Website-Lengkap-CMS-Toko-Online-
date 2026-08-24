// ─── Memory Profiler ──────────────────────────────────────────────────────
// Utility untuk mengukur dan log penggunaan memori di berbagai tahap startup.
// Berguna untuk membandingkan sebelum vs sesudah optimasi.

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function logMemory(label: string) {
  const mem = process.memoryUsage();
  console.log(
    `[MEMORY] ${label}:\n` +
    `  RSS:           ${formatMB(mem.rss)}\n` +
    `  Heap Used:     ${formatMB(mem.heapUsed)}\n` +
    `  Heap Total:    ${formatMB(mem.heapTotal)}\n` +
    `  External:      ${formatMB(mem.external)}\n` +
    `  ArrayBuffers:  ${formatMB(mem.arrayBuffers)}`
  );
}

function logMemoryJSON(label: string) {
  const mem = process.memoryUsage();
  return {
    label,
    rss: formatMB(mem.rss),
    heapUsed: formatMB(mem.heapUsed),
    heapTotal: formatMB(mem.heapTotal),
    external: formatMB(mem.external),
    arrayBuffers: formatMB(mem.arrayBuffers),
  };
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ── Tahap 1: Startup baseline ──
    logMemory("Tahap 0 - Startup (sebelum inisialisasi modul)");

    const { eventBus } = await import("@/modules/shared/core/event-bus");
    logMemory("Tahap 1 - Setelah load event-bus");

    const { initAuthListeners } = await import("@/modules/auth/listeners");
    const { initSiteListeners } = await import("@/modules/site/listeners");
    const { initDomainListeners } = await import("@/modules/domain/listeners");
    const { initInfrastructureListeners } = await import("@/modules/infrastructure/listeners");
    const { initPostListeners } = await import("@/modules/post/listeners");
    const { initMediaListeners } = await import("@/modules/media/listeners");
    const { initPageListeners } = await import("@/modules/page/listeners");
    const { initCatalogListeners } = await import("@/modules/catalog/listeners");
    const { initOrderListeners } = await import("@/modules/order/listeners");
    const { initSubscriptionListeners } = await import("@/modules/subscription/listeners");
    const { initPaymentListeners } = await import("@/modules/payment/listeners");
    const { initFinancialListeners } = await import("@/modules/financial/listeners");
    const { initNotificationListeners } = await import("@/modules/notification/listeners");
    logMemory("Tahap 2 - Setelah load semua listener modules");
    
    // Inisialisasi koneksi broker
    await eventBus.init();
    logMemory("Tahap 3 - Setelah eventBus.init() (Redis connected)");
    
    // Inisialisasi semua listener modul
    await initAuthListeners();
    await initSiteListeners();
    await initDomainListeners();
    await initInfrastructureListeners();
    await initPostListeners();
    await initMediaListeners();
    await initPageListeners();
    await initCatalogListeners();
    await initOrderListeners();
    await initSubscriptionListeners();
    await initPaymentListeners();
    await initFinancialListeners();
    await initNotificationListeners();
    logMemory("Tahap 4 - Setelah inisialisasi semua event listeners");

    // Ringkasan akhir
    const finalMem = logMemoryJSON("FINAL-STARTUP");
    console.log(`\n✅ Startup selesai. Baseline memory: RSS=${finalMem.rss}, Heap=${finalMem.heapUsed}\n`);

    // Inisialisasi periodik outbox dispatcher (setiap 5 detik)
    const { processPendingEvents } = await import("@/modules/shared/core/outbox-dispatcher");
    setInterval(() => {
      processPendingEvents().catch((err) => {
        console.error("[Outbox Worker Error] Failed to process pending events:", err);
      });
    }, 5000);

    // ── Periodic Memory Logger (setiap 60 detik) ──
    // Hanya log di production untuk memantau memory leak
    if (process.env.NODE_ENV === "production") {
      const interval = setInterval(() => {
        const mem = process.memoryUsage();
        const heapUsedMB = mem.heapUsed / 1024 / 1024;
        const rssMB = mem.rss / 1024 / 1024;

        // Hitung batas heap dari NODE_OPTIONS
        const nodeOptions = process.env.NODE_OPTIONS || "";
        const heapLimitMatch = nodeOptions.match(/--max-old-space-size=(\d+)/);
        const heapLimitMB = heapLimitMatch ? parseInt(heapLimitMatch[1]) : null;

        // Warning jika heap usage > 80% dari limit
        if (heapLimitMB && heapUsedMB > heapLimitMB * 0.8) {
          console.warn(
            `[MEMORY WARNING] Heap usage high: ${heapUsedMB.toFixed(1)}MB / ${heapLimitMB}MB (${((heapUsedMB / heapLimitMB) * 100).toFixed(1)}%)`
          );
        }

        // Log ringkas setiap 60 detik
        console.log(
          `[MEMORY] RSS=${rssMB.toFixed(1)}MB | Heap=${heapUsedMB.toFixed(1)}MB | Ext=${(mem.external / 1024 / 1024).toFixed(1)}MB`
        );
      }, 60_000);

      // Prevent interval dari menjaga process hidup
      if (typeof interval.unref === "function") {
        interval.unref();
      }
    }
  }
}
