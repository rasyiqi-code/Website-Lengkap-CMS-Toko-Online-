import React from "react";
import { Package } from "lucide-react";
import { Transaction } from "@/modules/subscription/ui/dashboard/billing/types";

interface TransactionHistoryProps {
    transactions: Transaction[];
    onConfirm: (_tx: Transaction) => void;
    onCancel: (_txId: string) => void;
}

export function TransactionHistory({
    transactions,
    onConfirm,
    onCancel
}: TransactionHistoryProps) {


    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-md transition-all duration-500 hover:border-primary/10">
            <div className="px-4 py-2.5 border-b border-border bg-muted/10 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                    <Package size={14} className="text-primary" />
                    Riwayat Transaksi
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-border bg-muted/5">
                            <th className="px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Tanggal</th>
                            <th className="px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Paket</th>
                            <th className="px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Jumlah</th>
                            <th className="px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                            <th className="px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-10 text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                                    Belum ada riwayat transaksi.
                                </td>
                            </tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-muted/5 transition-colors group">
                                    <td className="px-5 py-3.5 text-[10px] font-bold text-foreground uppercase tracking-tight">
                                        {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{tx.plan.name}</span>
                                            {tx.addonType === "site_slot" && (
                                                <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-0.5">+ {tx.addonQuantity} Ekstra Situs</span>
                                            )}
                                            {(tx as any).amount > (tx.plan as any).price && tx.addonType !== "site_slot" && (
                                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-0.5">+ Fitur Tambahan</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-[10px] font-black text-foreground uppercase tracking-tight">Rp {tx.amount.toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                            tx.status === 'approved' || tx.status === 'paid'
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                                : tx.status === 'pending' 
                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                            }`}>
                                            {tx.status === 'approved' || tx.status === 'paid'
                                                ? 'Berhasil' 
                                                : tx.status === 'pending' 
                                                ? 'Menunggu Konfirmasi' 
                                                : tx.status === 'cancelled' 
                                                ? 'Dibatalkan'
                                                : 'Kedaluwarsa'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        {tx.status === 'pending' && (
                                            <div className="flex items-center justify-end gap-2">

                                                {tx.paymentUrl && !tx.paymentUrl.startsWith("custom:") ? (
                                                    <a
                                                        href={tx.paymentUrl}
                                                        className="text-[9px] font-black text-sky-500 uppercase tracking-widest underline hover:opacity-80 transition-all cursor-pointer"
                                                    >
                                                        Bayar Sekarang
                                                    </a>
                                                ) : (
                                                    <button
                                                        onClick={() => onConfirm(tx)}
                                                        className="text-[9px] font-black text-sky-500 uppercase tracking-widest underline hover:opacity-80 transition-all"
                                                    >
                                                        Konfirmasi
                                                    </button>
                                                )}
                                                <span className="text-muted-foreground/30 text-[9px] font-medium select-none">|</span>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("Apakah Anda yakin ingin membatalkan transaksi ini secara permanen?")) {
                                                            onCancel(tx.id);
                                                        }
                                                    }}
                                                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest underline hover:opacity-80 transition-all"
                                                >
                                                    Batalkan
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
