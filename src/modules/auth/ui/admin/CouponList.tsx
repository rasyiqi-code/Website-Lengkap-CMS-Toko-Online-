"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { TableContainer, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Search, Plus, Trash2, Edit, Ticket, Check, X, Percent, Calendar } from "lucide-react";
import { createCouponAction, updateCouponAction, deleteCouponAction } from "@/modules/financial/public-actions";

interface Affiliate {
    id: string;
    name: string | null;
    email: string | null;
}

interface Coupon {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    affiliateId: string | null;
    affiliate?: Affiliate | null;
    expiryDate: string | null;
    maxUses: number | null;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
}

interface CouponListProps {
    initialCoupons: Coupon[];
    affiliates: Affiliate[];
}

export default function CouponList({ initialCoupons, affiliates }: CouponListProps) {
    const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

    // Form fields
    const [code, setCode] = useState("");
    const [discountType, setDiscountType] = useState("percentage");
    const [discountValue, setDiscountValue] = useState("");
    const [affiliateId, setAffiliateId] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [maxUses, setMaxUses] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [formError, setFormError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Delete state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filtered = coupons.filter((c) => {
        const matchSearch = c.code.toLowerCase().includes(search.toLowerCase());
        const now = new Date();
        const isExpired = c.expiryDate && new Date(c.expiryDate) < now;
        const isUsageExceeded = c.maxUses !== null && c.usedCount >= c.maxUses;

        let matchStatus = true;
        if (statusFilter === "active") {
            matchStatus = c.isActive && !isExpired && !isUsageExceeded;
        } else if (statusFilter === "inactive") {
            matchStatus = !c.isActive;
        } else if (statusFilter === "expired") {
            matchStatus = !!isExpired;
        } else if (statusFilter === "exhausted") {
            matchStatus = isUsageExceeded;
        }

        return matchSearch && matchStatus;
    });

    const openCreateModal = () => {
        setModalMode("create");
        setSelectedCoupon(null);
        setCode("");
        setDiscountType("percentage");
        setDiscountValue("");
        setAffiliateId("");
        setExpiryDate("");
        setMaxUses("");
        setIsActive(true);
        setFormError("");
        setIsModalOpen(true);
    };

    const openEditModal = (coupon: Coupon) => {
        setModalMode("edit");
        setSelectedCoupon(coupon);
        setCode(coupon.code);
        setDiscountType(coupon.discountType);
        setDiscountValue(coupon.discountValue.toString());
        setAffiliateId(coupon.affiliateId || "");
        setExpiryDate(coupon.expiryDate ? coupon.expiryDate.split("T")[0] : "");
        setMaxUses(coupon.maxUses ? coupon.maxUses.toString() : "");
        setIsActive(coupon.isActive);
        setFormError("");
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setIsSaving(true);

        if (!code.trim()) {
            setFormError("Kode kupon wajib diisi");
            setIsSaving(false);
            return;
        }
        if (!discountValue || parseFloat(discountValue) <= 0) {
            setFormError("Nilai diskon harus lebih besar dari 0");
            setIsSaving(false);
            return;
        }

        const payload = {
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: parseFloat(discountValue),
            affiliateId: affiliateId || null,
            expiryDate: expiryDate || null,
            maxUses: maxUses ? parseInt(maxUses) : null,
            isActive
        };

        try {
            let res;
            if (modalMode === "create") {
                res = await createCouponAction(payload);
            } else {
                res = await updateCouponAction(selectedCoupon!.id, payload);
            }

            if (res.success && res.result) {
                const savedCoupon = res.result as any;
                if (modalMode === "create") {
                    setCoupons((prev) => [savedCoupon, ...prev]);
                } else {
                    setCoupons((prev) => prev.map((c) => (c.id === savedCoupon.id ? savedCoupon : c)));
                }
                setIsModalOpen(false);
            } else {
                setFormError(res.error || "Gagal menyimpan kupon");
            }
        } catch (err) {
            console.error(err);
            setFormError("Terjadi kesalahan koneksi internet.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTargetId) return;
        setIsDeleting(true);

        try {
            const res = await deleteCouponAction(deleteTargetId);

            if (res.success) {
                setCoupons((prev) => prev.filter((c) => c.id !== deleteTargetId));
                setShowDeleteModal(false);
                setDeleteTargetId(null);
            } else {
                alert(res.error || "Gagal menghapus kupon.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-6 text-foreground">
            <PageHeader
                title="Kupon Diskon (Coupons)"
                subtitle="Buat dan kelola kode promo diskon khusus untuk afiliator atau publik."
            >
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                        <input
                            type="text"
                            placeholder="Cari kode kupon..."
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
                        <option value="inactive">Non-Aktif</option>
                        <option value="expired">Kedaluwarsa</option>
                        <option value="exhausted">Kuota Habis</option>
                    </select>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-1 bg-primary text-primary-foreground hover:opacity-95 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-primary/10 active:scale-98 shrink-0"
                    >
                        <Plus size={12} /> Tambah Kupon
                    </button>
                </div>
            </PageHeader>

            <TableContainer>
                <THead>
                    <TR>
                        <TH>Kode Kupon</TH>
                        <TH>Diskon</TH>
                        <TH>Target Afiliasi</TH>
                        <TH>Masa Berlaku / Kuota</TH>
                        <TH>Status</TH>
                        <TH align="right">Aksi</TH>
                    </TR>
                </THead>
                <TBody>
                    {filtered.map((c) => {
                        const now = new Date();
                        const isExpired = c.expiryDate && new Date(c.expiryDate) < now;
                        const isUsageExceeded = c.maxUses !== null && c.usedCount >= c.maxUses;

                        return (
                            <TR key={c.id}>
                                <TD>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                            <Ticket size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-foreground font-mono tracking-wider">{c.code}</p>
                                            <p className="text-[10px] text-muted-foreground">Dibuat {new Date(c.createdAt).toLocaleDateString("id-ID")}</p>
                                        </div>
                                    </div>
                                </TD>
                                <TD>
                                    <span className="text-sm font-black text-foreground flex items-center gap-1.5">
                                        {c.discountType === "percentage" ? (
                                            <>
                                                <Percent size={14} className="text-primary" /> {Number(c.discountValue)}%
                                            </>
                                        ) : (
                                            `Rp ${Number(c.discountValue).toLocaleString("id-ID")}`
                                        )}
                                    </span>
                                </TD>
                                <TD>
                                    {c.affiliate ? (
                                        <div>
                                            <p className="text-xs font-bold text-foreground">{c.affiliate.name || "Afiliator"}</p>
                                            <p className="text-[10px] text-primary hover:underline">{c.affiliate.email}</p>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                            Semua Pengguna
                                        </span>
                                    )}
                                </TD>
                                <TD>
                                    <div className="flex flex-col gap-0.5 text-xs">
                                        <p className="font-bold flex items-center gap-1 text-foreground">
                                            <Calendar size={12} className="opacity-60" />
                                            {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString("id-ID") : "Selamanya"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Terpakai: <span className="font-black text-foreground">{c.usedCount}</span>
                                            {c.maxUses !== null ? ` / ${c.maxUses} Kali` : " (Tak Terbatas)"}
                                        </p>
                                    </div>
                                </TD>
                                <TD>
                                    {!c.isActive ? (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                                            <X size={10} />
                                            <span className="text-[9px] font-black uppercase">Non-Aktif</span>
                                        </div>
                                    ) : isExpired ? (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                            <X size={10} />
                                            <span className="text-[9px] font-black uppercase">Kedaluwarsa</span>
                                        </div>
                                    ) : isUsageExceeded ? (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                            <X size={10} />
                                            <span className="text-[9px] font-black uppercase">Kuota Habis</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            <Check size={10} />
                                            <span className="text-[9px] font-black uppercase">Aktif</span>
                                        </div>
                                    )}
                                </TD>
                                <TD align="right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            onClick={() => openEditModal(c)}
                                            className="p-1.5 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer"
                                            title="Ubah Kupon"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeleteTargetId(c.id);
                                                setShowDeleteModal(true);
                                            }}
                                            className="p-1.5 rounded-lg bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all cursor-pointer"
                                            title="Hapus Kupon"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </TD>
                            </TR>
                        );
                    })}
                </TBody>
            </TableContainer>

            {filtered.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                        <Ticket className="text-muted-foreground" size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Tidak ada kupon diskon ditemukan</h4>
                </div>
            )}

            {/* Premium Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-5 md:p-6 animate-in zoom-in-95 duration-300 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                <Ticket size={16} className="text-primary" />
                                {modalMode === "create" ? "Tambah Kupon Baru" : "Edit Detail Kupon"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            {formError && (
                                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20 flex gap-2">
                                    <X size={14} className="shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* Coupon Code */}
                            <div className="space-y-1.5">
                                <label htmlFor="coupon-code" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">
                                    Kode Kupon <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    id="coupon-code"
                                    type="text"
                                    required
                                    placeholder="Contoh: DISKON50"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    disabled={modalMode === "edit"}
                                    className="w-full bg-muted/10 border border-border hover:border-border-hover rounded-lg p-2.5 text-xs font-bold text-foreground font-mono tracking-wider focus:ring-1 focus:ring-primary/45 outline-none transition-all placeholder:text-muted-foreground/30 uppercase"
                                />
                            </div>

                            {/* Discount Type & Value Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="discount-type" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">
                                        Tipe Potongan
                                    </label>
                                    <select
                                        id="discount-type"
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value)}
                                        className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-bold focus:border-primary outline-none cursor-pointer"
                                    >
                                        <option value="percentage">Persentase (%)</option>
                                        <option value="fixed">Nominal Tetap (Rp)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="discount-value" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">
                                        Nilai Diskon <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        id="discount-value"
                                        type="number"
                                        required
                                        min="0.01"
                                        step="any"
                                        placeholder={discountType === "percentage" ? "Contoh: 20" : "Contoh: 50000"}
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        className="w-full bg-muted/10 border border-border hover:border-border-hover rounded-lg p-2.5 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary/45 outline-none transition-all placeholder:text-muted-foreground/30"
                                    />
                                </div>
                            </div>

                            {/* Target Affiliate */}
                            <div className="space-y-1.5">
                                <label htmlFor="affiliate-id" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">
                                    Afiliator Terkait (Opsional)
                                </label>
                                <select
                                    id="affiliate-id"
                                    value={affiliateId}
                                    onChange={(e) => setAffiliateId(e.target.value)}
                                    className="w-full bg-card border border-border rounded-lg p-2.5 text-xs font-bold focus:border-primary outline-none cursor-pointer"
                                >
                                    <option value="">Berlaku untuk Semua Pengguna</option>
                                    {affiliates.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name ? `${u.name} (${u.email})` : u.email}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-muted-foreground/80 font-medium leading-relaxed">
                                    Jika dipilih, pengguna baru yang memakai kupon ini saat bertransaksi akan otomatis didaftarkan sebagai rujukan afiliator tersebut.
                                </p>
                            </div>

                            {/* Expiry & Max Uses Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="expiry-date" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">
                                        Batas Kedaluwarsa
                                    </label>
                                    <input
                                        id="expiry-date"
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="w-full bg-muted/10 border border-border hover:border-border-hover rounded-lg p-2.5 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary/45 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="max-uses" className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block">
                                        Kuota Penggunaan
                                    </label>
                                    <input
                                        id="max-uses"
                                        type="number"
                                        placeholder="Tanpa batas"
                                        min="1"
                                        value={maxUses}
                                        onChange={(e) => setMaxUses(e.target.value)}
                                        className="w-full bg-muted/10 border border-border hover:border-border-hover rounded-lg p-2.5 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary/45 outline-none transition-all placeholder:text-muted-foreground/30"
                                    />
                                </div>
                            </div>

                            {/* Active Switch */}
                            <div className="flex items-center justify-between p-2.5 bg-muted/10 border border-border rounded-lg">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-foreground uppercase tracking-wider">Status Aktif Kupon</p>
                                    <p className="text-[8px] text-muted-foreground font-medium uppercase">Aktifkan untuk membiarkan pengguna menggunakan kupon ini</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-border bg-card cursor-pointer"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground text-[9px] font-black uppercase tracking-widest border border-border rounded-lg transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md shadow-primary/10 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? "Menyimpan..." : "Simpan Kupon"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeleteTargetId(null);
                }}
                onConfirm={handleDelete}
                title="Hapus Kupon Diskon?"
                message="Kupon ini akan dihapus secara permanen. Transaksi lama yang menggunakan kupon ini akan tetap dipertahankan, namun kode ini tidak dapat digunakan lagi."
                confirmText={isDeleting ? "Menghapus..." : "Ya, Hapus Kupon"}
                variant="danger"
            />
        </div>
    );
}
