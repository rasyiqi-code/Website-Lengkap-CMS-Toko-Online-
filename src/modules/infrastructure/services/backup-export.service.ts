import { db } from "@/modules/shared/core/db";

export interface BackupData {
    metadata: {
        version: string;
        exportedAt: string;
        generator: string;
    };
    data: {
        plans: any[];
        users: any[];
        accounts: any[];
        sessions: any[];
        verificationTokens: any[];
        sites: any[];
        siteSettings: any[];
        siteStatistics: any[];
        paymentSettings: any[];
        subscriptions: any[];
        coupons: any[];
        paymentTransactions: any[];
        commissions: any[];
        withdrawals: any[];
        contactSubmissions: any[];
        galleryItems: any[];
        portfolioItems: any[];
        testimonials: any[];
        mediaFolders: any[];
        mediaItems: any[];
        credBuildPages: any[];
        posts: any[];
        products: any[];
        orders: any[];
        orderItems: any[];
        taxonomies: any[];
        terms: any[];
        menus: any[];
        menuItems: any[];
        metaData: any[];
        seoMetas: any[];
        platformSettings: any[];
    };
}

/**
 * Batas jumlah record per batch query untuk mencegah peak memory tinggi.
 * Tabel besar (mediaItems, posts, orders, dll) akan di-query secara kursor-based.
 */
const BATCH_SIZE = 1000;

/**
 * Tabel yang dianggap "besar" dan perlu cursor-based pagination.
 * Tabel lain cukup di-query sekali saja karena ukurannya kecil.
 */
const LARGE_TABLES = new Set([
    "mediaItem",
    "post",
    "order",
    "orderItem",
    "metaData",
    "session",
    "account",
    "subscription",
    "paymentTransaction",
    "commission",
    "withdrawal",
    "contactSubmission",
    "galleryItem",
    "portfolioItem",
    "testimonial",
]);

/**
 * Helper: Fetch semua record dari tabel besar menggunakan cursor-based pagination.
 * Memori dipecah per batch (BATCH_SIZE records) dan di-release setelah di-push ke accumulator.
 */
async function fetchLargeTable<T extends { id: string }>(
    findMany: (args: { take: number; skip: number; orderBy: { id: "asc" } }) => Promise<T[]>,
): Promise<T[]> {
    const allRecords: T[] = [];
    let skip = 0;

    while (true) {
        const batch = await findMany({
            take: BATCH_SIZE,
            skip,
            orderBy: { id: "asc" },
        });

        if (batch.length === 0) break;

        allRecords.push(...batch);

        // Jika batch kurang dari BATCH_SIZE, berarti sudah habis
        if (batch.length < BATCH_SIZE) break;

        skip += BATCH_SIZE;
    }

    return allRecords;
}

/**
 * Helper: Fetch semua record dari tabel kecil (sekali query saja).
 */
async function fetchSmallTable<T>(
    findMany: () => Promise<T[]>,
): Promise<T[]> {
    return findMany();
}

/**
 * Helper: Fetch sites dengan userIds (relasi many-to-many via siteUser).
 */
async function fetchSitesWithUsers(): Promise<any[]> {
    const sites = await db.site.findMany();
    const allSiteUsers = await db.siteUser.findMany({
        select: { siteId: true, userId: true },
    });

    // Group siteUsers by siteId untuk menghindari O(n*m) lookup
    const siteUserMap = new Map<string, string[]>();
    for (const su of allSiteUsers) {
        const existing = siteUserMap.get(su.siteId);
        if (existing) {
            existing.push(su.userId);
        } else {
            siteUserMap.set(su.siteId, [su.userId]);
        }
    }

    return sites.map((site) => ({
        ...site,
        userIds: siteUserMap.get(site.id) || [],
    }));
}

/**
 * Helper: Fetch terms dengan postIds (relasi many-to-many implicit).
 */
async function fetchTermsWithPosts(): Promise<any[]> {
    const terms = await db.term.findMany({
        include: {
            posts: { select: { id: true } },
        },
    });

    return terms.map((term) => {
        const { posts: termPosts, ...termFields } = term;
        return {
            ...termFields,
            postIds: termPosts.map((p) => p.id),
        };
    });
}

// ─── Streaming Backup Export ─────────────────────────────────────────

/**
 * Setiap entry berisi: nama field di JSON output, dan fungsi async yang mengembalikan data.
 * Order penting karena ditulis berurutan ke stream.
 */
type TableEntry = [string, () => Promise<any[]>];

/**
 * Daftar semua tabel yang diekspor, dikelompokkan per batch untuk mengontrol parallelism.
 *
 * Strategi:
 * - Tabel kecil: boleh di-parallel (batch kecil)
 * - Tabel besar: di-sequential karena menggunakan cursor pagination
 *
 * Setiap batch hanya berisi tabel yang aman di-parallel (semua kecil),
 * atau tabel besar yang di-sequential satu per satu.
 */
