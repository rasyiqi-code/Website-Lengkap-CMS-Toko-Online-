import { db } from "@/lib/core/db";

// Lazy import @aws-sdk/client-s3 — hanya dimuat saat upload/delete file.
// AWS SDK sangat berat (~200-300MB saat dimuat), lazy import menghemat RAM saat idle.
let s3Module: { S3Client: any; PutObjectCommand: any; DeleteObjectCommand: any } | null = null;
async function getS3Module() {
    if (!s3Module) {
        s3Module = await import("@aws-sdk/client-s3");
    }
    return s3Module;
}

export async function getR2Settings() {
    // 1. Try to get from Database
    let settings = null;
    try {
        settings = await db.platformSettings.findUnique({
            where: { id: "global" }
        });
    } catch (_e) {
        console.warn("Could not fetch R2 settings from DB, falling back to env:", _e);
    }

    if (settings?.r2AccountId && settings?.r2AccessKeyId && settings?.r2SecretAccessKey && settings?.r2BucketName) {
        return {
            accountId: settings.r2AccountId,
            accessKeyId: settings.r2AccessKeyId,
            secretAccessKey: settings.r2SecretAccessKey,
            bucketName: settings.r2BucketName,
            publicDomain: settings.r2PublicDomain || process.env.R2_PUBLIC_DOMAIN,
            endpoint: settings.r2Endpoint || process.env.R2_ENDPOINT,
        };
    }

    // 2. Fallback to Environment Variables
    return {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME,
        publicDomain: process.env.R2_PUBLIC_DOMAIN,
        endpoint: process.env.R2_ENDPOINT,
    };
}

async function getS3Client(settings: any) {
    const { S3Client } = await getS3Module();
    const endpoint = settings.endpoint || `https://${settings.accountId}.r2.cloudflarestorage.com`;
    
    return new S3Client({
        region: "auto",
        endpoint: endpoint,
        forcePathStyle: true,
        credentials: {
            accessKeyId: settings.accessKeyId!,
            secretAccessKey: settings.secretAccessKey!,
        },
    });
}

export async function uploadToR2(file: Buffer, filename: string, mimeType: string) {
    const settings = await getR2Settings();
    
    if (!settings.accountId || !settings.accessKeyId || !settings.secretAccessKey || !settings.bucketName) {
        console.error("Cannot upload: R2 credentials missing");
        return null;
    }

    const { PutObjectCommand } = await getS3Module();
    const S3 = await getS3Client(settings);
    const key = `${crypto.randomUUID()}-${filename.replace(/\s+/g, '-')}`;

    await S3.send(new PutObjectCommand({
        Bucket: settings.bucketName,
        Key: key,
        Body: file,
        ContentType: mimeType,
    }));

    return `${settings.publicDomain}/${key}`;
}

export async function deleteFromR2(fileUrl: string) {
    const settings = await getR2Settings();

    if (!settings.accountId || !settings.accessKeyId || !settings.secretAccessKey || !settings.bucketName) {
        console.error("Cannot delete: R2 credentials missing");
        return;
    }

    try {
        const { DeleteObjectCommand } = await getS3Module();
        const S3 = await getS3Client(settings);
        
        let urlStringToParse = fileUrl;
        if (!fileUrl.match(/^https?:\/\//)) {
            urlStringToParse = `https://${fileUrl}`;
        }

        const urlObj = new URL(urlStringToParse);
        const key = urlObj.pathname.substring(1);

        if (!key) {
            console.warn("Could not extract key from URL:", fileUrl);
            return;
        }

        if (settings.publicDomain && !fileUrl.startsWith(settings.publicDomain)) {
            console.warn("WARNING: File URL domain does not match current public domain. Attempting delete anyway using extracted key.");
        }

        await S3.send(new DeleteObjectCommand({
            Bucket: settings.bucketName,
            Key: key,
        }));
    } catch (error) {
        console.error("Failed to delete from R2:", error);
    }
}
