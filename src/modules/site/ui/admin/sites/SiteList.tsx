"use client";

import React, { useState, useMemo } from "react";
import {
    Globe,
    ExternalLink,
    Search,
    Filter,
    Trash2,
    Settings,
    Loader2,
    CheckCircle2,
    Gift,
    CalendarPlus,
    UserPlus,
    Edit
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { AssignOwnerModal } from "@/components/ui/AssignOwnerModal";
import Link from "next/link";
import Portal from "@/components/ui/Portal";
import { TableContainer, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { deleteSiteAction, manageSiteAction, assignSiteOwnerAction, updateSiteSubdomainAction } from "@/modules/infrastructure/public-actions";
import { getRootDomain } from "@/lib/domains/utils";


export default function SiteList({ initialSites }: { initialSites: any[] }) {
    const [sites, setSites] = useState(initialSites);
    const [search, setSearch] = useState("");
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState<any | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [siteToAssign, setSiteToAssign] = useState<any | null>(null);
    const [assignLoading, setAssignLoading] = useState(false);

    // Edit Subdomain state
    const [showSubdomainModal, setShowSubdomainModal] = useState(false);
    const [siteToEditSubdomain, setSiteToEditSubdomain] = useState<any | null>(null);
    const [subdomainInput, setSubdomainInput] = useState("");
    const [subdomainLoading, setSubdomainLoading] = useState(false);
    const [subdomainError, setSubdomainError] = useState("");

    const filteredSites = useMemo(() => {
        return sites.filter(site =>
            site.name.toLowerCase().includes(search.toLowerCase()) ||
            site.subdomain.toLowerCase().includes(search.toLowerCase()) ||
            (site.customDomain?.toLowerCase().includes(search.toLowerCase()))
        );
    }, [sites, search]);

    const primarySiteIds = useMemo(() => {
        const ownerFirstSiteMap = new Map<string, string>();
        const ownerSitesMap = new Map<string, any[]>();
        
        for (const s of sites) {
            const email = s.users?.[0]?.email;
            if (email) {
                if (!ownerSitesMap.has(email)) {
                    ownerSitesMap.set(email, []);
                }
                ownerSitesMap.get(email)!.push(s);
            }
        }

        for (const [email, userSites] of ownerSitesMap.entries()) {
            const sorted = [...userSites].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            if (sorted[0]) {
                ownerFirstSiteMap.set(email, sorted[0].id);
            }
        }

        return ownerFirstSiteMap;
    }, [sites]);

    const handleDelete = async () => {
        if (!siteToDelete) return;
        const id = siteToDelete.id;

        setLoadingId(id);
        try {
            const res = await deleteSiteAction(id);
            if (res.success) {
                setSites(prev => prev.filter(s => s.id !== id));
            } else {
                alert(res.error || "Failed to delete site");
            }
        } catch (_error) {
            alert("Network error");
        } finally {
            setLoadingId(null);
            setShowDeleteModal(false);
            setSiteToDelete(null);
        }
    };

    const handleAction = async (id: string, action: string) => {
        setLoadingId(id);
        try {
            const res = await manageSiteAction(id, action);
            if (res.success) {
                // Refresh list or update local state
                window.location.reload();
            } else {
                alert(res.error || "Action failed");
            }
        } catch (_error) {
            alert("Network error");
        } finally {
            setLoadingId(null);
        }
    };

    const handleAssignOwner = async (email: string) => {
        if (!siteToAssign) return;
        setAssignLoading(true);
        try {
            const res = await assignSiteOwnerAction(siteToAssign.id, email);
            if (res.success) {
                window.location.reload();
            } else {
                throw new Error((res as any).error || "Gagal menghubungkan pemilik");
            }
        } catch (err: any) {
            throw err;
        } finally {
            setAssignLoading(false);
        }
    };

    const handleUpdateSubdomain = async () => {
        if (!siteToEditSubdomain) return;
        setSubdomainLoading(true);
        setSubdomainError("");
        try {
            const res = await updateSiteSubdomainAction(siteToEditSubdomain.id, subdomainInput);
            if (res.success) {
                window.location.reload();
            } else {
                setSubdomainError(res.error || "Gagal mengubah subdomain");
            }
        } catch (_err) {
            setSubdomainError("Koneksi gagal");
        } finally {
            setSubdomainLoading(false);
        }
    };


    const rootDomain = getRootDomain();


    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-6 text-foreground">
            <PageHeader
                title="Daftar Website"
                subtitle="Direktori seluruh website tenant dan status kesehatannya."
            >
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                        <input
                            type="text"
                            placeholder="Cari website..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-card border border-border rounded-md pl-8 pr-3 py-1.5 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 w-full md:w-56"
                        />
                    </div>
                    <button className="p-1.5 bg-card border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Filter size={12} />
                    </button>
                </div>
            </PageHeader>

            <TableContainer>
                <THead>
                    <TR>
                        <TH>Website</TH>
                        <TH>Pemilik</TH>
                        <TH>Paket</TH>
                        <TH>Dibuat Pada</TH>
                        <TH align="right">Aksi</TH>
                    </TR>
                </THead>
                <TBody>
                    {filteredSites.map((site) => {
                        const domain = site.customDomain || `${site.subdomain}.${rootDomain}`;
                        const protocol = rootDomain.includes("localhost") ? "http" : "https";
                        const siteUrl = `${protocol}://${domain}`;
                        const owner = site.users?.[0];
                        const sub = site.subscriptions?.[0];
                        
                        // Status Logic
                        const now = new Date();
                        let statusLabel = sub?.plan?.name || "Trial";
                        let statusColor = "bg-primary/10 text-primary";
                        let isTrial = false;

                        if (sub?.trialEndsAt) {
                            const trialEnd = new Date(sub.trialEndsAt);
                            if (now <= trialEnd) {
                                statusLabel = `Trial (${Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24))} hari)`;
                                statusColor = "bg-orange-500/10 text-orange-500";
                                isTrial = true;
                            } else {
                                const graceEnd = new Date(trialEnd);
                                graceEnd.setDate(graceEnd.getDate() + 30);
                                if (now <= graceEnd) {
                                    statusLabel = "Masa Tenggang";
                                    statusColor = "bg-amber-500/10 text-amber-500";
                                } else {
                                    statusLabel = "Kedaluwarsa";
                                    statusColor = "bg-red-500/10 text-red-500";
                                }
                            }
                        }

                        // Check if it is an addon site
                        const isAddon = owner?.email && primarySiteIds.get(owner.email) !== site.id;

                        return (
                            <TR key={site.id}>
                                <TD>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                            {site.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-bold text-foreground">{site.name}</p>
                                                {isAddon && (
                                                    <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest shrink-0 animate-in zoom-in duration-300">
                                                        Addon
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Globe size={10} /> {domain}
                                            </p>
                                        </div>
                                    </div>
                                </TD>
                                <TD>
                                    <p className="text-xs font-bold text-foreground">{owner?.name || "Anonymous"}</p>
                                    <p className="text-[10px] text-muted-foreground">{owner?.email || "N/A"}</p>
                                </TD>
                                <TD>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border border-current/10 ${statusColor}`}>
                                        <CheckCircle2 size={10} /> {statusLabel}
                                    </span>
                                </TD>
                                <TD>
                                    <p className="text-xs font-medium text-foreground">
                                        {new Date(site.createdAt).toLocaleDateString()}
                                    </p>
                                </TD>
                                <TD align="right">
                                    <div className="flex items-center justify-end gap-2">
                                        {loadingId === site.id ? (
                                            <Loader2 className="animate-spin text-primary" size={16} />
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setSiteToEditSubdomain(site);
                                                        setSubdomainInput(site.subdomain);
                                                        setSubdomainError("");
                                                        setShowSubdomainModal(true);
                                                    }}
                                                    className="p-2 hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-500 rounded-xl transition-all"
                                                    title="Ubah Subdomain"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSiteToAssign(site);
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="p-2 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 rounded-xl transition-all"
                                                    title="Hubungkan Pemilik"
                                                >
                                                    <UserPlus size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(site.id, "set_free")}
                                                    className="p-2 hover:bg-green-500/10 text-muted-foreground hover:text-green-500 rounded-xl transition-all"
                                                    title="Set ke Paket Gratis"
                                                >
                                                    <Gift size={14} />
                                                </button>

                                                {isTrial && !sub?.trialExtended && (
                                                    <button
                                                        onClick={() => handleAction(site.id, "extend_trial")}
                                                        className="p-2 hover:bg-orange-500/10 text-muted-foreground hover:text-orange-500 rounded-xl transition-all"
                                                        title="Perpanjang Trial 7 Hari"
                                                    >
                                                        <CalendarPlus size={14} />
                                                    </button>
                                                )}
                                                <Link
                                                    href={siteUrl}
                                                    target="_blank"
                                                    className="p-2 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-xl transition-all"
                                                    title="Lihat website"
                                                >
                                                    <ExternalLink size={14} />
                                                </Link>
                                                <a
                                                    href={`${protocol}://${rootDomain}/api/auth/bridge?target=${encodeURIComponent(`${siteUrl}/dashboard`)}`}
                                                    target="_blank"
                                                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all"
                                                    title="Buka dashboard situs"
                                                >
                                                    <Settings size={14} />
                                                </a>
                                                <button
                                                    onClick={() => {
                                                        setSiteToDelete(site);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl transition-all"
                                                    title="Hapus Situs"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </TD>
                            </TR>
                        );
                    })}
                </TBody>
            </TableContainer>
            {filteredSites.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Globe className="text-muted-foreground" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">Website tidak ditemukan</h4>
                    <p className="text-sm text-muted-foreground">Coba sesuaikan kata kunci pencarian Anda.</p>
                </div>
            )}

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Hapus Situs Permanen?"
                message="TINDAKAN KRITIS: Menghapus situs ini akan menghapus seluruh konten, halaman, dan media secara permanen. Lanjutkan?"
                confirmText="Ya, Hapus Segalanya"
                variant="danger"
            />

            <AssignOwnerModal
                isOpen={showAssignModal}
                onClose={() => {
                    setShowAssignModal(false);
                    setSiteToAssign(null);
                }}
                onConfirm={handleAssignOwner}
                title="Hubungkan Pemilik Baru"
                message={siteToAssign ? `Masukkan email pemilik baru untuk situs "${siteToAssign.name}" (${siteToAssign.subdomain})` : ""}
                loading={assignLoading}
            />

            {showSubdomainModal && siteToEditSubdomain && (
                <EditSubdomainModal
                    isOpen={showSubdomainModal}
                    onClose={() => {
                        setShowSubdomainModal(false);
                        setSiteToEditSubdomain(null);
                    }}
                    onConfirm={handleUpdateSubdomain}
                    subdomain={subdomainInput}
                    onChangeSubdomain={setSubdomainInput}
                    title="Ubah Subdomain Situs"
                    message={`Masukkan nama subdomain baru untuk situs "${siteToEditSubdomain.name}"`}
                    error={subdomainError}
                    loading={subdomainLoading}
                />
            )}
        </div>
    );
}

interface EditSubdomainModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    subdomain: string;
    onChangeSubdomain: (_val: string) => void;
    title: string;
    message: string;
    error?: string;
    loading?: boolean;
}

function EditSubdomainModal({
    isOpen,
    onClose,
    onConfirm,
    subdomain,
    onChangeSubdomain,
    title,
    message,
    error,
    loading
}: EditSubdomainModalProps) {
    if (!isOpen) return null;
    return (
        <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-6 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{title}</h3>
                    <p className="text-xs text-muted-foreground">{message}</p>
                    
                    {error && (
                        <p className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg uppercase tracking-wide">
                            {error}
                        </p>
                    )}

                    <div className="space-y-1">
                        <label htmlFor="editSubdomainInput" className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Subdomain Baru</label>
                        <input
                            id="editSubdomainInput"
                            type="text"
                            value={subdomain}
                            onChange={(e) => onChangeSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            placeholder="subdomain-baru"
                            className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-xs outline-none focus:border-primary font-mono text-foreground"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading || !subdomain.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {loading && <Loader2 size={12} className="animate-spin" />}
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

