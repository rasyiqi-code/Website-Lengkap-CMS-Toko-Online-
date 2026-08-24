import { getUpstash, getRedis } from "@/modules/shared/core/redis";

/**
 * Mendapatkan Redis client yang tersedia.
 * Prioritas: Upstash REST API > ioredis TCP > null
 */
async function getClient() {
    // Prioritaskan Upstash REST API (tidak perlu TCP connection)
    const upstash = await getUpstash();
    if (upstash) return { type: "upstash" as const, client: upstash };
    
    // Fallback ke ioredis TCP
    const redis = await getRedis();
    if (redis) return { type: "ioredis" as const, client: redis };
    
    return null;
}

/**
 * Mendapatkan data dari cache berdasarkan kunci (key) yang diberikan.
 * Mendukung both Upstash REST API dan ioredis.
 */
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        const source = await getClient();
        if (!source) return null;
        
        let data: string | null = null;
        
        if (source.type === "upstash") {
            // Upstash REST API mengembalikan parsed value, perlu di-stringify ulang jika object
            const raw = await source.client.get(key);
            data = typeof raw === "string" ? raw : (raw ? JSON.stringify(raw) : null);
        } else {
            data = await source.client.get(key);
        }
        
        if (!data) return null;
        
        return JSON.parse(data) as T;
    } catch (error) {
        console.error(`[CACHE_GET_ERROR] Key: ${key}`, error);
        return null;
    }
}

/**
 * Menyimpan data ke dalam cache dengan batas waktu kedaluwarsa (TTL).
 * Mendukung both Upstash REST API dan ioredis.
 */
export async function setCache<T>(key: string, value: T, ttlInSeconds = 300): Promise<boolean> {
    try {
        const source = await getClient();
        if (!source) return false;
        
        const serialized = JSON.stringify(value);
        
        if (source.type === "upstash") {
            // Upstash REST API: set dengan EX (expiry in seconds)
            await source.client.set(key, serialized, { ex: ttlInSeconds });
        } else {
            // ioredis: setex (set with expiry)
            await source.client.setex(key, ttlInSeconds, serialized);
        }
        return true;
    } catch (error) {
        console.error(`[CACHE_SET_ERROR] Key: ${key}`, error);
        return false;
    }
}

/**
 * Menghapus data dari cache berdasarkan kunci (key).
 * Mendukung both Upstash REST API dan ioredis.
 */
export async function deleteCache(key: string): Promise<boolean> {
    try {
        const source = await getClient();
        if (!source) return false;
        
        await source.client.del(key);
        return true;
    } catch (error) {
        console.error(`[CACHE_DELETE_ERROR] Key: ${key}`, error);
        return false;
    }
}

/**
 * Pola High-level Cache Aside (Get-or-Set) terdistribusi.
 * Mengambil dari cache terlebih dahulu; jika "miss", eksekusi fungsi pengambilan data segar dan simpan hasilnya ke cache.
 */
export async function getOrSetCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlInSeconds = 300
): Promise<T> {
    const cachedData = await getCache<T>(key);
    if (cachedData !== null) {
        return cachedData;
    }
    
    const freshData = await fetchFn();
    await setCache<T>(key, freshData, ttlInSeconds);
    return freshData;
}
