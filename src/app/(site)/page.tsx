import nextDynamic from "next/dynamic";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage } from "@/modules/page/ui/content-display";
import { getSiteSettings } from "@/modules/site/ui/site-settings";
import { getTenant, getSiteId } from "@/lib/domains/tenant";
import GallerySection from "@/components/ui/GallerySection";
import { hooks } from "@/lib/core/hooks";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/domains/utils";

import { getPlatformSettings } from "@/lib/settings/platform";
import {
    ArrowRight,
    Sparkles,
    Zap,
    Layout,
    Shield,
    Globe
} from "lucide-react";

const Client = nextDynamic(() => import("./[...credbuildPath]/client").then(m => m.Client), {
    ssr: true,
    loading: () => <div className="min-h-screen bg-background animate-pulse" />
});

import TiptapRenderer from "@/components/editor/TiptapRenderer";

const SaaSLandingPage = nextDynamic(() => import("@/app/(pages)/SaaSLandingPage"), {
    ssr: true,
    loading: () => <div className="min-h-screen bg-background animate-pulse" />
});

import { SubscriptionClient } from "@/modules/subscription";

export async function generateMetadata(): Promise<Metadata> {
    const [subdomain, headersList] = await Promise.all([
        getTenant(),
        headers()
    ]);

    // If it's root domain, return SaaS metadata
    if (!subdomain) {
        const [platform] = await Promise.all([
            getPlatformSettings()
        ]);
        
        const host = headersList.get("host");
        const baseUrl = getBaseUrl(host);

        return {
            metadataBase: new URL(baseUrl),
            title: `${platform.siteName} - Website Marketing Cepat & SEO Friendly untuk Bisnis Anda`,
            description: `Buat website marketing yang dioptimalkan untuk iklan & pencarian dengan loading kilat. Fitur lengkap, desain responsif, siap konversi. Gratis untuk 30 hari!`,
            keywords: ["website marketing", "website bisnis cepat", "website SEO", "landing page creator", "website toko online", "marketing website builder"],
            openGraph: {
                type: "website",
                locale: "id_ID",
                url: baseUrl,
                title: `${platform.siteName} - Website Marketing Cepat & SEO Friendly`,
                description: `Buat website marketing yang dioptimalkan untuk iklan & pencarian dengan loading kilat. Fitur lengkap, desain responsif, siap konversi. Gratis untuk 30 hari!`,
                images: [
                    {
                        url: `${baseUrl}/images/hero-mockup.png`,
                        width: 1200,
                        height: 630,
                        alt: `${platform.siteName} - Platform Website Marketing Profesional`
                    }
                ],
                siteName: platform.siteName,
            },
            twitter: {
                card: "summary_large_image",
                title: `${platform.siteName} - Website Marketing Cepat & SEO Friendly`,
                description: `Buat website marketing dioptimalkan untuk iklan & SEO. Loading super cepat, fitur lengkap, siap konversi. Gratis 30 hari!`,
                images: [`${baseUrl}/images/hero-mockup.png`],
            }
        };
    }

    const [pageData, settings] = await Promise.all([
        getPage("/"),
        getSiteSettings()
    ]);


    const siteTitle = settings.siteName || "SitusBisnis";
    const tagline = settings.tagline || settings.description;

    // For homepage: "SiteName - Tagline"
    const absoluteTitle = tagline ? `${siteTitle} - ${tagline}` : siteTitle;

    return {
        title: {
            absolute: absoluteTitle
        },
        description: pageData?.description || settings.description,
        openGraph: {
            title: absoluteTitle,
            description: pageData?.description || settings.description || "Built with SitusBisnis",
            images: pageData?.imageUrl ? [{ url: pageData.imageUrl }] : (settings.seoImage ? [{ url: settings.seoImage }] : undefined),
        },
    };
}

