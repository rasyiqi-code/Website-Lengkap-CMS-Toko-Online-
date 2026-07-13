"use client";

import React, { useState } from "react";
import {
    CreditCard,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Eye,
    Image as ImageIcon,
    Globe,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import Image from "next/image";
import { TableContainer, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { updateTransactionStatusAction } from "@/modules/payment/public-actions";

export default function TransactionList({ initialTransactions }: { initialTransactions: any[] }) {
    const [transactions, setTransactions] = useState(initialTransactions);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedProof, setSelectedProof] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    // Modal state for Approval/Rejection
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [actionTarget, setActionTarget] = useState<{ id: string, type: 'approved' | 'rejected' } | null>(null);

    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = (tx.site?.name || "").toLowerCase().includes(search.toLowerCase()) ||
            (tx.site?.subdomain || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleAction = async () => {
        if (!actionTarget) return;

        setIsUpdating(actionTarget.id);
        try {
            const data = await updateTransactionStatusAction({
                transactionId: actionTarget.id,
                status: actionTarget.type
            });

            if (data.success && data.result) {
                const updatedTx = data.result as any;
                setTransactions(prev => prev.map(tx => tx.id === updatedTx.id ? { ...tx, ...updatedTx } : tx));
            }
        } catch (error) {
            console.error("Failed to update transaction:", error);
        } finally {
            setIsUpdating(null);
            setShowConfirmModal(false);
            setActionTarget(null);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-6 text-foreground">
            <PageHeader
                title="Pembayaran"
                subtitle="Tinjau dan proses bukti transfer manual dari pelanggan."
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
                        <option value="pending">Menunggu</option>
                        <option value="approved">Disetujui</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                </div>
            </PageHeader>

            <TableContainer>
                <THead>
                    <TR>
                        <TH>Situs / Pelanggan</TH>
                        <TH>Detail Paket</TH>
                        <TH>Jumlah</TH>
                        <TH>Bukti & Catatan</TH>
                        <TH>Status</TH>
                        <TH align="right">Aksi</TH>
                    </TR>
                </THead>
                <TBody>
                    {filteredTransactions.map((tx) => (
                        <TR key={tx.id}>
                            <TD>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <Globe size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-foreground truncate max-w-[150px]">{tx.site?.name}</p>
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight truncate max-w-[150px]">
                                            {tx.site?.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"}
                                        </p>
                                    </div>
                                </div>
                            </TD>
                            <TD>
                                <div className="flex flex-col items-start gap-0.5">
                                    <p className="text-xs font-bold text-foreground uppercase tracking-tighter">{tx.plan?.name}</p>
                                    {tx.addonType === "site_slot" ? (
                                        <span className="text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-widest mt-0.5">
                                            + {tx.addonQuantity} Ekstra Situs
                                        </span>
                                    ) : tx.addonType ? (
                                        <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest mt-0.5">
                                            + Addon {tx.addonType} (x{tx.addonQuantity})
                                        </span>
                                    ) : (
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                                            {tx.plan?.interval || 'Bulanan'}
                                        </p>
                                    )}
                                </div>
                            </TD>
                            <TD>
                                <p className="text-xs font-black text-foreground">
                                    Rp {Number(tx.amount).toLocaleString()}
                                </p>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 inline-block ${
                                    tx.paymentMethod === "manual"
                                        ? "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                }`}>
                                    {tx.paymentMethod === "manual" ? "Manual" : "Gateway"}
                                </span>
                            </TD>
                            <TD>
                                <div className="flex items-center gap-2">
                                    {tx.paymentMethod === "manual" ? (
                                        <>
                                            {tx.proofOfPayment ? (
                                                <button
                                                    onClick={() => setSelectedProof(tx.proofOfPayment)}
                                                    className="w-9 h-9 rounded-md border border-border overflow-hidden relative group/img cursor-zoom-in shrink-0"
                                                >
                                                    <Image
                                                        src={tx.proofOfPayment}
                                                        alt="Proof"
                                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" fill
                                                        className="object-cover group-hover/img:scale-110 transition-transform"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                        <Eye size={12} className="text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground/30 shrink-0">
                                                    <ImageIcon size={14} />
                                                </div>
                                            )}
                                            <div className="max-w-[180px]">
                                                <p className="text-[9px] text-muted-foreground italic line-clamp-1">
                                                    {tx.notes || "Tidak ada catatan."}
                                                </p>
                                                <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-tight mt-0.5">
                                                    {new Date(tx.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Verifikasi Sistem (Midtrans)</p>
                                                <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-tight mt-0.5">
                                                    {new Date(tx.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </TD>
                            <TD>
                                {tx.status === 'approved' ? (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <CheckCircle2 size={9} />
                                        <span className="text-[8px] font-bold uppercase">Disetujui</span>
                                    </div>
                                ) : tx.status === 'rejected' ? (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                                        <XCircle size={9} />
                                        <span className="text-[8px] font-bold uppercase">Ditolak</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        <Clock size={9} />
                                        <span className="text-[8px] font-bold uppercase">Menunggu</span>
                                    </div>
                                )}
                            </TD>
                            <TD align="right">
                                {tx.status === 'pending' && tx.paymentMethod === 'manual' && (
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button
                                            onClick={() => {
                                                setActionTarget({ id: tx.id, type: 'rejected' });
                                                setShowConfirmModal(true);
                                            }}
                                            disabled={isUpdating === tx.id}
                                            className="p-1.5 rounded bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActionTarget({ id: tx.id, type: 'approved' });
                                                setShowConfirmModal(true);
                                            }}
                                            disabled={isUpdating === tx.id}
                                            className="p-1.5 rounded bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </TD>
                        </TR>
                    ))}
                </TBody>
            </TableContainer>
            {filteredTransactions.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="text-muted-foreground" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground">Tidak ada transaksi ditemukan</h4>
                    <p className="text-sm text-muted-foreground">Coba sesuaikan filter pencarian Anda.</p>
                </div>
            )}

            {/* Proof Preview Modal */}
            {selectedProof && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedProof(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full">
                        <button
                            className="absolute -top-12 right-0 text-white hover:text-primary transition-colors flex items-center gap-2 uppercase text-[10px] font-black tracking-widest"
                            onClick={() => setSelectedProof(null)}
                        >
                            <XCircle size={20} /> Tutup
                        </button>
                        <div className="bg-card border border-border rounded-2xl overflow-hidden relative w-full h-[80vh]">
                            <Image
                                src={selectedProof}
                                alt="Payment Proof Full"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" fill
                                className="object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleAction}
                title={actionTarget?.type === 'approved' ? "Setujui Pembayaran?" : "Tolak Pembayaran?"}
                message={actionTarget?.type === 'approved'
                    ? "Pembayaran ini akan disetujui dan langganan situs terkait akan diperbarui secara otomatis."
                    : "Pembayaran ini akan ditolak. Pastikan Anda telah memeriksa bukti transfer dengan teliti."}
                confirmText={actionTarget?.type === 'approved' ? "Ya, Setujui" : "Ya, Tolak"}
                variant={actionTarget?.type === 'approved' ? "primary" : "danger"}
            />
        </div>
    );
}
