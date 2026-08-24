import { getApiContext, apiResponse, apiError } from "@/lib/api/utils";
import { createBackupStream } from "../services/backup-export.service";
import { importBackupData } from "../services/backup-import.service";

export async function exportBackupApi() {
    try {
        const { error, status } = await getApiContext(["admin"], { requireSite: false });
        if (error) return apiError(error, status);

        const dateStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `backup-situsbisnis-${dateStr}_${timeStr}.json`;

        // Gunakan streaming Response untuk menghindari memuat semua data ke memory sekaligus.
        // Data ditulis chunk-by-chunk ke response stream, sehingga peak memory ≈ 1 tabel terbesar.
        const backupStream = createBackupStream();

        return new Response(backupStream, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store, max-age=0"
            }
        });
    } catch (error) {
        console.error("Export Backup Error:", error);
        return apiError("Gagal mengekspor data backup database: " + (error as Error).message);
    }
}

export async function importBackupApi(req: Request) {
    try {
        const { session, error, status } = await getApiContext(["admin"], { requireSite: false });
        if (error) return apiError(error, status);

        const currentAdminId = (session?.user as any)?.id;
        if (!currentAdminId) {
            return apiError("Administrator ID tidak ditemukan di sesi aktif.", 400);
        }

        const body = await req.json();
        const result = await importBackupData(body, currentAdminId);

        if (!result.success) {
            return apiError(result.message, 500);
        }

        return apiResponse({
            success: true,
            message: "Database platform berhasil dipulihkan dari data backup."
        });
    } catch (error) {
        console.error("Import Backup Error:", error);
        return apiError("Gagal memulihkan database dari backup: " + (error as Error).message);
    }
}
