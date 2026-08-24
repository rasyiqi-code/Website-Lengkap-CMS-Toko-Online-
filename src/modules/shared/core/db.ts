import { PrismaClient } from "@prisma/client";

const createPrismaClient = () => {
    let dbUrl = process.env.DATABASE_URL || "";
    const isDev = process.env.NODE_ENV === "development";
    
    // Deteksi PgBouncer — jika ada, gunakan connection_limit rendah karena PgBouncer sudah menangani pooling
    const isPgBouncer = dbUrl.includes("pgbouncer=true");
    
    // Default: 2 koneksi untuk PgBouncer (sudah ada pooling), 10 koneksi untuk direct connection
    // Override: DATABASE_CONNECTION_LIMIT env var (highest priority)
    const defaultLimit = isPgBouncer ? 2 : (isDev ? 5 : 10);
    const limit = process.env.DATABASE_CONNECTION_LIMIT 
        ? parseInt(process.env.DATABASE_CONNECTION_LIMIT) 
        : defaultLimit;
    const timeout = isDev ? 30 : 15;
    
    if (dbUrl) {
        if (!dbUrl.includes("connection_limit")) {
            const separator = dbUrl.includes("?") ? "&" : "?";
            dbUrl = `${dbUrl}${separator}connection_limit=${limit}&pool_timeout=${timeout}`;
        }
        // Self-healing DIHAPUS: Jika connection_limit sudah ada di URL, hormati nilainya.
        // PgBouncer users sering set connection_limit=1 atau 2 di URL mereka — jangan override.
        // DATABASE_CONNECTION_LIMIT env var masih bisa override via kode di atas jika memang perlu.

        if (!dbUrl.includes("pool_timeout")) {
            const separator = dbUrl.includes("?") ? "&" : "?";
            dbUrl = `${dbUrl}${separator}pool_timeout=${timeout}`;
        }
    }
    
    return new PrismaClient({
        datasources: {
            db: {
                url: dbUrl,
            },
        },
        log: isDev ? ["error", "warn"] : ["error"],
    });
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof createPrismaClient> | undefined;
} & typeof global;

// Use globalThis pattern to prevent connection proliferation during HMR
// This ensures only ONE PrismaClient instance exists across all hot reloads
export const db: PrismaClient = globalThis.prismaGlobal ?? createPrismaClient();
globalThis.prismaGlobal = db;

