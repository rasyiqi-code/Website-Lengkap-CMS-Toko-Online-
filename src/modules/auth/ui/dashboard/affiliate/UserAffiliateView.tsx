"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import { TableContainer, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export default function UserAffiliateView({ user }: { user: any }) {
    const [copied, setCopied] = useState(false);
    
    // Gunakan state agar tidak ada hydration mismatch (SSR vs client)
    const [baseUrl, setBaseUrl] = useState("");
    useEffect(() => {
        setBaseUrl(window.location.origin);
    }, []);
    const referralLink = `${baseUrl}/?ref=${user.referralCode}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full animate-in fade-in duration-700 pb-20 space-y-6">
            <PageHeader
                title="Program Afiliasi"
                subtitle="Ajak teman Anda bergabung dan dapatkan keuntungan bersama."
            />

            {/* Referral Link Card - Full Width for Clean Layout */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute right-6 top-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                    <LinkIcon size={120} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tautan Afiliasi Anda</h3>
                        <p className="text-sm font-semibold text-foreground">
                            Bagikan tautan unik ini ke rekan atau audiens Anda. Dapatkan komisi 20% secara instan dari setiap pembayaran langganan mereka!
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0 md:w-96">
                        <div className="flex items-center p-2.5 bg-muted/40 border border-border rounded-lg overflow-hidden flex-1">
                            <code className="text-[11px] font-mono truncate flex-1 text-foreground">{referralLink}</code>
                            <button 
                                onClick={copyToClipboard}
                                className="ml-2.5 p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors flex items-center justify-center shrink-0"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Two-Column Side-by-Side Grid for Commissions & Referrals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Commission History */}
                <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden h-fit">
                    <div className="p-5 border-b border-border bg-muted/10 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-bold text-foreground tracking-tight">Riwayat Komisi</h3>
                            <p className="text-[10px] text-muted-foreground mt-1">Komisi yang masuk dari pembayaran referral Anda.</p>
                        </div>
                    </div>
                    <TableContainer className="rounded-none shadow-none md:border-0 !mx-0 w-full !border-y-0">
                        <THead>
                            <TR>
                                <TH>Keterangan</TH>
                                <TH align="right">Nominal</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {(!user.commissions || user.commissions.length === 0) && (
                                <TR>
                                    <TD colSpan={2} align="center">
                                        <div className="py-12 text-muted-foreground text-xs font-medium">Belum ada riwayat komisi.</div>
                                    </TD>
                                </TR>
                            )}
                            {user.commissions?.map((com: any) => (
                                <TR key={com.id}>
                                    <TD>
                                        <p className="text-xs font-bold text-foreground">{com.description || "Komisi Afiliasi"}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(com.createdAt).toLocaleString("id-ID")}</p>
                                    </TD>
                                    <TD align="right">
                                        <span className="text-sm font-black text-emerald-500">+ Rp {Number(com.amount).toLocaleString("id-ID")}</span>
                                    </TD>
                                </TR>
                            ))}
                        </TBody>
                    </TableContainer>
                </div>

                {/* Invited Users List */}
                <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden h-fit">
                    <div className="p-5 border-b border-border bg-muted/10 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-bold text-foreground tracking-tight">
                                Daftar Pengguna Diajak ({user._count?.referrals || 0})
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-1">Pengguna yang telah mendaftar menggunakan referral Anda.</p>
                        </div>
                    </div>
                    <TableContainer className="rounded-none shadow-none md:border-0 !mx-0 w-full !border-y-0">
                        <THead>
                            <TR>
                                <TH>Pengguna</TH>
                                <TH align="right">Tanggal Bergabung</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {(!user.referrals || user.referrals.length === 0) && (
                                <TR>
                                    <TD colSpan={2} align="center">
                                        <div className="py-12 text-muted-foreground text-xs font-medium">Belum ada pengguna yang mendaftar.</div>
                                    </TD>
                                </TR>
                            )}
                            {user.referrals?.map((ref: any) => (
                                <TR key={ref.id}>
                                    <TD>
                                        <p className="text-xs font-bold text-foreground">{ref.name || "Anonymous"}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{ref.email}</p>
                                    </TD>
                                    <TD align="right">
                                        <p className="text-[10px] font-medium text-foreground">
                                            {new Date(ref.createdAt).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric"
                                            })}
                                        </p>
                                    </TD>
                                </TR>
                            ))}
                        </TBody>
                    </TableContainer>
                </div>
            </div>
        </div>
    );
}
