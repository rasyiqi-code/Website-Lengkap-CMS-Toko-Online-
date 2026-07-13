"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { 
    Wallet, 
    Banknote, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    ArrowUpRight, 
    ArrowDownLeft, 
    History, 
    TrendingUp
} from "lucide-react";
import { TableContainer, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { requestAffiliateWithdrawalAction } from "@/modules/auth/public-actions";

export interface UserCommission {
    id: string;
    userId: string;
    amount: string | number;
    transactionId: string | null;
    description: string | null;
    createdAt: string;
}

export interface UserSale {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    siteName: string;
}

export interface UserWithdrawal {
    id: string;
    userId: string;
    amount: string | number;
    status: "pending" | "approved" | "rejected";
    bankName: string;
    accountNumber: string;
    accountName: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserWithFinance {
    id: string;
    affiliateBalance: string | number;
    commissions?: UserCommission[];
    sales?: UserSale[];
    withdrawals?: UserWithdrawal[];
}

type TransactionType = "commission" | "sale" | "withdrawal";

interface TransactionItem {
    id: string;
    type: TransactionType;
    amount: string | number;
    createdAt: string;
    sortDate: Date;
    description?: string | null;
    status?: "pending" | "approved" | "rejected";
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
}

export default function UserFinanceView({ user }: { user: UserWithFinance }) {
    const [activeTab, setActiveTab] = useState<"all" | "balance" | "withdrawals">("all");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawForm, setWithdrawForm] = useState({ bankName: "", accountNumber: "", accountName: "", amount: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const balance = Number(user.affiliateBalance || 0);

    // Calculate statistical metrics
    const totalCommissions = user.commissions?.reduce((acc: number, curr: UserCommission) => acc + Number(curr.amount), 0) || 0;
    const totalWithdrawn = user.withdrawals?.filter((w: UserWithdrawal) => w.status === "approved")
        .reduce((acc: number, curr: UserWithdrawal) => acc + Number(curr.amount), 0) || 0;
    const pendingWithdrawals = user.withdrawals?.filter((w: UserWithdrawal) => w.status === "pending")
        .reduce((acc: number, curr: UserWithdrawal) => acc + Number(curr.amount), 0) || 0;

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const data = await requestAffiliateWithdrawalAction({
                amount: Number(withdrawForm.amount),
                bankName: withdrawForm.bankName,
                accountNumber: withdrawForm.accountNumber,
                accountName: withdrawForm.accountName
            });

            if (!data.success) {
                throw new Error(data.error || "Gagal melakukan penarikan.");
            }

            // Reload page on success to fetch fresh database state
            window.location.reload();
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan.");
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-8">
            <PageHeader
                title="Keuangan"
                subtitle="Kelola saldo Anda, ajukan penarikan dana, dan lacak riwayat keuangan lengkap."
            />

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Main Card: Saldo Aktif */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Wallet size={120} className="text-indigo-400" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                        <div>
                            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                                Saldo Aktif Anda
                            </h3>
                            <div className="text-4xl font-black text-white tracking-tight drop-shadow-md">
                                Rp {balance.toLocaleString("id-ID")}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[11px] text-slate-300 leading-relaxed max-w-sm">
                                Saldo diperoleh dari komisi penjualan dan afiliasi Anda. Tarik saldo kapan saja langsung ke rekening bank atau dompet digital Anda.
                            </p>
                            <button
                                onClick={() => setIsWithdrawing(true)}
                                className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                            >
                                <Banknote size={16} /> Tarik Dana Sekarang
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stat 1: Total Pendapatan */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp size={100} className="text-emerald-500" />
                    </div>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                        <ArrowUpRight size={14} className="text-emerald-500" /> Total Pendapatan
                    </h3>
                    <div className="relative z-10 flex flex-col gap-2">
                        <span className="text-2xl font-black text-foreground">Rp {totalCommissions.toLocaleString("id-ID")}</span>
                        <p className="text-[10px] text-muted-foreground mt-1">Total seluruh komisi masuk yang Anda dapatkan.</p>
                    </div>
                </div>

                {/* Stat 2: Penarikan & Pending */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden group flex flex-col justify-between gap-4">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                        <History size={100} className="text-amber-500" />
                    </div>
                    
                    <div>
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <ArrowDownLeft size={14} className="text-violet-500" /> Penarikan Dana
                        </h3>
                        <div className="relative z-10 space-y-3">
                            <div>
                                <span className="text-xl font-bold text-foreground">Rp {totalWithdrawn.toLocaleString("id-ID")}</span>
                                <p className="text-[9px] text-muted-foreground">Berhasil Dicairkan</p>
                            </div>
                            <div className="pt-2 border-t border-border flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-amber-500">Rp {pendingWithdrawals.toLocaleString("id-ID")}</span>
                                    <p className="text-[9px] text-muted-foreground">Menunggu Persetujuan</p>
                                </div>
                                <Clock size={16} className="text-amber-500 animate-spin-slow shrink-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Activity Tabs & Table Area */}
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden mt-8">
                {/* Tabs Selector Header */}
                <div className="border-b border-border bg-muted/10 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                            <History size={16} className="text-indigo-400" />
                            Aktivitas Keuangan
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1">Kelola dan telusuri transaksi dana masuk dan keluar Anda.</p>
                    </div>

                    <div className="flex bg-muted/40 p-1 rounded-xl border border-border self-start sm:self-auto">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === "all" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Semua Aktivitas
                        </button>
                        <button
                            onClick={() => setActiveTab("balance")}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === "balance" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Dana Masuk
                        </button>
                        <button
                            onClick={() => setActiveTab("withdrawals")}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === "withdrawals" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Penarikan
                        </button>
                    </div>
                </div>

                {/* Unified Table Content */}
                <TableContainer className="rounded-none shadow-none md:border-0 !mx-0 w-full !border-y-0">
                    <THead>
                        <TR>
                            <TH>Tanggal</TH>
                            <TH>Tipe / Keterangan</TH>
                            <TH align="right">Nominal</TH>
                            <TH align="center">Status</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {/* Get and merge data based on tabs */}
                        {(() => {
                            let items: TransactionItem[] = [];
                            
                            if (activeTab === "all" || activeTab === "balance") {
                                const commissionsMapped = (user.commissions || []).map((com: UserCommission) => ({
                                    ...com,
                                    type: "commission" as TransactionType,
                                    sortDate: new Date(com.createdAt)
                                }));
                                const salesMapped = (user.sales || []).map((sale: UserSale) => ({
                                    ...sale,
                                    type: "sale" as TransactionType,
                                    sortDate: new Date(sale.createdAt)
                                }));
                                items = [...items, ...commissionsMapped, ...salesMapped];
                            }

                            if (activeTab === "all" || activeTab === "withdrawals") {
                                const withdrawalsMapped = (user.withdrawals || []).map((w: UserWithdrawal) => ({
                                    ...w,
                                    type: "withdrawal" as TransactionType,
                                    sortDate: new Date(w.createdAt)
                                }));
                                items = [...items, ...withdrawalsMapped];
                            }

                            // Sort descending
                            items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

                            if (items.length === 0) {
                                return (
                                    <TR>
                                        <TD colSpan={4} align="center">
                                            <div className="py-12 text-muted-foreground text-xs font-medium">Belum ada riwayat transaksi untuk filter ini.</div>
                                        </TD>
                                    </TR>
                                );
                            }

                            return items.map((item: TransactionItem, idx: number) => {
                                const isIncome = item.type === "commission" || item.type === "sale";
                                const isCommission = item.type === "commission";
                                
                                return (
                                    <TR key={item.id || idx}>
                                        <TD className="w-40">
                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                {new Date(item.createdAt).toLocaleString("id-ID", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </p>
                                        </TD>
                                        <TD>
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                                    isIncome ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
                                                }`}>
                                                    {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">
                                                        {isIncome ? (item.description || (isCommission ? "Komisi Afiliasi" : "Penjualan Toko")) : "Penarikan Dana"}
                                                    </p>
                                                    {item.type === "withdrawal" && (
                                                        <p className="text-[9px] text-muted-foreground font-medium uppercase mt-0.5">
                                                            {item.bankName} • {item.accountNumber} ({item.accountName})
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TD>
                                        <TD align="right" className="w-48">
                                            <span className={`text-sm font-black ${isIncome ? "text-emerald-500" : "text-foreground"}`}>
                                                {isIncome ? "+" : "-"} Rp {Number(item.amount).toLocaleString("id-ID")}
                                            </span>
                                        </TD>
                                        <TD align="center" className="w-32">
                                            {isIncome ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase">
                                                    <CheckCircle2 size={10} /> Sukses
                                                </span>
                                            ) : item.status === "approved" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase">
                                                    <CheckCircle2 size={10} /> Selesai
                                                </span>
                                            ) : item.status === "rejected" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 text-[9px] font-bold uppercase">
                                                    <XCircle size={10} /> Ditolak
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold uppercase">
                                                    <Clock size={10} className="animate-pulse" /> Menunggu
                                                </span>
                                            )}
                                        </TD>
                                    </TR>
                                );
                            });
                        })()}
                    </TBody>
                </TableContainer>
            </div>

            {/* Withdraw Modal Overlay */}
            {isWithdrawing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border bg-muted/10">
                            <h3 className="text-base font-bold text-foreground">Tarik Dana Keuangan</h3>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Batas minimum penarikan dana adalah <span className="font-bold text-foreground">Rp 50.000</span>.
                            </p>
                        </div>
                        <form onSubmit={handleWithdraw} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label htmlFor="amount" className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Nominal Penarikan (Rp)</label>
                                <input
                                    id="amount"
                                    type="number"
                                    required
                                    min="50000"
                                    max={balance}
                                    value={withdrawForm.amount}
                                    onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                                    className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Contoh: 100000"
                                />
                                <p className="text-[9px] text-muted-foreground mt-1">Saldo tersedia untuk ditarik: Rp {balance.toLocaleString("id-ID")}</p>
                            </div>
                            
                            <div>
                                <label htmlFor="bankName" className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Nama Bank / E-Wallet</label>
                                <input
                                    id="bankName"
                                    type="text"
                                    required
                                    value={withdrawForm.bankName}
                                    onChange={(e) => setWithdrawForm({...withdrawForm, bankName: e.target.value})}
                                    className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Contoh: BCA, Mandiri, GoPay, OVO"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="accountNumber" className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Nomor Rekening / HP</label>
                                    <input
                                        id="accountNumber"
                                        type="text"
                                        required
                                        value={withdrawForm.accountNumber}
                                        onChange={(e) => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                                        className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Nomor rekening"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="accountName" className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Atas Nama</label>
                                    <input
                                        id="accountName"
                                        type="text"
                                        required
                                        value={withdrawForm.accountName}
                                        onChange={(e) => setWithdrawForm({...withdrawForm, accountName: e.target.value})}
                                        className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Nama lengkap"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsWithdrawing(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || balance < 50000}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-500/20"
                                >
                                    {submitting ? "Memproses..." : "Ajukan Pencairan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