export default async function Page() {
    // Paralelisasi identifikasi tenant dan data halaman dalam satu round-trip
    // React.cache mendeduplikasi pemanggilan getTenant/getSiteId dengan layout
    const [subdomain, siteId, pageData] = await Promise.all([
        getTenant(),
        getSiteId(),
        getPage("/")
    ]);

    // 1. Cek apakah ini Root Domain (Halaman Promosi SaaS)
    if (!subdomain) {
        const [platform, plans] = await Promise.all([
            getPlatformSettings(),
            SubscriptionClient.getPricingPlans()
        ]);
        return <SaaSLandingPage platform={platform} plans={plans} />;
    }

    // 2. Tenant tidak terdaftar di database
    if (!siteId) {
        const host = (await (await import("next/headers")).headers()).get("host") || "";
        const hostOnly = host.split(":")[0];
        const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostOnly);
        const parts = hostOnly.split(".");
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
            ? process.env.NEXT_PUBLIC_ROOT_DOMAIN.replace(/^https?:\/\//, '').split(":")[0]
            : "";

        // Jika 2-part domain, IP, atau root domain platform → tampilkan landing page
        if (parts.length <= 2 || isIp || (rootDomain && (hostOnly === rootDomain || hostOnly === `www.${rootDomain}`))) {
            const [platform, plans] = await Promise.all([
                getPlatformSettings(),
                SubscriptionClient.getPricingPlans()
            ]);
            return <SaaSLandingPage platform={platform} plans={plans} />;
        }
        notFound();
    }

    // Terapkan filter plugin pada data halaman
    let data = hooks.applyFilters("page_data", pageData, { path: "/" });


    // Anggap "Tanpa Konten" jika halaman ada tapi tidak memiliki isi
    const hasContent = data && (data.body || data.useBuilder || (data.data && Object.keys(data.data as object).length > 0));

    if (!data || !hasContent) {
        // High-End Default Welcome Page for New Tenants - Forced Light Theme
        return (
            <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#FAFAFA] text-slate-900">
                {/* Advanced Background System */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-500/10 rounded-full blur-[120px]" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
                        <Sparkles size={14} className="animate-pulse" />
                        Platform Siap Pakai • Lingkungan Premium
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        Website Baru <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-600">Siap Beraksi.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-xl md:text-2xl text-slate-600 font-medium mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        Selamat datang di ruang kerja profesional Anda. Ini adalah tampilan sementara sebelum Anda membuat mahakarya. Masuk ke dashboard untuk mulai membangun website impian Anda.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
                        <Link
                            href="/dashboard"
                            className="group relative px-10 py-5 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-primary/40 hover:scale-[1.03] transition-transform duration-300"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Buka Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-2xl" />
                        </Link>
                        <Link
                            href="/dashboard/pages"
                            className="px-10 py-5 bg-white text-slate-900 border border-slate-200 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                        >
                            Buat Halaman Pertama
                        </Link>
                    </div>

                    {/* Minimalist Tech Stack Icons */}
                    <div className="mt-32 pt-12 border-t border-slate-200 flex flex-wrap justify-center gap-10 opacity-40 grayscale filter animate-in fade-in duration-1000 delay-1000">
                        <Zap size={24} />
                        <Layout size={24} />
                        <Shield size={24} />
                        <Globe size={24} />
                    </div>
                </div>
            </div>
        );
    }

    if (data.useBuilder) {
        return <Client data={data.data as any} />;
    }

    if (data.body) {
        performance.mark('RenderStart');
        return (
            <div className="min-h-screen bg-background text-foreground">
                <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
                    {data.title && <h1 className="text-center text-4xl font-extrabold text-foreground sm:text-5xl mb-10 tracking-tight">{data.title}</h1>}
                    <div className="prose dark:prose-invert max-w-none">
                        <TiptapRenderer content={data.body} />
                    </div>

                    {/* Conditional Gallery Integration */}
                    {Array.isArray((data as any).metaData) &&
                        ((data as any).metaData as any[]).find((m: any) => m.key === 'show_gallery')?.value === 'true' && (
                            <GallerySection />
                        )}
                </div>
            </div>
        );
    }

    return <Client data={data.data as any} />;
}
