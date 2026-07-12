"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteSettings } from "@/modules/site/ui/site-settings";
import {
    Save,
    Globe,
    Palette,
    Search,
    LayoutTemplate,
    Settings,
    Cpu,
    CheckCircle2,
    Info,
    BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

// Refactored Tab Components
import { IdentityTab } from "@/components/dashboard/settings/IdentityTab";
import { ModulesTab } from "@/components/dashboard/settings/ModulesTab";
import { BrandingTab } from "@/components/dashboard/settings/BrandingTab";
import { NavigationTab } from "@/components/dashboard/settings/NavigationTab";
import { SEOTab } from "@/components/dashboard/settings/SEOTab";
import { PixelTab } from "@/components/dashboard/settings/PixelTab";
import { updateSiteSettingsAction, savePaymentSettingsAction } from "@/modules/site/actions/site.actions";

type TabType = "identity" | "modules" | "branding" | "navigation" | "seo" | "pixel";

interface SettingsFormProps {
    initialSettings: any;
    initialPaymentData: any;
}

export default function SettingsForm({ initialSettings, initialPaymentData }: SettingsFormProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [settings, setSettings] = useState<SiteSettings | null>(initialSettings);
    const [paymentData, setPaymentData] = useState({
        bankName: initialPaymentData?.bankName || "",
        accountNumber: initialPaymentData?.accountNumber || "",
        accountHolder: initialPaymentData?.accountHolder || "",
        currency: initialPaymentData?.currency || "USD",
        instructions: initialPaymentData?.instructions || "",
        gatewayEnabled: initialPaymentData?.gatewayEnabled ?? true,
        manualEnabled: initialPaymentData?.manualEnabled ?? true,
    });

    const [plan] = useState<string>(initialSettings?.plan || "Free");
    const [planPrice] = useState<number>(initialSettings?.planPrice || 0);
    const [allPlans] = useState<any[]>(initialSettings?.allPlans || []);
    const [isTrial] = useState<boolean>(initialSettings?.isTrial || false);
    const [trialEndsAt] = useState<string | null>(initialSettings?.trialEndsAt || null);
    const [isExpired] = useState<boolean>(initialSettings?.isExpired || false);
    const [isGracePeriod] = useState<boolean>(initialSettings?.isGracePeriod || false);
    const [planFeatures] = useState<any>(initialSettings?.planFeatures || {});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const activeTab = (searchParams.get("tab") as TabType) || "identity";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");

        try {
            const [settingsRes, paymentsRes] = await Promise.all([
                updateSiteSettingsAction(settings),
                savePaymentSettingsAction({
                    ...paymentData,
                    currency: settings?.currency || paymentData.currency || "IDR"
                })
            ]);

            if (!settingsRes.success || !paymentsRes.success) {
                throw new Error(settingsRes.error || paymentsRes.error || "Failed to save");
            }

            setMessage("Pengaturan berhasil disimpan!");
            router.refresh();
            setTimeout(() => setMessage(""), 3000);
        } catch (err: any) {
            setMessage(err.message || "Gagal menyimpan pengaturan.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!settings) return;
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement;
        const val = target.type === "checkbox" ? target.checked : target.value;
        setPaymentData({ ...paymentData, [target.name]: val });
    };

    if (!settings) return <div className="p-10 text-center font-bold">Gagal memuat pengaturan.</div>;

    const tabs: { id: TabType, label: string, icon: React.ReactNode, description: string }[] = [
        { id: "identity", label: "Identitas", icon: <Globe size={18} />, description: "Informasi dasar situs" },
        { id: "modules", label: "Fitur", icon: <Cpu size={18} />, description: "Aktifkan modul sistem" },
        { id: "branding", label: "Tampilan", icon: <Palette size={18} />, description: "Logo dan warna tema" },
        { id: "navigation", label: "Menu", icon: <LayoutTemplate size={18} />, description: "Header dan Footer" },
        { id: "seo", label: "SEO", icon: <Search size={18} />, description: "Optimasi mesin pencari" },
        { id: "pixel", label: "Pixel", icon: <BarChart2 size={18} />, description: "Meta & TikTok Pixel" },
    ];

    return (
        <form onSubmit={handleSubmit} className="w-full animate-in fade-in duration-700 pb-20 max-w-6xl mx-auto">
            <PageHeader
                title="Pengaturan Situs"
                subtitle="Kelola konfigurasi website Anda"
                icon={<Settings />}
            >
                <Button
                    type="submit"
                    loading={saving}
                    variant="primary"
                    className="px-6 shadow-lg shadow-primary/20"
                    icon={<Save size={14} />}
                >
                    Simpan Perubahan
                </Button>
            </PageHeader>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Master Tab Rail */}
                <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:sticky lg:top-24 self-start no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                router.push(`/dashboard/settings?tab=${tab.id}`, { scroll: false });
                            }}
                            className={`flex-none lg:w-full flex items-center gap-3 lg:gap-4 py-2 lg:py-3 px-3 rounded-xl lg:rounded-2xl transition-all duration-300 border ${activeTab === tab.id
                                    ? "bg-primary/5 text-primary shadow-sm border-primary/20 scale-[1.02]"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent opacity-70 hover:opacity-100"
                                }`}
                        >
                            <div className={`p-2 lg:p-3 rounded-lg lg:rounded-xl transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted"}`}>
                                {tab.icon}
                            </div>
                            <div className="text-left">
                                <p className="text-xs lg:text-sm font-black tracking-tight leading-none">{tab.label}</p>
                                <p className="hidden lg:block text-[10px] font-medium opacity-60 mt-1 leading-none">{tab.description}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Content Matrix Area */}
                <div className="flex-1 space-y-4 lg:space-y-6 min-w-0">
                    {activeTab === "identity" && (
                        <IdentityTab settings={settings} onChange={handleChange} />
                    )}

                    {activeTab === "modules" && (
                        <ModulesTab
                            settings={settings}
                            setSettings={setSettings}
                            paymentData={paymentData}
                            onSettingsChange={handleChange}
                            onPaymentChange={handlePaymentChange}
                            plan={plan}
                            planPrice={planPrice}
                            allPlans={allPlans}
                            isTrial={isTrial}
                            trialEndsAt={trialEndsAt}
                            isExpired={isExpired}
                            isGracePeriod={isGracePeriod}
                            planFeatures={planFeatures}
                        />
                    )}

                    {activeTab === "branding" && (
                        <BrandingTab settings={settings} onChange={handleChange} />
                    )}

                    {activeTab === "navigation" && (
                        <NavigationTab settings={settings} onChange={handleChange} />
                    )}

                    {activeTab === "seo" && (
                        <SEOTab settings={settings} onChange={handleChange} />
                    )}

                    {activeTab === "pixel" && (
                        <PixelTab settings={settings} onChange={handleChange} />
                    )}
                </div>
            </div>

            {/* Notification Status */}
            {message && (
                <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl text-[10px] font-black uppercase tracking-[0.2em] border animate-in fade-in slide-in-from-bottom-4 duration-500 z-50 ${message.includes("Error") || message.includes("Gagal")
                        ? "bg-red-500 text-white border-red-600"
                        : "bg-primary text-primary-foreground border-primary/20 shadow-xl shadow-primary/20"
                    }`}>
                    <div className="flex items-center gap-3">
                        {message.includes("Error") || message.includes("Gagal") ? <Info size={16} /> : <CheckCircle2 size={16} />}
                        {message}
                    </div>
                </div>
            )}
        </form>
    );
}
