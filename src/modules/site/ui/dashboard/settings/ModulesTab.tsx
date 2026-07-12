import React from "react";
import { SiteSettings } from "@/modules/site/ui/site-settings";
import { 
    PenTool, 
    ImageIcon, 
    ShoppingCart, 
    Package, 
    Briefcase, 
    Tags, 
    MessageSquare, 
    Inbox,
    Cpu,
    CreditCard,
    Users
} from "lucide-react";
import { PlanStatusBanner } from "./modules/PlanStatusBanner";
import { ModuleCategoryCard } from "./modules/ModuleCategoryCard";
import { GlobalInteractions } from "./modules/GlobalInteractions";
import { PaymentInstructions } from "./modules/PaymentInstructions";

interface ModulesTabProps {
    settings: SiteSettings;
    setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
    onSettingsChange: (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    paymentData: {
        bankName: string;
        accountNumber: string;
        accountHolder: string;
        instructions: string;
    };
    onPaymentChange: (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    plan: string;
    planPrice: number;
    allPlans: any[];
    isTrial?: boolean;
    trialEndsAt?: string | null;
    isExpired?: boolean;
    isGracePeriod?: boolean;
    planFeatures: any;
}

export const ModulesTab = ({ 
    settings, 
    setSettings, 
    onSettingsChange, 
    paymentData,
    onPaymentChange,
    plan,
    planPrice,
    allPlans,
    isTrial = false,
    trialEndsAt = null,
    isExpired = false,
    isGracePeriod = false,
    planFeatures
}: ModulesTabProps) => {
    const isFree = planPrice === 0;

    const moduleCategories = [
        {
            title: "Redaksional & Konten",
            description: "Modul untuk pengelolaan konten statis dan dinamis.",
            icon: <PenTool size={16} />,
            modules: [
                { id: "enabledPosts", label: "Blog / Artikel", icon: <PenTool size={14} />, planKey: "hasBlog", desc: "Tulis dan publikasikan artikel." },
                { id: "enabledGallery", label: "Galeri Foto", icon: <ImageIcon size={14} />, planKey: "hasGallery", desc: "Kelola album dan koleksi gambar." },
                { id: "enabledPortfolio", label: "Portofolio", icon: <Briefcase size={14} />, planKey: "hasPortfolio", desc: "Tampilkan hasil karya terbaik Anda." },
            ]
        },
        {
            title: "E-Commerce",
            description: "Fitur untuk berjualan dan transaksi online.",
            icon: <ShoppingCart size={16} />,
            modules: [
                { id: "enabledProducts", label: "Katalog Produk", icon: <Package size={14} />, planKey: "hasProducts", desc: "Kelola inventaris barang dagangan." },
                { id: "enabledOrders", label: "Sistem Pesanan", icon: <CreditCard size={14} />, planKey: "hasOrders", desc: "Terima dan kelola pesanan masuk." },
                { id: "enabledCustomers", label: "Daftar Pelanggan", icon: <Users size={14} />, planKey: "hasCustomers", desc: "Kelola data kontak & riwayat belanja pelanggan." },
                { id: "enabledWhatsappCheckout", label: "Transaksi via WhatsApp", icon: <MessageSquare size={14} />, planKey: "hasOrders", desc: "Kirim detail pesanan langsung ke WhatsApp pelanggan." },
                { id: "showCart", label: "Keranjang Belanja", icon: <ShoppingCart size={14} />, planKey: "hasCart", desc: "Aktifkan ikon keranjang belanja." },
            ]
        },
        {
            title: "Fitur Lanjutan",
            description: "Modul cerdas untuk skalabilitas data.",
            icon: <Cpu size={16} />,
            modules: [
                { id: "enabledTaxonomies", label: "Kategori & Tag", icon: <Tags size={14} />, planKey: "hasTaxonomies", desc: "Gunakan sistem pengelompokan konten." },
                { id: "enabledTestimonials", label: "Testimoni", icon: <MessageSquare size={14} />, planKey: "hasTestimonials", desc: "Tampilkan ulasan dari pelanggan." },
                { id: "enabledInbox", label: "Kotak Pesan", icon: <Inbox size={14} />, planKey: "hasInbox", desc: "Pusat pesan dari formulir kontak." },
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <PlanStatusBanner 
                plan={plan} 
                planPrice={planPrice} 
                allPlans={allPlans} 
                isFree={isFree} 
                isTrial={isTrial} 
                trialEndsAt={trialEndsAt}
                isExpired={isExpired}
                isGracePeriod={isGracePeriod}
            />

            {moduleCategories.map((cat, idx) => (
                <ModuleCategoryCard 
                    key={idx}
                    category={cat}
                    settings={settings}
                    setSettings={setSettings}
                    plan={plan}
                    planFeatures={planFeatures}
                />
            ))}

            <GlobalInteractions 
                settings={settings}
                setSettings={setSettings}
                onSettingsChange={onSettingsChange}
            />

            {(settings.enabledOrders || settings.enabledProducts) && (
                <PaymentInstructions 
                    paymentData={paymentData}
                    onPaymentChange={onPaymentChange}
                />
            )}
        </div>
    );
};
