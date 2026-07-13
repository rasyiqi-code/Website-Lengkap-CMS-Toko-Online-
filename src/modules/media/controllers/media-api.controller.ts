import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { getR2Settings } from "@/lib/media/r2";
import { getApiContext, apiResponse, apiError } from "@/lib/api/utils";
import { MediaClient } from "../index";

// Cache directory setup
const getCacheDir = () => {
    return path.join(process.cwd(), ".next", "cache", "proxy");
};

const CACHE_DIR = getCacheDir();

let _canCache: boolean | null = null;
function checkCacheSupport() {
    if (_canCache !== null) return _canCache;
    try {
        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
        const testFile = path.join(CACHE_DIR, ".test-write");
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);
        _canCache = true;
    } catch (e) {
        console.warn("Proxy cache disabled: Directory not writable", CACHE_DIR, e);
        _canCache = false;
    }
    return _canCache;
}

/**
 * Handler GET untuk mengambil daftar media.
 */
export async function getMediaListApi(req: Request) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "editor", "owner"]);
        if (error) return apiError(error, status);

        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get("folderId") || null;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const items = await MediaClient.getMediaList(siteId, folderId, page, limit);
        return apiResponse(items);
    } catch (error) {
        console.error("GetMediaList Error:", error);
        return apiError("Internal Error");
    }
}

/**
 * Handler GET untuk mengambil daftar folder media.
 */
export async function getMediaFoldersApi(req: Request) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "editor", "owner"]);
        if (error) return apiError(error, status);

        const { searchParams } = new URL(req.url);
        const parentId = searchParams.get("parentId") || null;

        const folders = await MediaClient.getMediaFolders(siteId, parentId);
        return apiResponse(folders);
    } catch (error) {
        console.error("GetMediaFolders Error:", error);
        return apiError("Internal Error");
    }
}

/**
 * Handler POST untuk mengunggah file media.
 */
export async function uploadMediaApi(req: Request) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "editor", "owner"]);
        if (error) return apiError(error, status);

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const folderId = formData.get("folderId") as string | null;

        if (!file) return apiError("File required", 400);

        try {
            const mediaItem = await MediaClient.uploadMedia(siteId, file, folderId);
            return apiResponse(mediaItem);
        } catch (serviceError: any) {
            const msg = serviceError?.message || "";
            if (msg === "FILE_REQUIRED") return apiError("File required", 400);
            if (msg === "QUOTA_FULL") return apiError("Quota full", 403);
            if (msg === "UPLOAD_FAILED") return apiError("Upload failed", 500);
            throw serviceError;
        }
    } catch (error) {
        console.error("Upload Error:", error);
        return apiError("Internal Error");
    }
}

/**
 * Handler GET untuk mem-proxy media upstream.
 */
