import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // 1. Cek / seed plans jika kosong
    const planCount = await prisma.plan.count();
    if (planCount === 0) {
        console.log("Seeding plans...");
        // Jalankan seeding sederhana
        const plans = [
            {
                id: "cmoy7zm1a0000j20j88ablncm",
                name: "Free",
                description: "Paket gratis selamanya untuk mencoba fitur dasar kami.",
                price: 0,
                priceYearly: null,
                originalPrice: 0,
                originalPriceYearly: 0,
                trialDays: 0,
                interval: "month",
                features: {},
                maxPosts: -1,
                maxProducts: -1,
                maxAssets: -1,
                maxTestimonials: -1,
                maxOrders: -1,
                maxSites: -1,
                addonSiteBilling: "one_time",
                showInPricing: false
            },
            {
                id: "cmoxs0xd80001iexi3fqb19qy",
                name: "Pro",
                description: "Solusi profesional untuk bisnis yang sedang berkembang.",
                price: 99000,
                priceYearly: 999000,
                originalPrice: 150000,
                originalPriceYearly: 3000000,
                trialDays: 14,
                interval: "month",
                features: {
                    addonSitePrice: 50000,
                },
                maxPosts: 10,
                maxProducts: 10,
                maxAssets: 50,
                maxTestimonials: 10,
                maxOrders: -1,
                maxSites: 1,
                addonSiteBilling: "recurring",
                showInPricing: true
            }
        ];
        for (const p of plans) {
            await prisma.plan.create({ data: p as any });
        }
        console.log("Plans seeded!");
    } else {
        console.log(`Terdapat ${planCount} plans di database.`);
    }

    // 2. Ambil user pertama
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("Belum ada user di database! Silakan mendaftar/buat user terlebih dahulu.");
        return;
    }
    console.log(`User ditemukan: ${user.email} (ID: ${user.id})`);

    // 3. Ambil site bukan admin
    const site = await prisma.site.findFirst({
        where: { subdomain: { not: "admin" } }
    });
    if (!site) {
        console.error("Belum ada situs (site) di database! Silakan onboarding/buat situs dahulu.");
        return;
    }
    console.log(`Site ditemukan: ${site.name} (${site.subdomain}) (ID: ${site.id})`);

    // Hubungkan user sebagai owner situs jika belum
    const link = await prisma.siteUser.findUnique({
        where: {
            siteId_userId: {
                siteId: site.id,
                userId: user.id
            }
        }
    });
    if (!link) {
        await prisma.siteUser.create({
            data: {
                siteId: site.id,
                userId: user.id,
                role: "owner"
            }
        });
        console.log("User telah dikaitkan sebagai OWNER situs.");
    }

    // 4. Proses argument untuk set status trial
    const mode = process.argv[2] || "active";
    const now = new Date();
    let trialEndsAt = new Date();

    if (mode === "active") {
        // Skenario 1: Trial Masih Aktif (5 hari sisa)
        trialEndsAt.setDate(now.getDate() + 5);
        console.log("Mengatur status ke: TRIAL AKTIF (5 Hari Sisa)");
    } else if (mode === "grace") {
        // Skenario 2: Trial Habis & Masuk Masa Tenggang (9 hari lalu -> sisa 21 hari masa tenggang)
        trialEndsAt.setDate(now.getDate() - 9);
        console.log("Mengatur status ke: MASA TENGGANG (Trial berakhir 9 hari lalu, sisa 21 hari)");
    } else if (mode === "expired") {
        // Skenario 3: Trial Habis & Masa Tenggang Habis (35 hari lalu -> Expired)
        trialEndsAt.setDate(now.getDate() - 35);
        console.log("Mengatur status ke: EXPIRED (Trial berakhir 35 hari lalu)");
    } else {
        console.log("Mode tidak dikenal. Gunakan: active | grace | expired");
        return;
    }

    // Cari atau buat subscription
    const proPlan = await prisma.plan.findFirst({ where: { name: "Pro" } });
    if (!proPlan) {
        console.error("Paket Pro tidak ditemukan!");
        return;
    }

    const existingSub = await prisma.subscription.findFirst({
        where: { siteId: site.id }
    });

    if (existingSub) {
        await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
                planId: proPlan.id,
                trialEndsAt,
                status: "active", // tetap active di DB karena logic trial berakhir diatur oleh tanggal
                endDate: null
            }
        });
        console.log(`Subscription (ID: ${existingSub.id}) berhasil diperbarui!`);
    } else {
        const newSub = await prisma.subscription.create({
            data: {
                siteId: site.id,
                planId: proPlan.id,
                status: "active",
                trialEndsAt,
                endDate: null,
                addonSlots: 0
            }
        });
        console.log(`Subscription baru (ID: ${newSub.id}) berhasil dibuat!`);
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
    console.log(`\nSilakan buka situs lokal Anda: http://${site.subdomain}.${rootDomain}/dashboard`);
    console.log(`Atau halaman billing: http://${site.subdomain}.${rootDomain}/dashboard/billing`);
}

main().catch(console.error);
