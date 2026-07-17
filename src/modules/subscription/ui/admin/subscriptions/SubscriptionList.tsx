"use client";

import React, { useState, useMemo } from "react";
import { CreditCard, Search, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { TableContainer, THead, TBody, TR, TH } from "@/components/ui/Table";

import { SubscriptionTableRow } from "@/components/dashboard/subscriptions/SubscriptionTableRow";
import { SubscriptionDetailModal } from "@/components/dashboard/subscriptions/SubscriptionDetailModal";
import { manageSubscriptionAction } from "@/modules/subscription/public-actions";
import { getRootDomain } from "@/lib/domains/utils";

export default function SubscriptionList({ initialSubscriptions }: { initialSubscriptions: any[] }) {
    const [subs, _setSubs] = useState(initialSubscriptions);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedSub, setSelectedSub] = useState<any | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [subToCancel, setSubToCancel] = useState<any | null>(null);
    const [viewSitesSub, setViewSitesSub] = useState<any | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Follow-up States
    const [showFollowupModal, setShowFollowupModal] = useState(false);
    const [subToFollowup, setSubToFollowup] = useState<any | null>(null);
    const [followupPhone, setFollowupPhone] = useState("");
    const [followupMessage, setFollowupMessage] = useState("");
    const [isSendingFollowup, setIsSendingFollowup] = useState(false);
    const [isSendingEmailFollowup, setIsSendingEmailFollowup] = useState(false);

    const rootDomain = getRootDomain();

    const handleOpenFollowup = (sub: any) => {
        setSubToFollowup(sub);
        const ownerName = sub.site?.users?.[0]?.name || "Pelanggan";
        const subdomain = sub.site?.subdomain || "";
        const planName = (sub.plan?.name || "Premium").toUpperCase();
        
        let targetPhone = sub.site?.siteSettings?.whatsappNumber || sub.site?.siteSettings?.contactPhone || "";
        // Clean targetPhone - just keep numbers
        targetPhone = targetPhone.replace(/[^0-9]/g, "");
        setFollowupPhone(targetPhone);

        // Prepopulate based on status
        let initialMsg = "";
        const siteUrl = `${subdomain}.${rootDomain}`;

        const isTrial = sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date();
        const formattedEndDate = sub.endDate || sub.trialEndsAt
            ? new Date(sub.endDate || sub.trialEndsAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric"
            })
            : "";

        if (isTrial) {
            initialMsg = `*SitusBisnis - Masa Uji Coba (Trial) Berakhir* ⏳\n\nHalo *${ownerName}*,\n\nTerima kasih telah mencoba layanan *SitusBisnis* untuk website Anda (*${siteUrl}*).\n\nMasa uji coba (trial) Anda akan segera berakhir pada *${formattedEndDate}*.\n\nAyo tingkatkan ke paket premium untuk terus menikmati fitur lengkap dan mengelola bisnis Anda tanpa hambatan!\n\nUpgrade sekarang: *https://${rootDomain}/dashboard/billing*\n\n_Pesan ini dikirim oleh tim SitusBisnis._`;
        } else if (sub.status === "active") {
            initialMsg = `*SitusBisnis - Pengingat Langganan* 🔔\n\nHalo *${ownerName}*,\n\nKami ingin menginformasikan bahwa paket langganan *${planName}* untuk website Anda (*${siteUrl}*) aktif hingga *${formattedEndDate}*.\n\nPastikan untuk memantau siklus billing Anda agar tidak terjadi gangguan layanan pada situs bisnis Anda.\n\nInfo selengkapnya: *https://${rootDomain}/dashboard/billing*\n\n_Pesan ini dikirim oleh tim SitusBisnis._`;
        } else {
            const statusIndo = sub.status === "past_due" ? "Jatuh Tempo" : sub.status === "cancelled" ? "Dibatalkan/Nonaktif" : sub.status;
            initialMsg = `*SitusBisnis - Hubungi Kami / Aktivasi Kembali* ⚠️\n\nHalo *${ownerName}*,\n\nLayanan langganan untuk website Anda (*${siteUrl}*) saat ini berstatus *${statusIndo}*.\n\nAyo aktifkan kembali layanan paket bisnis Anda sekarang agar pelanggan tetap dapat mengakses website bisnis Anda dengan lancar.\n\nAktifkan kembali di: *https://${rootDomain}/dashboard/billing*\n\nJika ada kendala, silakan hubungi tim support kami.\n\n_Pesan ini dikirim oleh tim SitusBisnis._`;
        }
        setFollowupMessage(initialMsg);
        setShowFollowupModal(true);
    };

    const handleSendFollowupAPI = async () => {
        if (!subToFollowup || !followupPhone || !followupMessage) return;
        setIsSendingFollowup(true);
        try {
            const res = await manageSubscriptionAction(subToFollowup.id, {
                action: "followup",
                phone: followupPhone,
                message: followupMessage
            });
            if (res.success) {
                alert("WhatsApp follow-up berhasil dikirim via StarSender API!");
                setShowFollowupModal(false);
                setSubToFollowup(null);
            } else {
                alert(res.error || "Gagal mengirim WhatsApp followup");
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan jaringan.");
        } finally {
            setIsSendingFollowup(false);
        }
    };

    const handleSendEmailFollowup = async () => {
        if (!subToFollowup || !followupMessage) return;
        setIsSendingEmailFollowup(true);
        try {
            const ownerEmail = subToFollowup.site?.users?.[0]?.email;
            if (!ownerEmail) {
                alert("Email penyewa tidak ditemukan.");
                setIsSendingEmailFollowup(false);
                return;
            }

            const res = await manageSubscriptionAction(subToFollowup.id, {
                action: "followup_email",
                email: ownerEmail,
                message: followupMessage
            });
            if (res.success) {
                alert("Email follow-up berhasil dikirim via Resend!");
                setShowFollowupModal(false);
                setSubToFollowup(null);
            } else {
                alert(res.error || "Gagal mengirim email followup");
            }
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan jaringan.");
        } finally {
            setIsSendingEmailFollowup(false);
        }
    };

    const handleSendFollowupManual = () => {
        if (!followupPhone || !followupMessage) return;
        let cleanPhone = followupPhone.replace(/[^0-9]/g, "");
        if (cleanPhone.startsWith("0")) {
            cleanPhone = "62" + cleanPhone.slice(1);
        }
        const encodedText = encodeURIComponent(followupMessage);
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        window.open(waUrl, "_blank");
        
        setShowFollowupModal(false);
        setSubToFollowup(null);
    };

    const groupedSubs = useMemo(() => {
        const seenEmails = new Set<string>();
        const uniqueSubs: any[] = [];

        for (const sub of subs) {
            const ownerEmail = sub.site?.users?.[0]?.email;
            if (ownerEmail) {
                if (!seenEmails.has(ownerEmail)) {
                    seenEmails.add(ownerEmail);
                    const ownerSubs = subs.filter(s => s.site?.users?.[0]?.email === ownerEmail);
                    
                    // Sort to find the best representative subscription for this account
                    const sortedSubs = [...ownerSubs].sort((a, b) => {
                        // 1. Prefer active status
                        if (a.status === "active" && b.status !== "active") return -1;
                        if (a.status !== "active" && b.status === "active") return 1;
                        
                        // 2. Prefer paid plans (higher maxSites or price)
                        const aMaxSites = a.plan?.maxSites || 0;
                        const bMaxSites = b.plan?.maxSites || 0;
                        if (aMaxSites !== bMaxSites) return bMaxSites - aMaxSites;
                        
                        // 3. Prefer more addonSlots
                        if (a.addonSlots !== b.addonSlots) return b.addonSlots - a.addonSlots;
                        
                        // 4. Default: newest first
                        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
                    });

                    const primarySub = sortedSubs[0];
                    const ownerSites = ownerSubs.map(s => ({
                        name: s.site.name,
                        subdomain: s.site.subdomain,
                        status: s.status,
                        planName: s.plan?.name
                    }));
                    
                    uniqueSubs.push({
                        ...primarySub,
                        allSites: ownerSites
                    });
                }
            } else {
                uniqueSubs.push({
                    ...sub,
                    allSites: sub.site ? [{
                        name: sub.site.name,
                        subdomain: sub.site.subdomain,
                        status: sub.status,
                        planName: sub.plan?.name
                    }] : []
                });
            }
        }
        return uniqueSubs;
    }, [subs]);

    const filteredSubs = useMemo(() => {
        return groupedSubs.filter(sub => {
            const owner = sub.site?.users?.[0];
            
            const matchesOwner = (owner?.name || "").toLowerCase().includes(search.toLowerCase()) ||
                                 (owner?.email || "").toLowerCase().includes(search.toLowerCase());
                                 
            const matchesSites = sub.allSites.some((site: any) => 
                (site.name || "").toLowerCase().includes(search.toLowerCase()) ||
                (site.subdomain || "").toLowerCase().includes(search.toLowerCase())
            );

            const matchesSearch = matchesOwner || matchesSites;
            const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [groupedSubs, search, statusFilter]);

    const handleCancelSubscription = async () => {
        if (!subToCancel) return;
        setIsUpdating(true);
        try {
            const res = await manageSubscriptionAction(subToCancel.id, { action: "cancel" });
            if (res.success) {
                _setSubs(prev => prev.map(s => s.id === subToCancel.id ? { ...s, status: "cancelled" } : s));
                setShowCancelModal(false);
                setSubToCancel(null);
            } else {
                alert(res.error || "Failed to cancel subscription");
            }
        } catch (_err) {
            alert("Network error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExtendSubscription = async (id: string) => {
        setIsUpdating(true);
        try {
            const res = await manageSubscriptionAction(id, { action: "extend", days: 7 });
            if (res.success && res.result) {
                const data = res.result as any;
                _setSubs(prev => prev.map(s => {
                    if (s.id === id) {
                        return { 
                            ...s, 
                            endDate: data.newEndDate,
                            status: "active",
                            plan: data.newPlanObj ? data.newPlanObj : s.plan
                        };
                    }
                    return s;
                }));
                alert(`Subscription extended by 7 days. Plan: ${data.newPlan || 'Unchanged'}`);
            } else {
                alert(res.error || "Failed to extend subscription");
            }
        } catch (_err) {
            alert("Network error");
        } finally {
            setIsUpdating(false);
            setOpenDropdownId(null);
        }
    };

    const handleUpdateSuccess = (subId: string, newPlan: any) => {
        _setSubs(prev => prev.map(s => s.id === subId ? { ...s, plan: newPlan, planId: newPlan.id, status: "active" } : s));
    };

    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-6 text-foreground">
            <PageHeader 
                title="Langganan Platform" 
                subtitle="Monitor seluruh paket langganan aktif dan riwayat pendapatan dari penyewa website." 
            >
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                        <input 
                            type="text" 
                            placeholder="Cari situs..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-card border border-border rounded-md pl-8 pr-3 py-1.5 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-56"
                        />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="p-1.5 bg-card border border-border rounded-md text-[10px] font-bold uppercase outline-none focus:border-primary transition-all cursor-pointer"
                    >
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="past_due">Jatuh Tempo</option>
                        <option value="cancelled">Dibatalkan</option>
                    </select>
                </div>
            </PageHeader>

            <TableContainer className="overflow-visible">
                <THead>
                    <TR>
                        <TH>Penyewa</TH>
                        <TH>Detail Paket</TH>
                        <TH>Status</TH>
                        <TH>Siklus Tagihan</TH>
                        <TH align="right">Aksi</TH>
                    </TR>
                </THead>
                <TBody>
                    {filteredSubs.map((sub, index) => (
                        <SubscriptionTableRow 
                            key={sub.id}
                            sub={sub}
                            rootDomain={rootDomain}
                            openDropdownId={openDropdownId}
                            setOpenDropdownId={setOpenDropdownId}
                            isUpdating={isUpdating}
                            handleExtendSubscription={handleExtendSubscription}
                            setSubToCancel={setSubToCancel}
                            setShowCancelModal={setShowCancelModal}
                            setSelectedSub={setSelectedSub}
                            isLast={index === filteredSubs.length - 1}
                            onViewSites={(s) => setViewSitesSub(s)}
                            onFollowup={(s) => handleOpenFollowup(s)}
                        />
                    ))}
                </TBody>
            </TableContainer>
            {filteredSubs.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="text-muted-foreground" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">Langganan tidak ditemukan</h4>
                    <p className="text-sm text-muted-foreground">Coba sesuaikan kata kunci atau filter penyaringan Anda.</p>
                </div>
            )}

            <SubscriptionDetailModal 
                selectedSub={selectedSub}
                rootDomain={rootDomain}
                onClose={() => setSelectedSub(null)}
                onUpdateSuccess={handleUpdateSuccess}
            />

            <ConfirmationModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancelSubscription}
                title="Suspensi Langganan?"
                message={`Apakah Anda yakin ingin menangguhkan langganan untuk akun "${subToCancel?.site?.users?.[0]?.name || subToCancel?.site?.name}"? Tindakan ini akan membatasi akses fitur berbayar.`}
                confirmText={isUpdating ? "Processing..." : "Ya, Tangguhkan"}
                variant="danger"
            />

            {viewSitesSub && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    Daftar Website Terdaftar
                                </h3>
                                <button 
                                    onClick={() => setViewSitesSub(null)}
                                    className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest"
                                >
                                    Tutup
                                </button>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-semibold">
                                    Akun: {viewSitesSub.site?.users?.[0]?.name || "Tanpa Nama"}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    {viewSitesSub.site?.users?.[0]?.email}
                                </p>
                            </div>
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {viewSitesSub.allSites.map((site: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-muted/30 rounded-2xl border border-border flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-foreground">{site.name}</p>
                                            <p className="text-[9px] text-muted-foreground font-mono">{site.subdomain}.{rootDomain}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary uppercase border border-primary/20">
                                                {site.planName || "Free"}
                                            </span>
                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                                site.status === "active" 
                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            }`}>
                                                {site.status === "active" ? "Aktif" : site.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showFollowupModal && subToFollowup && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 text-foreground">
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <MessageSquare size={16} className="text-emerald-500" /> WhatsApp Follow-Up
                                </h3>
                                <button 
                                    onClick={() => {
                                        setShowFollowupModal(false);
                                        setSubToFollowup(null);
                                    }}
                                    className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest"
                                >
                                    Tutup
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-2">
                                    <p className="text-xs text-muted-foreground font-semibold">
                                        Penyewa: <span className="text-foreground font-bold">{subToFollowup.site?.users?.[0]?.name || "Tanpa Nama"}</span> ({subToFollowup.site?.users?.[0]?.email})
                                    </p>
                                    <p className="text-xs text-muted-foreground font-semibold">
                                        Nama Situs: <span className="text-foreground font-bold">{subToFollowup.site?.name}</span> ({subToFollowup.site?.subdomain}.{rootDomain})
                                    </p>
                                    <p className="text-xs text-muted-foreground font-semibold">
                                        Status Langganan: <span className="uppercase font-extrabold text-primary">{subToFollowup.status}</span>
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="followup-phone" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Nomor WhatsApp Tujuan
                                    </label>
                                    <input 
                                        id="followup-phone"
                                        type="text" 
                                        value={followupPhone}
                                        onChange={(e) => setFollowupPhone(e.target.value)}
                                        placeholder="Contoh: 628123456789"
                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="followup-message" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Pesan WhatsApp
                                    </label>
                                    <textarea 
                                        id="followup-message"
                                        rows={6}
                                        value={followupMessage}
                                        onChange={(e) => setFollowupMessage(e.target.value)}
                                        placeholder="Tulis pesan follow-up..."
                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                <button
                                    onClick={handleSendFollowupAPI}
                                    disabled={isSendingFollowup || isSendingEmailFollowup || !followupPhone || !followupMessage}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                                >
                                    {isSendingFollowup ? "Mengirim..." : "Kirim WA (StarSender)"}
                                </button>
                                <button
                                    onClick={handleSendFollowupManual}
                                    disabled={isSendingFollowup || isSendingEmailFollowup || !followupPhone || !followupMessage}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700 transition-colors py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                                >
                                    Kirim WA (Manual)
                                </button>
                                <button
                                    onClick={handleSendEmailFollowup}
                                    disabled={isSendingFollowup || isSendingEmailFollowup || !followupMessage}
                                    className="bg-blue-600 text-white hover:bg-blue-700 transition-colors py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                                >
                                    {isSendingEmailFollowup ? "Mengirim..." : "Kirim Email (Resend)"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
