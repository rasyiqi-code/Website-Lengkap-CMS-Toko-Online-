import { eventBus } from "@/modules/shared/core/event-bus";
import { getCache, setCache, deleteCache } from "@/modules/infrastructure/services/cache.service";

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    fromCache?: boolean;
}

export function buildPagination(searchParams: URLSearchParams): PaginationParams {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50")));
    return { page, limit, skip: (page - 1) * limit };
}

/**
 * Fetch data dengan Redis caching (distributed cache).
 * 
 * Strategi:
 * 1. Cek Redis cache terlebih dahulu
 * 2. Jika cache miss, fetch dari database
 * 3. Simpan hasil ke Redis dengan TTL
 * 4. Return data + flag `fromCache` untuk debugging
 * 
 * TTL default: 300 detik (5 menit)
 * Cache key format: cache:{cacheKey}
 */
export async function fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    _tags: string[],  // Tags tidak dipakai di Redis, tapi dipertahankan untuk backward compat
    ttlInSeconds = 300
): Promise<T & { fromCache?: boolean }> {
    const redisKey = `cache:${cacheKey}`;
    
    // 1. Coba ambil dari Redis cache
    const cached = await getCache<T>(redisKey);
    if (cached !== null) {
        return { ...cached, fromCache: true } as T & { fromCache?: boolean };
    }
    
    // 2. Cache miss — fetch dari database
    const freshData = await fetchFn();
    
    // 3. Simpan ke Redis cache
    await setCache(redisKey, freshData, ttlInSeconds);
    
    return { ...freshData, fromCache: false } as T & { fromCache?: boolean };
}

/**
 * Invalidate cache berdasarkan pattern.
 * Digunakan saat data di-update/delete untuk memastikan cache selalu fresh.
 * 
 * Contoh:
 * - invalidateCache("post-list-site-123") → hapus semua cache post untuk site 123
 * - invalidateCache("product-list-site-123") → hapus semua cache product untuk site 123
 */
export async function invalidateCache(pattern: string): Promise<void> {
    try {
        const { getRedis } = await import("@/modules/shared/core/redis");
        const redis = await getRedis();
        if (!redis) return;
        
        // Cari semua key yang match pattern
        const keys = await redis.keys(`cache:${pattern}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        // Silent fail — cache invalidation gagal tidak kritis
    }
}

export async function publishCrudEvent(event: string, model: string, siteId: string, item: any): Promise<void> {
    try {
        await eventBus.publish(event, { model, siteId, item }, "crud");
    } catch (err) {
        console.error(`Event publish error [${event}]:`, err);
    }
}

export async function checkResourceLimit(siteId: string, limitType: string): Promise<{ allowed: boolean; message: string }> {
    return eventBus.request<{ siteId: string; limitType: string }, { allowed: boolean; message: string }>(
        "request.billing.checkLimit",
        { siteId, limitType }
    );
}
