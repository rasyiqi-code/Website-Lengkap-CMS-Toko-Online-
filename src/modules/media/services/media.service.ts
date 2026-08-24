import * as contentRepo from "../repositories/content.repository";
import * as mediaRepo from "../repositories/media.repository";
import { uploadToR2, deleteFromR2 } from "@/lib/media/r2";
import { eventBus } from "@/modules/shared/core/event-bus";
import path from "path";

// Lazy import sharp — hanya dimuat saat ada upload gambar, menghemat ~50-100MB RAM saat idle
 
let sharpFn: any = null;
async function getSharp(): Promise<any> {
    if (!sharpFn) {
        const mod = await import("sharp");
        sharpFn = mod.default || mod;
    }
    return sharpFn;
}

/**
 * Mengambil daftar media items beserta informasi sisa kuota penyimpanan.
 */
export async function getMediaList(siteId: string, folderId: string | null, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total, totalBytes, subscription] = await Promise.all([
        mediaRepo.findMediaItems(siteId, folderId, limit, skip),
        mediaRepo.countMediaItems(siteId),
        contentRepo.sumMediaSize(siteId),
        eventBus.request<{ siteId: string }, any>("request.billing.getActiveSubscription", { siteId })
    ]);

    const plan = subscription?.plan as any;
    const hasGallery = plan?.features?.hasGallery === true;
    const maxAssets = hasGallery ? (plan?.maxAssets ?? -1) : 0;
    const totalSizeInMb = totalBytes / (1024 * 1024);

    return {
        data: items,
        quota: {
            used: totalSizeInMb,
            max: maxAssets
        },
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Memproses unggahan (upload) dan optimasi file media.
 */
export async function uploadMedia(siteId: string, file: File, folderId: string | null) {
    if (!file) throw new Error("FILE_REQUIRED");

    // 1. Check Max Assets Limit
    const limitCheck = await eventBus.request<{ siteId: string; limitType: string }, { allowed: boolean; message?: string }>(
        "request.billing.checkLimit",
        { siteId, limitType: "maxAssets" }
    );
    if (!limitCheck.allowed) {
        throw new Error(limitCheck.message || "QUOTA_FULL");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

    if (isImage) {
        const magicBytes: Record<string, number[]> = {
            ".jpg": [0xFF, 0xD8, 0xFF],
            ".jpeg": [0xFF, 0xD8, 0xFF],
            ".png": [0x89, 0x50, 0x4E, 0x47],
            ".webp": [0x52, 0x49, 0x46, 0x46],
        };
        const expected = magicBytes[ext];
        if (expected) {
            const header = Array.from(buffer.subarray(0, expected.length));
            const match = expected.every((byte, i) => header[i] === byte);
            if (!match) {
                throw new Error("FILE_TYPE_MISMATCH");
            }
        }
    }

    let url = "";
    let width, height, blurDataURL;
    let finalBuffer: Buffer = buffer;
    let finalMimeType = file.type;
    let finalFilename = file.name;
    let finalSize = file.size;

    if (isImage) {
        try {
            const sharp = await getSharp();
            const image = sharp(buffer);
            await image.metadata();
            
            // Auto-optimize and convert to WebP with max 2560px width
            const optimizedImage = image
                .resize(2560, undefined, { withoutEnlargement: true, fit: "inside" })
                .webp({ quality: 80, effort: 4 })
                .rotate();

            finalBuffer = await optimizedImage.toBuffer() as Buffer;
            
            const processedMetadata = await sharp(finalBuffer).metadata();
            width = processedMetadata.width;
            height = processedMetadata.height;
            
            finalMimeType = "image/webp";
            finalFilename = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            finalSize = finalBuffer.length;

            // Generate tiny placeholder blur image
            const placeholder = await image
                .resize(10, 10, { fit: "inside" })
                .jpeg({ quality: 20, progressive: true })
                .toBuffer();
            blurDataURL = `data:image/jpeg;base64,${placeholder.toString("base64")}`;
        } catch (err) {
            console.error("Image processing failed:", err);
        }
    }

    const uploadName = `${Date.now()}-${finalFilename.replace(/\s+/g, "-")}`;
    url = await uploadToR2(finalBuffer, uploadName, finalMimeType);

    if (!url) {
        throw new Error("UPLOAD_FAILED");
    }

    const mediaItem = await mediaRepo.createMediaItem({
        siteId,
        folderId,
        url,
        filename: finalFilename,
        mimeType: finalMimeType,
        size: finalSize,
        width,
        height,
        blurDataURL
    });

    return mediaItem;
}

/**
 * Menghapus file media dari database dan Cloudflare R2 storage.
 */
export async function deleteMedia(siteId: string, id: string) {
    if (!id) throw new Error("ID_REQUIRED");

    const item = await mediaRepo.findMediaItemByIdAndSite(id, siteId);
    if (!item) {
        throw new Error("NOT_FOUND");
    }

    await deleteFromR2(item.url);
    await mediaRepo.deleteMediaItem(id);

    return { success: true };
}

/**
 * Menghapus media berdasarkan URL (jika tidak digunakan di tempat lain).
 */
export async function deleteMediaByUrl(siteId: string, url: string, excludeProductId?: string) {
    if (!url) return { success: false };

    const inUse = await mediaRepo.isMediaUrlInUse(url, siteId, excludeProductId);
    if (inUse) {
        return { success: false, reason: "IN_USE" };
    }

    const item = await mediaRepo.findMediaItemByUrlAndSite(url, siteId);
    if (!item) {
        return { success: false }; // Silent fail is fine if media doesn't exist
    }

    await deleteFromR2(item.url);
    await mediaRepo.deleteMediaItem(item.id);

    return { success: true };
}

/**
 * Mengambil daftar folder media berdasarkan siteId dan parentId.
 */
export async function getMediaFolders(siteId: string, parentId: string | null) {
    return mediaRepo.findMediaFolders(siteId, parentId);
}

/**
 * Membuat folder media baru.
 */
export async function createMediaFolder(siteId: string, name: string, parentId: string | null) {
    if (!name) throw new Error("NAME_REQUIRED");
    return mediaRepo.createMediaFolder({
        siteId,
        name,
        parentId
    });
}

/**
 * Menghapus folder media jika kosong.
 */
export async function deleteMediaFolder(siteId: string, id: string) {
    if (!id) throw new Error("ID_REQUIRED");

    const folder = await mediaRepo.findMediaFolderByIdAndSite(id, siteId);
    if (!folder) {
        throw new Error("NOT_FOUND");
    }

    const withCounts = await mediaRepo.findMediaFolderWithCounts(id);
    if (withCounts && (withCounts._count.items > 0 || withCounts._count.children > 0)) {
        throw new Error("FOLDER_NOT_EMPTY");
    }

    await mediaRepo.deleteMediaFolder(id);

    return { success: true };
}
