import { db } from "@/modules/shared/core/db";
import { z } from "zod";
import { buildPagination, fetchWithCache, publishCrudEvent, checkResourceLimit, invalidateCache } from "@/modules/shared/core/crud-base";
import * as productRepo from "../repositories/product.repository";
import { deleteMediaByUrl } from "@/modules/media";

export const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Invalid slug format"),
    description: z.string().optional(),
    price: z.coerce.number().positive("Price must be a positive number"),
    originalPrice: z.coerce.number().positive("Price must be a positive number").optional().nullable(),
    stock: z.coerce.number().int().nonnegative("Stock cannot be negative").optional().default(0),
    images: z.array(z.string()).optional().default([]),
    productId: z.string().optional(),
    variants: z.any().optional(),
    variantOptions: z.any().optional(),
    metaData: z.array(z.object({
        key: z.string(),
        value: z.string().optional().nullable(),
        type: z.string().optional().default("text")
    })).optional(),
});

const listSelect = {
    id: true, name: true, slug: true, price: true, originalPrice: true,
    currency: true, stock: true, isArchived: true, createdAt: true, images: true,
} as const;

function transformData(data: Record<string, unknown>, _session?: unknown): Record<string, unknown> {
    const { productId: _productId, ...rest } = data;
    return rest;
}

export async function listProducts(
    siteId: string,
    searchParams: URLSearchParams,
    isPublic = true
) {
    const { page, limit, skip } = buildPagination(searchParams);

    const isAdminOrEditor = false;
    const includeArchived = searchParams.get("includeArchived") === "true";
    const where: Record<string, unknown> = {};
    if (!(isAdminOrEditor && includeArchived)) {
        where.isArchived = false;
    }

    const pagination = { page, limit, skip };

    let result: { total: number; items: unknown[] };

    if (isPublic && siteId) {
        const cacheKey = `product-list-${siteId}-${page}-${limit}-${JSON.stringify(where)}`;
        result = await fetchWithCache(
            cacheKey,
            async () => {
                const total = await productRepo.countProducts(siteId, where as any);
                const items = await productRepo.findProducts(siteId, pagination, where as any, listSelect as any);
                return { total, items };
            },
            [`site-${siteId}`, `site-${siteId}-product`],
            300
        );
    } else {
        const total = await productRepo.countProducts(siteId, where as any);
        const items = await productRepo.findProducts(siteId, pagination, where as any, listSelect as any);
        result = { total, items };
    }

    return {
        data: result.items,
        products: result.items,
        pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit)
        }
    };
}

export async function createProduct(
    siteId: string,
    body: unknown,
    session?: unknown
) {
    const validation = productSchema.safeParse(body);
    if (!validation.success) {
        return { success: false, error: "Validation failed", details: validation.error.format(), status: 400 };
    }

    const { metaData, ...data } = validation.data;
    const finalData = transformData(data as unknown as Record<string, unknown>, session);

    const limitCheck = await checkResourceLimit(siteId, "maxProducts");
    if (!limitCheck.allowed) {
        return { success: false, error: limitCheck.message, status: 403 };
    }

    const created = await productRepo.createProduct(finalData as any, siteId);

    if (created && metaData && Array.isArray(metaData)) {
        await db.metaData.createMany({
            data: metaData.map((m) => ({
                key: m.key,
                value: m.value ?? "",
                type: m.type || "text",
                productId: created.id
            }))
        });
    }

    await publishCrudEvent("crud.created", "product", siteId, created);
    
    // Invalidate cache untuk product list site ini
    await invalidateCache(`product-list-${siteId}`);

    return { success: true, item: created, product: created };
}

export async function getProductDetail(id: string, siteId: string) {
    const product = await productRepo.findProductById(id, siteId);
    if (!product) {
        return { success: false, error: "Product not found", status: 404 };
    }
    return product;
}

export async function updateProduct(
    id: string,
    siteId: string,
    body: unknown,
    session?: unknown
) {
    const existing = await productRepo.findProductById(id, siteId);
    if (!existing) {
        return { success: false, error: "Product not found or unauthorized", status: 404 };
    }

    const validation = productSchema.safeParse(body);
    if (!validation.success) {
        return { success: false, error: "Validation failed", details: validation.error.format(), status: 400 };
    }

    const { metaData, ...data } = validation.data;
    const finalData = transformData(data as unknown as Record<string, unknown>, session);

    const updated = await productRepo.updateProduct(id, siteId, finalData as any);

    if (metaData && Array.isArray(metaData)) {
        await db.metaData.deleteMany({ where: { productId: id } });
        if (metaData.length > 0) {
            await db.metaData.createMany({
                data: metaData.map((m) => ({
                    key: m.key,
                    value: m.value ?? "",
                    type: m.type || "text",
                    productId: id
                }))
            });
        }
    }

    await publishCrudEvent("crud.updated", "product", siteId, updated);

    return { success: true, item: updated, product: updated };
}

export async function deleteProductItem(id: string, siteId: string) {
    const existing = await productRepo.findProductById(id, siteId);
    if (!existing) {
        return { success: false, error: "Product not found or unauthorized", status: 404 };
    }

    await productRepo.deleteProduct(id);

    if (existing.images && existing.images.length > 0) {
        for (const imageUrl of existing.images) {
            try {
                await deleteMediaByUrl(siteId, imageUrl, existing.id);
            } catch (err) {
                console.error(`Failed to delete orphan image: ${imageUrl}`, err);
            }
        }
    }

    await publishCrudEvent("crud.deleted", "product", siteId, existing);
    
    // Invalidate cache untuk product list site ini
    await invalidateCache(`product-list-${siteId}`);

    return { success: true };
}

export async function archiveProduct(id: string, siteId: string, isArchived: boolean) {
    const existing = await productRepo.findProductById(id, siteId);
    if (!existing) {
        return { success: false, error: "Product not found or unauthorized", status: 404 };
    }

    const updated = await productRepo.updateProduct(id, siteId, { isArchived } as any);

    await publishCrudEvent("crud.updated", "product", siteId, updated);
    
    // Invalidate cache untuk product list site ini
    await invalidateCache(`product-list-${siteId}`);

    return { success: true, item: updated };
}