function getTableEntries(): TableEntry[] {
    return [
        // ── Batch 1: Tabel referensi kecil ──
        ["plans", () => fetchSmallTable(() => db.plan.findMany())],
        ["users", () => fetchSmallTable(() => db.user.findMany())],

        // ── Batch 2: Auth tables ──
        ["accounts", () => fetchSmallTable(() => db.account.findMany())],
        ["sessions", () => fetchLargeTable((args) => db.session.findMany(args) as any)],
        ["verificationTokens", () => fetchSmallTable(() => db.verificationToken.findMany())],

        // ── Batch 3: Site settings ──
        ["sites", () => fetchSitesWithUsers()],
        ["siteSettings", () => fetchSmallTable(() => db.siteSettings.findMany())],
        ["siteStatistics", () => fetchSmallTable(() => db.siteStatistics.findMany())],
        ["paymentSettings", () => fetchSmallTable(() => db.paymentSettings.findMany())],

        // ── Batch 4: Subscriptions & payments ──
        ["subscriptions", () => fetchLargeTable((args) => db.subscription.findMany(args) as any)],
        ["coupons", () => fetchSmallTable(() => db.coupon.findMany())],
        ["paymentTransactions", () => fetchLargeTable((args) => db.paymentTransaction.findMany(args) as any)],
        ["commissions", () => fetchLargeTable((args) => db.commission.findMany(args) as any)],
        ["withdrawals", () => fetchLargeTable((args) => db.withdrawal.findMany(args) as any)],

        // ── Batch 5: Content & submissions ──
        ["contactSubmissions", () => fetchLargeTable((args) => db.contactSubmission.findMany(args) as any)],
        ["galleryItems", () => fetchLargeTable((args) => db.galleryItem.findMany(args) as any)],
        ["portfolioItems", () => fetchLargeTable((args) => db.portfolioItem.findMany(args) as any)],
        ["testimonials", () => fetchLargeTable((args) => db.testimonial.findMany(args) as any)],

        // ── Batch 6: Media ──
        ["mediaFolders", () => fetchSmallTable(() => db.mediaFolder.findMany())],
        ["mediaItems", () => fetchLargeTable((args) => db.mediaItem.findMany(args) as any)],

        // ── Batch 7: Pages & posts ──
        ["credBuildPages", () => fetchSmallTable(() => db.credBuildPage.findMany())],
        ["posts", () => fetchLargeTable((args) => db.post.findMany(args) as any)],

        // ── Batch 8: Products & orders ──
        ["products", () => fetchSmallTable(() => db.product.findMany())],
        ["orders", () => fetchLargeTable((args) => db.order.findMany(args) as any)],
        ["orderItems", () => fetchLargeTable((args) => db.orderItem.findMany(args) as any)],

        // ── Batch 9: Taxonomy & menus ──
        ["taxonomies", () => fetchSmallTable(() => db.taxonomy.findMany())],
        ["terms", () => fetchTermsWithPosts()],
        ["menus", () => fetchSmallTable(() => db.menu.findMany())],
        ["menuItems", () => fetchSmallTable(() => db.menuItem.findMany())],

        // ── Batch 10: Metadata ──
        ["metaData", () => fetchLargeTable((args) => db.metaData.findMany(args) as any)],
        ["seoMetas", () => fetchSmallTable(() => db.seoMeta.findMany())],
        ["platformSettings", () => fetchSmallTable(() => db.platformSettings.findMany())],
    ];
}

/**
 * Membuat ReadableStream yang mem-produce JSON backup secara streaming.
 *
 * Strategi memori:
 * - Setiap tabel di-query, di-serialize ke JSON, lalu di-write ke stream
 * - Setelah di-write, referensi data di-release (GC bisa mengambil alih)
 * - Peak memory ≈ ukuran 1 tabel terbesar + 1 batch cursor + stream buffer
 *   (vs sebelumnya: SEMUA 30 tabel sekaligus)
 */
export function createBackupStream(): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            try {
                const metadata = {
                    version: "1.0",
                    exportedAt: new Date().toISOString(),
                    generator: "SitusBisnis Backup Engine",
                };

                // Tulis header JSON
                controller.enqueue(encoder.encode(JSON.stringify({ metadata, data: {} }, null, 2).replace('"data": {}', '"data": {')));

                const tableEntries = getTableEntries();
                let isFirstTable = true;

                for (const [fieldName, fetchFn] of tableEntries) {
                    // Fetch data tabel (menggunakan cursor pagination untuk tabel besar)
                    const records = await fetchFn();

                    // Tulis field ke stream
                    const prefix = isFirstTable ? "\n" : ",\n";
                    const chunk = `${prefix}    ${JSON.stringify(fieldName)}: ${JSON.stringify(records, null, 6).split("\n").join("\n    ")}`;
                    controller.enqueue(encoder.encode(chunk));

                    // Release referensi agar GC bisa mengambil alih
                    records.length = 0;

                    isFirstTable = false;
                }

                // Tutup JSON object
                controller.enqueue(encoder.encode("\n  }\n}"));

                controller.close();
            } catch (error) {
                console.error("Export Backup Stream Error:", error);
                controller.error(new Error("Failed to stream backup data: " + (error as Error).message));
            }
        },
    });
}

/**
 * Exports all database records into a single structured JSON object.
 *
 * ⚠️ DEPRECATED: Gunakan createBackupStream() untuk backup besar.
 * Fungsi ini tetap disediakan untuk backward compatibility (event bus reply handler).
 *
 * Menggunakan sequential batching untuk mengurangi peak memory:
 * - Tabel besar menggunakan cursor pagination (BATCH_SIZE records per query)
 * - Semua tabel di-sequential, bukan parallel (mengurangi peak connection + memory)
 */
export async function exportBackupData(): Promise<BackupData> {
    try {
        const metadata = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            generator: "SitusBisnis Backup Engine",
        };

        const data: Record<string, any[]> = {};
        const tableEntries = getTableEntries();

        // Sequential execution — setelah satu tabel selesai, data sebelumnya bisa di-GC
        for (const [fieldName, fetchFn] of tableEntries) {
            data[fieldName] = await fetchFn();
        }

        return {
            metadata,
            data: data as BackupData["data"],
        };
    } catch (error) {
        console.error("Export Backup Error:", error);
        throw new Error("Failed to export database backup data: " + (error as Error).message);
    }
}
