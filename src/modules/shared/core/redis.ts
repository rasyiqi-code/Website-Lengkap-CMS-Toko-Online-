import { env } from "./env";

// ─── Upstash REST API Client (untuk caching) ───────────────────────────────
// Upstash REST API bekerja tanpa TCP connection — cocok untuk serverless/edge.
// Digunakan untuk operasi caching (get, set, del) yang tidak memerlukan pub/sub.
let upstashClient: any = null;

export async function getUpstash() {
    if (upstashClient) return upstashClient;
    
    // Check for Upstash env vars
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!restUrl || !restToken) return null;
    
    try {
        const { Redis } = await import("@upstash/redis");
        upstashClient = new Redis({
            url: restUrl,
            token: restToken,
        });
        return upstashClient;
    } catch (error) {
        console.warn("[Upstash] Failed to initialize:", error);
        return null;
    }
}

// ─── ioredis TCP Client (untuk pub/sub & fallback) ─────────────────────────
// ioredis TCP dibutuhkan untuk Redis Pub/Sub (EventBus).
// Jika Upstash tersedia, ioredis hanya dipakai untuk pub/sub.
let redisInstance: any = null;
let isRedisConnectionFailed = false;
let lastConnectionAttempt = 0;
const RETRY_COOLDOWN = 30000; // 30 seconds

// Helper to determine if Redis is configured
export const isRedisAvailable = !!(env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);

/**
 * Gets the active Redis instance (ioredis TCP).
 * Resolves lazily to ensure compatibility with Next.js compilation, HMR, and Edge routing.
 */
export async function getRedis() {
    if (!env.REDIS_URL) return null;
    
    const now = Date.now();
    if (isRedisConnectionFailed && (now - lastConnectionAttempt < RETRY_COOLDOWN)) {
        return null;
    }
    
    if (redisInstance) return redisInstance;

    // Check if running in Edge Runtime
    const isEdge = typeof process === "undefined" || !process.versions || !process.versions.node;
    if (isEdge) {
        // TCP Sockets are disabled in Edge Runtime.
        // Fall back to memory or log warning.
        return null;
    }

    try {
        lastConnectionAttempt = now;
        const { default: Redis } = await import("ioredis");
        
        redisInstance = new Redis(env.REDIS_URL!, {
            maxRetriesPerRequest: 0, // Fail fast
            connectTimeout: 1000,    // 1 second connection timeout
            reconnectOnError: (err) => {
                const targetError = "READONLY";
                if (err.message.slice(0, targetError.length) === targetError) {
                    return true;
                }
                return false;
            }
        });

        redisInstance.on("error", (err: any) => {
            console.warn("[Redis Connection Warning]:", err.message || err);
            isRedisConnectionFailed = true;
            if (redisInstance) {
                try {
                    redisInstance.disconnect();
                } catch (_) {}
                redisInstance = null;
            }
        });

        redisInstance.on("connect", () => {
            isRedisConnectionFailed = false;
        });

        return redisInstance;
    } catch (error) {
        console.error("Failed to load ioredis dynamic import:", error);
        isRedisConnectionFailed = true;
        redisInstance = null;
        return null;
    }
}
