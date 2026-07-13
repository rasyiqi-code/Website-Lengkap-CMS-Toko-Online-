import React from "react";
import { FileText, ShoppingBag, Eye, Image as ImageIcon, Plus, MessageSquare, ShieldCheck, Pencil, Store } from "lucide-react";
import Link from "next/link";
import { serializeOrders } from "@/lib/content/serialize";
import { getPaymentSettings } from "@/modules/shared/utils/settings/payment";
import { formatPrice } from "@/lib/billing/currency";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard, LibraryItem } from "@/components/ui/Stats";
import { getSiteId, getSiteAccessStatus } from "@/lib/domains/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PostClient } from "@/modules/post";
import { MediaClient } from "@/modules/media";
import { CatalogClient } from "@/modules/catalog";
import { OrderClient } from "@/modules/order";
import { SiteClient } from "@/modules/site";
import { SubscriptionClient } from "@/modules/subscription";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";

async function getStats(siteId: string | null) {
    if (!siteId) {
        return {
            counts: { posts: 0, products: 0, orders: 0, users: 0, media: 0, gallery: 0, portfolio: 0, messages: 0 },
            views: 0,
            storageUsed: 0,
            recentOrders: []
        };
    }

    try {
        const [
            postsCount,
            productsCount,
            ordersCount,
            mediaCount,
            galleryCount,
            portfolioCount,
            userIds,
            contactSubmissions,
            stats,
            mediaSize,
            recentOrdersRaw
        ] = await Promise.all([
            PostClient.countPosts(siteId),
            CatalogClient.countProducts(siteId),
            OrderClient.countOrders(siteId),
            MediaClient.countMediaItems(siteId),
            MediaClient.countGalleryItems(siteId),
            MediaClient.countPortfolioItems(siteId),
            SiteClient.getSiteUserIds(siteId),
            SiteClient.getContactSubmissions(siteId),
            SiteClient.getOrIncrementViews(siteId),
            MediaClient.getMediaSize(siteId),
            OrderClient.getRecentOrders(siteId, 5)
        ]);

        return {
            counts: {
                posts: postsCount,
                products: productsCount,
                orders: ordersCount,
                users: userIds.length,
                media: mediaCount,
                gallery: galleryCount,
                portfolio: portfolioCount,
                messages: contactSubmissions.length,
            },
            views: stats?.totalViews || 0,
            storageUsed: Number(mediaSize || 0),
            recentOrders: serializeOrders(recentOrdersRaw)
        };
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return {
            counts: { posts: 0, products: 0, orders: 0, users: 0, media: 0, gallery: 0, portfolio: 0, messages: 0 },
            views: 0,
            storageUsed: 0,
            recentOrders: []
        };
    }
}

import { LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const siteId = await getSiteId();
    const data = await getStats(siteId);
    const userName = session?.user?.name || "Chipster";
    
    // Fetch Subscription to get limits
    const subscription = siteId ? await SubscriptionClient.getActiveSubscription(siteId) : null;
    const plan = subscription?.plan as any;

    const settings = await SiteClient.getSiteSettings(siteId || undefined);
    const paymentSettings = await getPaymentSettings(siteId || undefined);
    const currency = paymentSettings.currency || "USD";
    const totalRevenue = data.recentOrders.reduce((acc, o) => acc + Number(o.total), 0);

    const siteStatus = siteId ? await getSiteAccessStatus() : "active";

    const trialDaysLeft = subscription?.trialEndsAt 
        ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : null;
    const progressPercent = trialDaysLeft !== null ? Math.min(100, Math.max(0, (trialDaysLeft / 14) * 100)) : 100;

    // Ambil role efektif pengguna di situs ini
    let userRole = "user";
    if (siteId && session?.user?.id) {
        if (session.user.role === "admin") {
            userRole = "owner";
        } else {
            const link = await db.siteUser.findUnique({
                where: {
                    siteId_userId: {
                        siteId,
                        userId: session.user.id
                    }
                },
                select: { role: true }
            });
            userRole = link?.role || "user";
        }
    } else if (!siteId && session?.user?.role === "admin") {
        userRole = "admin";
    } else if (!siteId) {
        userRole = "owner";
    }

    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-6 text-foreground">
            <PageHeader 
                title="Dasbor" 
                subtitle="Ringkasan Performa Situs" 
                icon={<LayoutDashboard />}
            />

            {/* Bento Greeting Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Premium Skyblue Welcome Bento Card */}
                <div className="lg:col-span-2">
                    <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-sky-500 to-sky-600 rounded-3xl p-6 md:p-8 shadow-xl shadow-sky-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-sky-400/20 group hover:shadow-2xl hover:shadow-sky-500/20 transition-all duration-500 h-full">
                        {/* Decorative background gradients */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-sky-300/20 blur-2xl pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                            {/* Plan Badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/15 text-white/90 border border-white/10 text-[9px] font-black uppercase tracking-widest">
                                <ShieldCheck size={12} className="text-yellow-400 fill-yellow-400/20 animate-pulse" />
                                <span>Akun {plan?.name || "Dasar"}</span>
                            </div>

                            <div>
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
                                    Halo, {userName}!
                                </h2>
                                <p className="text-xs md:text-sm text-sky-50/90 font-medium leading-relaxed max-w-xl mt-1.5">
                                    Lihat ringkasan aktivitas pelanggan dan kelola bisnis Anda dari satu tempat.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                {(!siteId || settings?.enabledProducts) && (
                                    <Link 
                                        href="/dashboard/products/new"
                                        className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-yellow-500/10 hover:shadow-lg hover:shadow-yellow-500/20"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                        <span>Tambah Produk</span>
                                    </Link>
                                )}
                                {(!siteId || settings?.enabledPosts) && ["admin", "owner", "editor"].includes(userRole) && (
                                    <Link 
                                        href="/dashboard/posts/new"
                                        className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                        <span>Tambah Konten</span>
                                    </Link>
                                )}
                                {["admin", "owner"].includes(userRole) && (
                                    <Link 
                                        href="/dashboard/settings"
                                        className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300"
                                    >
                                        <Pencil size={11} strokeWidth={3} />
                                        <span>Setelan Toko</span>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Right side Store Watermark Icon */}
                        <div className="relative z-10 hidden md:block shrink-0 md:mr-4 select-none pointer-events-none group-hover:scale-105 group-hover:rotate-6 transition-all duration-500">
                            <Store className="w-28 h-28 text-white/10" strokeWidth={1} />
                        </div>
                    </div>
                </div>

                {/* Right: Premium Status Sidebar Card */}
                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full group hover:shadow-2xl hover:border-sky-500/30 transition-all duration-500">
                        {/* Background light gradient on hover */}
                        <div className="absolute -right-20 -bottom-20 w-44 h-44 rounded-full bg-sky-500/5 blur-3xl pointer-events-none group-hover:bg-sky-500/10 transition-colors duration-700" />
                        
                        <div className="space-y-4 relative z-10">
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    Status Akun &amp; Limit
                                </span>
                                <span className="flex h-2 w-2 relative">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                        siteStatus === "grace_period" ? "bg-amber-400" : siteStatus === "expired" ? "bg-red-400" : "bg-green-400"
                                    }`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                        siteStatus === "grace_period" ? "bg-amber-500" : siteStatus === "expired" ? "bg-red-500" : "bg-green-500"
                                    }`}></span>
                                </span>
                            </div>

                            {/* Plan Content */}
                            {trialDaysLeft !== null && siteStatus === "active" ? (
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-foreground tracking-tight">
                                                {trialDaysLeft}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground">Hari</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium mt-1 flex flex-wrap items-center gap-1.5">
                                            Masa Trial Paket <span className="font-bold text-sky-500 uppercase">{plan?.name || "Dasar"}</span>
                                            {subscription?.addonSlots > 0 && (
                                                <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest animate-in zoom-in duration-300">
                                                    + {subscription.addonSlots} Addon
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Beautiful Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] font-mono text-muted-foreground opacity-70">
                                            <span>Mulai</span>
                                            <span>Selesai (14 Hari)</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight flex flex-wrap items-center gap-1.5">
                                        Paket {plan?.name || "Dasar"}
                                        {subscription?.addonSlots > 0 && (
                                            <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest animate-in zoom-in duration-300">
                                                + {subscription.addonSlots} Addon
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        {siteStatus === "grace_period" 
                                            ? "Masa berlaku uji coba Anda telah berakhir. Harap selesaikan pembayaran paket langganan Anda."
                                            : siteStatus === "expired"
                                            ? "Langganan Anda telah kedaluwarsa. Situs ini dinonaktifkan hingga pembayaran dilakukan."
                                            : "Akun Anda dalam kondisi aktif. Nikmati fitur premium pembuatan web otomatis tanpa batas!"
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Feature limits list */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="bg-muted/30 hover:bg-muted/50 rounded-xl p-2.5 border border-border/40 transition-colors">
                                    <span className="block text-[8px] font-mono text-muted-foreground uppercase">Limit Produk</span>
                                    <span className="text-xs font-black text-foreground">
                                        {data.counts.products}{plan?.maxProducts && plan.maxProducts !== -1 ? ` / ${plan.maxProducts}` : " / ⚡"}
                                    </span>
                                </div>
                                <div className="bg-muted/30 hover:bg-muted/50 rounded-xl p-2.5 border border-border/40 transition-colors">
                                    <span className="block text-[8px] font-mono text-muted-foreground uppercase">Limit Artikel</span>
                                    <span className="text-xs font-black text-foreground">
                                        {data.counts.posts}{plan?.maxPosts && plan.maxPosts !== -1 ? ` / ${plan.maxPosts}` : " / ⚡"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Upgrade Button */}
                        {["admin", "owner"].includes(userRole) && (
                            <div className="pt-4 relative z-10">
                                <Link 
                                    href="/dashboard/billing"
                                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-sky-500/10 hover:shadow-lg hover:shadow-sky-500/20"
                                >
                                    <span>Kelola Berlangganan</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Omzet" 
                    value={formatPrice(totalRevenue, currency)} 
                    icon={<ShoppingBag size={14} />} 
                    description="Transaksi Hari Ini"
                />
                <StatCard 
                    title="Kunjungan" 
                    value={data.views.toLocaleString()} 
                    icon={<Eye size={14} />} 
                    description="Total Pengunjung"
                />
                <StatCard 
                    title="Aset" 
                    value={`${data.counts.media}${plan?.maxAssets && plan.maxAssets !== -1 ? ` / ${plan.maxAssets}` : ""}`} 
                    icon={<ImageIcon size={14} />} 
                    description={`${(data.storageUsed / 1024 / 1024).toFixed(2)} MB Digunakan`}
                />
                <StatCard 
                    title="Akses" 
                    value={data.counts.users.toString()} 
                    icon={<Plus size={14} />} 
                    description="Anggota Tim"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Recent Activity */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Aktivitas</h3>
                        <Link href="/dashboard/orders" className="text-[9px] font-black text-primary hover:opacity-80 uppercase tracking-[0.2em] transition-all">Semua</Link>
                    </div>
                    <div className="bg-card rounded-md border border-border divide-y divide-border overflow-hidden shadow-xl">
                        {data.recentOrders.length > 0 ? (
                            data.recentOrders.map((order) => (
                                <div key={order.id} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded bg-muted/20 flex items-center justify-center text-foreground border border-border group-hover:border-primary/30 transition-colors">
                                            <ShoppingBag size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-foreground tracking-tight uppercase">{order.customerName}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-60">#{order.id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-foreground tracking-tight">{formatPrice(order.total, currency)}</p>
                                        <p className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState 
                                icon={<ShoppingBag size={32} />} 
                                message="Belum ada aktivitas." 
                                className="border-none py-16"
                            />
                        )}
                    </div>
                </div>

                {/* Right: Collections */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Koleksi</h3>
                        <div className="bg-card rounded-md border border-border divide-y divide-border overflow-hidden shadow-lg">
                            <LibraryItem 
                                label="Artikel" 
                                value={`${data.counts.posts}${plan?.maxPosts && plan.maxPosts !== -1 ? ` / ${plan.maxPosts}` : ""}`} 
                                icon={<FileText size={14} />} 
                                href="/dashboard/posts" 
                            />
                            <LibraryItem 
                                label="Produk" 
                                value={`${data.counts.products}${plan?.maxProducts && plan.maxProducts !== -1 ? ` / ${plan.maxProducts}` : ""}`} 
                                icon={<ShoppingBag size={14} />} 
                                href="/dashboard/products" 
                            />
                            <LibraryItem label="Pesan" value={data.counts.messages} icon={<MessageSquare size={14} />} href="/dashboard/inbox" />
                            <LibraryItem label="Media" value={data.counts.media} icon={<ImageIcon size={14} />} href="/dashboard/media" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

