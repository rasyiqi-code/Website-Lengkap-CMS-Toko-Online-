import React from "react";
import {
    LayoutDashboard,
    FileText,
    ShoppingBag,
    Users,
    Settings,
    Menu,
    Briefcase,
    Image as ImageIcon,
    Layers,
    CreditCard,
    Globe,
    Plus,
    ShieldCheck,
    Mail,
    MessageSquare,
    PenTool,
    Package,
    Network,
    Bot,
    Wallet
} from "lucide-react";
import { SiteSettings } from "@/types/site-settings";

interface NavItemConfig {
    href: string;
    icon: React.ReactNode;
    label: string;
    badge?: string;
    roles?: string[];
    enabled?: boolean;
}

interface NavSectionConfig {
    title: string | null;
    items: NavItemConfig[];
}

export const getNavConfig = (siteId: string | null, settings?: SiteSettings | null): NavSectionConfig[] => {
    if (siteId) {
        return [
            {
                title: null,
                items: [
                    { href: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Beranda", roles: ["admin", "owner", "editor", "user"] },
                ]
            },
            {
                title: "Dagang",
                items: [
                    { href: "/dashboard/products", icon: <ShoppingBag size={18} />, label: "Produk", roles: ["admin", "owner", "editor", "user"], enabled: !!settings?.enabledProducts },
                    { href: "/dashboard/orders", icon: <Package size={18} />, label: "Pesanan", roles: ["admin", "owner", "editor", "user"], enabled: !!settings?.enabledOrders },
                    { href: "/dashboard/customers", icon: <Users size={18} />, label: "Pelanggan", roles: ["admin", "owner", "editor", "user"], enabled: !!settings?.enabledCustomers },
                ].filter(item => item.enabled !== false)
            },
            {
                title: "Konten",
                items: [
                    { href: "/dashboard/pages", icon: <FileText size={18} />, label: "Halaman", roles: ["admin", "owner", "editor"] },
                    { href: "/dashboard/posts", icon: <PenTool size={18} />, label: "Artikel", roles: ["admin", "owner", "editor"], enabled: !!settings?.enabledPosts },
                    { href: "/dashboard/menus", icon: <Menu size={18} />, label: "Menu", roles: ["admin", "owner", "editor"] },
                    { href: "/dashboard/gallery", icon: <ImageIcon size={18} />, label: "Galeri", roles: ["admin", "owner", "editor"], enabled: !!settings?.enabledGallery },
                    { href: "/dashboard/portfolios", icon: <Briefcase size={18} />, label: "Portofolio", roles: ["admin", "owner", "editor"], enabled: !!settings?.enabledPortfolio },
                    { href: "/dashboard/taxonomies", icon: <Layers size={18} />, label: "Kategori", roles: ["admin", "owner", "editor"], enabled: !!settings?.enabledTaxonomies },
                    { href: "/dashboard/inbox", icon: <Mail size={18} />, label: "Pesan", roles: ["admin", "owner", "editor"], enabled: !!settings?.enabledInbox },
                    { href: "/dashboard/testimonials", icon: <MessageSquare size={18} />, label: "Testimoni", roles: ["admin", "owner", "editor"], enabled: !!settings?.enabledTestimonials },
                ].filter(item => item.enabled !== false)
            },
            {
                title: "Sistem",
                items: [
                    { href: "/dashboard/settings", icon: <Settings size={18} />, label: "Setelan", roles: ["admin", "owner"] },
                    { href: "/dashboard/media", icon: <ImageIcon size={18} />, label: "Media", roles: ["admin", "owner", "editor"] },
                    { href: "/dashboard/users", icon: <Users size={18} />, label: "Tim", roles: ["admin", "owner"] },
                ]
            },
            {
                title: "Otomasi",
                items: [
                    { href: "/dashboard/whatsapp", icon: <Bot size={18} />, label: "WhatsApp Bot", badge: "Segera", roles: ["admin", "owner"] },
                ]
            }
        ];
    }

    return [
        {
            title: "Platform",
            items: [
                { href: "/dashboard/sites", icon: <LayoutDashboard size={18} />, label: "Situs Saya", roles: ["owner", "editor", "user"] },
                { href: "/onboarding", icon: <Plus size={18} />, label: "Situs Baru", roles: ["owner", "editor", "user"] },
                { href: "/dashboard/billing", icon: <CreditCard size={18} />, label: "Tagihan", roles: ["owner", "editor", "user"] },
                { href: "/dashboard/subscriptions", icon: <FileText size={18} />, label: "Langganan", roles: ["owner", "editor", "user"] },
                { href: "/dashboard/finance", icon: <Wallet size={18} />, label: "Keuangan", roles: ["owner", "editor", "user"] },
                { href: "/dashboard/affiliate", icon: <Network size={18} />, label: "Program Afiliasi", roles: ["owner", "editor", "user"] },
            ]
        },
        {
            title: "Admin",
            items: [
                { href: "/admin", icon: <ShieldCheck size={18} />, label: "Panel Admin", roles: ["admin"] },
                { href: "/admin/sites", icon: <Globe size={18} />, label: "Semua Situs", roles: ["admin"] },
                { href: "/admin/users", icon: <Users size={18} />, label: "Semua User", roles: ["admin"] },
                { href: "/admin/settings", icon: <Settings size={18} />, label: "Setelan Platform", roles: ["admin"] },
            ]
        }
    ];
};