export async function proxyMediaApi(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const width = searchParams.get("w") ? parseInt(searchParams.get("w")!) : null;
    const height = searchParams.get("h") ? parseInt(searchParams.get("h")!) : null;
    const quality = searchParams.get("q") ? parseInt(searchParams.get("q")!) : 75;

    if (!url) return new NextResponse("Missing URL", { status: 400 });

    // Security Check
    const settings = await getR2Settings();
    const allowedDomains = [
        "file.situsbisnis.com",
        "images.unsplash.com",
        "via.placeholder.com",
        "placehold.co",
        "i.pravatar.cc",
        "ui-avatars.com"
    ];
    if (settings.publicDomain) {
        const domainOnly = settings.publicDomain.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
        if (domainOnly) {
            allowedDomains.push(domainOnly);
        }
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return new NextResponse("Invalid URL", { status: 400 });
    }

    const isAllowed = allowedDomains.includes(parsedUrl.hostname);

    if (!isAllowed) {
        console.warn(`Blocked unauthorized proxy request for: ${url}`);
        return new NextResponse("Unauthorized proxy source", { status: 403 });
    }

    // Check Cache
    const isCacheEnabled = checkCacheSupport();
    const cacheKey = `${url}|w=${width}|h=${height}|q=${quality}`;
    const urlHash = crypto.createHash("sha1").update(cacheKey).digest("hex");
    const cachePath = path.join(CACHE_DIR, urlHash);
    const metaPath = cachePath + ".json";

    if (isCacheEnabled && fs.existsSync(cachePath) && fs.existsSync(metaPath)) {
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            const fileBuffer = fs.readFileSync(cachePath);
            const headers = new Headers();
            headers.set("Content-Type", meta.contentType || "image/webp");
            headers.set("Content-Length", fileBuffer.length.toString());
            headers.set("Cache-Control", "public, max-age=31536000, immutable");
            headers.set("X-Proxy-Cache", "HIT");
            headers.set("X-Proxy-Transformed", (width || height) ? "TRUE" : "FALSE");
            return new NextResponse(fileBuffer, { headers });
        } catch (_e) {
            console.error("Cache read error:", _e);
        }
    }

    try {
        const response = await fetch(url, { headers: { "User-Agent": "NEXT-CMS-Proxy/1.0" } });
        if (!response.ok) {
            if (response.status === 404 && (url.toLowerCase().includes("favicon") || url.toLowerCase().endsWith(".ico"))) {
                const host = req.headers.get("host") || "localhost:3000";
                const protocol = req.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
                return NextResponse.redirect(new URL("/favicon.ico", `${protocol}://${host}`));
            }
            return new NextResponse(`Failed to fetch upstream: ${response.status}`, { status: response.status });
        }

        const contentType = response.headers.get("content-type");
        const arrayBuffer = await response.arrayBuffer();
        let buffer: any = Buffer.from(arrayBuffer);
        let finalContentType = contentType || "application/octet-stream";

        if (contentType?.startsWith("image/") && (width || height || quality < 100)) {
            try {
                let transformer = sharp(buffer);
                transformer = transformer.rotate();

                if (width || height) {
                    transformer = transformer.resize(width, height, {
                        fit: "cover",
                        withoutEnlargement: true
                    });
                }

                if (contentType !== "image/gif") {
                    transformer = transformer.webp({ quality });
                    finalContentType = "image/webp";
                }

                buffer = (await transformer.toBuffer()) as any;
            } catch (sharpError) {
                console.error("Sharp transformation failed, serving original:", sharpError);
            }
        }

        if (isCacheEnabled) {
            fs.writeFile(cachePath, buffer, (err) => {
                if (!err) fs.writeFile(metaPath, JSON.stringify({ contentType: finalContentType }), () => {});
            });
        }

        const headers = new Headers();
        headers.set("Content-Type", finalContentType);
        headers.set("Content-Length", buffer.length.toString());
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("X-Proxy-Cache", "MISS");
        
        return new NextResponse(buffer, { status: 200, headers });
    } catch (error: any) {
        console.error(`Proxy error for ${url}:`, error.message);
        return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
    }
}

/**
 * Handler DELETE untuk menghapus folder media.
 */
export async function deleteMediaFolderApi(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "editor"]);
        if (error) return apiError(error, status);

        const { id } = await params;
        if (!id) return apiError("ID is required", 400);

        await MediaClient.deleteMediaFolder(siteId, id);
        return apiResponse({ success: true });
    } catch (error: any) {
        if (error.message?.includes("non-empty")) return apiError(error.message, 400);
        console.error("Delete Folder Error:", error);
        return apiError("Failed to delete folder");
    }
}

/**
 * Handler DELETE untuk menghapus media item.
 */
export async function deleteMediaApi(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { siteId, error, status } = await getApiContext(["admin", "editor", "owner"]);
        if (error) return apiError(error, status);

        const { id } = await params;
        if (!id) return apiError("ID required", 400);

        await MediaClient.deleteMedia(siteId, id);
        return apiResponse({ success: true });
    } catch (error) {
        console.error("Delete Error:", error);
        return apiError("Internal Error");
    }
}
