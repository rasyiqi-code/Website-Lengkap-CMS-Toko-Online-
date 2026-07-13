import { db } from "@/modules/shared/core/db";

/**
 * Menghitung jumlah pesanan di suatu situs.
 */
export async function countOrders(siteId: string): Promise<number> {
    return db.order.count({
        where: { siteId }
    });
}

/**
 * Mengambil pesanan terbaru untuk suatu situs.
 */
export async function findRecentOrders(siteId: string, limit: number) {
    return db.order.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            customerName: true,
            total: true,
            createdAt: true,
        }
    });
}

/**
 * Mencari pesanan berdasarkan ID beserta item dan situsnya.
 */
export async function findOrderById(orderId: string) {
    return db.order.findUnique({
        where: { id: orderId },
        include: {
            items: true
        }
    });
}

/**
 * Mencari pengaturan pembayaran situs.
 */
export async function findPaymentSettings(siteId: string) {
    return db.paymentSettings.findUnique({
        where: { siteId }
    });
}

/**
 * Memproses transaksi atomic pembayaran pesanan via webhook.
 */
export async function processOrderPayment(orderId: string, siteId: string, amount: number, creditOwner: boolean) {
    return db.$transaction(async (tx) => {
        // 1. Check if already paid (idempotency guard)
        const existing = await tx.order.findUnique({
            where: { id: orderId },
            select: { paymentStatus: true, total: true }
        });
        if (existing?.paymentStatus === "paid") {
            return { success: true, ownerId: null, alreadyPaid: true };
        }

        // 2. Update Order Payment Status
        await tx.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: "paid",
                status: "processing"
            }
        });

        if (creditOwner) {
            // 3. Cari owner situs
            const siteOwner = await tx.siteUser.findFirst({
                where: { siteId, role: "owner" },
                select: { userId: true }
            });

            // 4. Tambahkan ke saldo owner — gunakan amount dari DB, bukan dari webhook
            const dbAmount = Number(existing.total);
            if (siteOwner && dbAmount > 0) {
                await tx.user.update({
                    where: { id: siteOwner.userId },
                    data: {
                        affiliateBalance: {
                            increment: dbAmount
                        }
                    }
                });
                return { success: true, ownerId: siteOwner.userId };
            }
        }

        return { success: true, ownerId: null };
    });
}

/**
 * Mencari daftar produk untuk situs tertentu.
 */
export async function findProductsForSite(siteId: string, productIds: string[]) {
    return db.product.findMany({
        where: {
            id: { in: productIds },
            siteId
        }
    });
}

/**
 * Mengurangi stok base product setelah diorder
 */
export async function decrementProductStock(productId: string, quantity: number) {
    return db.product.update({
        where: { id: productId },
        data: {
            stock: {
                decrement: quantity
            }
        }
    });
}

/**
 * Update JSON variants produk (termasuk stok variant yang ada di dalam array JSON)
 */
export async function updateProductVariants(productId: string, variants: any) {
    return db.product.update({
        where: { id: productId },
        data: {
            variants
        }
    });
}

/**
 * Menambah stok base product (untuk restore)
 */
export async function incrementProductStock(productId: string, quantity: number) {
    return db.product.update({
        where: { id: productId },
        data: {
            stock: {
                increment: quantity
            }
        }
    });
}

/**
 * Mengembalikan stok produk dan varian jika pesanan dibatalkan/expired
 */
export async function restoreOrderStock(orderId: string) {
    const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true }
    });

    if (!order) return;

    // ⚡ Bolt Optimization: Batch fetch products to avoid N+1 query problem.
    // Gathers unique product IDs and fetches them in a single query,
    // mapping them for O(1) lookups instead of executing a query per order item.
    const productIds = Array.from(new Set(order.items.map(item => item.productId)));
    if (productIds.length === 0) return;

    const products = await db.product.findMany({
        where: { id: { in: productIds } }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of order.items) {
        const product = productMap.get(item.productId);
        if (!product) continue;

        if (item.variantName && product.variants) {
            const variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
            let variantUpdated = false;
            if (Array.isArray(variants)) {
                for (const v of variants) {
                    if (v.name === item.variantName) {
                        v.stock = (v.stock || 0) + item.quantity;
                        variantUpdated = true;
                        break;
                    }
                }
            }
            if (variantUpdated) {
                await updateProductVariants(item.productId, variants);
            }
        } else {
            await incrementProductStock(item.productId, item.quantity);
        }
    }
}

/**
 * Membuat entri pesanan baru.
 */
export async function createOrder(data: {
    customerName: string;
    customerEmail: string;
    customerAddress: string;
    total: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    paymentMethod: string;
    siteId: string;
    items: {
        create: Array<{
            productId: string;
            quantity: number;
            price: string;
            variantName?: string;
            attributes?: any;
        }>
    }
}) {
    return db.order.create({
        data,
        include: {
            items: true
        }
    });
}

/**
 * Mencari data situs berdasarkan ID.
 */
export async function findSiteById(id: string) {
    return db.site.findUnique({
        where: { id },
        select: { name: true }
    });
}

/**
 * Mengambil pengaturan platform global.
 */
export async function findPlatformSettings() {
    return db.platformSettings.findUnique({
        where: { id: "global" }
    });
}

/**
 * Memperbarui URL pembayaran dan reference pesanan.
 */
export async function updateOrderPaymentUrl(orderId: string, paymentUrl: string, paymentReference?: string) {
    return db.order.update({
        where: { id: orderId },
        data: {
            paymentUrl,
            paymentReference
        },
        include: {
            items: true
        }
    });
}

/**
 * Memperbarui status pembayaran dan status umum pesanan.
 */
export async function updateOrderPaymentStatus(orderId: string, paymentStatus: string, status?: string) {
    const data: any = { paymentStatus };
    if (status) data.status = status;
    
    return db.order.update({
        where: { id: orderId },
        data
    });
}

/**
 * Mencari pesanan pertama yang cocok dengan ID dan siteId.
 */
export async function findOrderFirst(id: string, siteId: string) {
    return db.order.findFirst({
        where: { id, siteId },
        include: { items: true }
    });
}

/**
 * Memperbarui status fulfillment dan status pembayaran pesanan oleh owner.
 */
export async function updateOrderFulfillment(id: string, data: { paymentStatus?: string, fulfillmentStatus?: string, status?: string }) {
    return db.order.update({
        where: { id },
        data
    });
}

/**
 * Mencari pesanan dengan filter, sorting, pagination, dan seleksi kolom spesifik.
 */
export async function findOrders(where: any, skip: number, take: number) {
    return db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
            id: true,
            customerName: true,
            customerEmail: true,
            total: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            siteId: true,
            paymentMethod: true,
        }
    });
}

/**
 * Menghitung total pesanan dengan filter tertentu.
 */
export async function countOrdersWithFilter(where: any) {
    return db.order.count({ where });
}

