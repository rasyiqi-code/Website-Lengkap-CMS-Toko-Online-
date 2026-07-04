/**
 * Service untuk menangani komunikasi dengan Dokploy API
 * untuk otomasi penambahan dan penghapusan custom domain tenant.
 */
export const DokployService = {
    /**
     * Mendaftarkan domain baru ke aplikasi/compose stack di Dokploy.
     * @param domain Nama domain yang akan didaftarkan (misal: toko.com)
     */
    async addDomain(domain: string): Promise<boolean> {
        const apiUrl = process.env.DOKPLOY_API_URL;
        const apiKey = process.env.DOKPLOY_API_KEY;
        const composeId = process.env.DOKPLOY_COMPOSE_ID;

        if (!apiUrl || !apiKey || !composeId) {
            console.warn("[DOKPLOY_SERVICE] Konfigurasi Dokploy API tidak lengkap di env. Operasi addDomain dibatalkan.");
            return false;
        }

        const domainLower = domain.toLowerCase().trim();

        try {
            const response = await fetch(`${apiUrl}/api/domain.create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey
                },
                body: JSON.stringify({
                    host: domainLower,
                    domainType: "compose",
                    composeId: composeId,
                    serviceName: "nextjs-app",
                    port: 3000,
                    https: true,
                    certificateType: "letsencrypt"
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Dokploy API merespons dengan status ${response.status}: ${errText}`);
            }

            await response.json();
            return true;
        } catch (error) {
            console.error(`[DOKPLOY_SERVICE] Error saat mendaftarkan domain ${domainLower}:`, error);
            throw error;
        }
    },

    /**
     * Menghapus domain dari aplikasi/compose stack di Dokploy.
     * @param domain Nama domain yang akan dihapus
     */
    async deleteDomain(domain: string): Promise<boolean> {
        const apiUrl = process.env.DOKPLOY_API_URL;
        const apiKey = process.env.DOKPLOY_API_KEY;
        const composeId = process.env.DOKPLOY_COMPOSE_ID;

        if (!apiUrl || !apiKey || !composeId) {
            console.warn("[DOKPLOY_SERVICE] Konfigurasi Dokploy API tidak lengkap di env. Operasi deleteDomain dibatalkan.");
            return false;
        }

        const domainLower = domain.toLowerCase().trim();

        try {
            // 1. Ambil semua domain yang terasosiasi dengan Compose ID
            const getUrl = `${apiUrl}/api/domain.byComposeId?composeId=${composeId}`;
            const getResponse = await fetch(getUrl, {
                method: "GET",
                headers: {
                    "x-api-key": apiKey
                }
            });

            if (!getResponse.ok) {
                const errText = await getResponse.text();
                throw new Error(`Gagal mengambil daftar domain dari Dokploy (${getResponse.status}): ${errText}`);
            }

            const domainsData = await getResponse.json();
            let domainList: any[] = [];

            // Dokploy API bisa mengembalikan array langsung atau objek yang berisi array
            if (Array.isArray(domainsData)) {
                domainList = domainsData;
            } else if (domainsData && Array.isArray(domainsData.domains)) {
                domainList = domainsData.domains;
            } else if (domainsData && typeof domainsData === "object") {
                // Mencari properti array secara dinamis jika struktur response berbeda
                const possibleArray = Object.values(domainsData).find(val => Array.isArray(val));
                if (possibleArray) {
                    domainList = possibleArray as any[];
                }
            }

            // Cari domain yang sesuai dengan host/domain yang ingin dihapus
            const target = domainList.find(
                (d: any) => d && typeof d.host === "string" && d.host.toLowerCase().trim() === domainLower
            );

            if (!target || !target.id) {
                console.warn(`[DOKPLOY_SERVICE] Domain ${domainLower} tidak ditemukan di list Dokploy. Lewati proses penghapusan di Dokploy.`);
                return false;
            }

            const domainId = target.id;

            // 2. Kirim permintaan penghapusan domain menggunakan domainId
            const deleteResponse = await fetch(`${apiUrl}/api/domain.delete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey
                },
                body: JSON.stringify({
                    domainId: domainId
                })
            });

            if (!deleteResponse.ok) {
                const errText = await deleteResponse.text();
                throw new Error(`Gagal menghapus domain di Dokploy (${deleteResponse.status}): ${errText}`);
            }

            return true;
        } catch (error) {
            console.error("[DOKPLOY_SERVICE] Error saat menghapus domain:", domainLower, error);
            throw error;
        }
    }
};
