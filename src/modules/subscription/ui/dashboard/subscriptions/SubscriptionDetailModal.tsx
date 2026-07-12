import React, { useState, useEffect } from "react";
import { CreditCard, Loader2, Check } from "lucide-react";
import { getAllPlansAction, manageSubscriptionAction } from "@/modules/subscription/public-actions";

interface SubscriptionDetailModalProps {
    selectedSub: any;
    rootDomain: string;
    onClose: () => void;
    onUpdateSuccess?: (_subId: string, _newPlan: any) => void;
}

export function SubscriptionDetailModal({ selectedSub, rootDomain, onClose, onUpdateSuccess }: SubscriptionDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(selectedSub?.planId || "");

    const fetchPlans = React.useCallback(async () => {
        setLoadingPlans(true);
        try {
            const res = await getAllPlansAction();
            if (res.success && res.result) {
                setPlans(res.result);
            }
        } catch (err) {
            console.error("Failed to fetch plans", err);
        } finally {
            setLoadingPlans(false);
        }
    }, []);

    useEffect(() => {
        if (isEditing && plans.length === 0) {
            Promise.resolve().then(() => fetchPlans());
        }
    }, [isEditing, plans.length, fetchPlans]);

    const handleUpdatePlan = async () => {
        if (selectedPlanId === selectedSub.planId) {
            setIsEditing(false);
            return;
        }

        setUpdating(true);
        try {
            const res = await manageSubscriptionAction(selectedSub.id, {
                action: "update_plan",
                planId: selectedPlanId
            });

            if (res.success) {
                const newPlan = plans.find(p => p.id === selectedPlanId);
                if (onUpdateSuccess) {
                    onUpdateSuccess(selectedSub.id, newPlan);
                }
                alert("Paket berhasil diperbarui!");
                setIsEditing(false);
                onClose();
            } else {
                alert(res.error || "Gagal memperbarui paket");
            }
        } catch (_err) {
            alert("Kesalahan koneksi internet");
        } finally {
            setUpdating(false);
        }
    };

    if (!selectedSub) return null;

    const billingAmount = (() => {
        const activePlan = isEditing 
            ? (plans.find(p => p.id === selectedPlanId) || selectedSub.plan)
            : selectedSub.plan;

        let total = Number(activePlan?.price) || 0;
        if (selectedSub.addonSlots > 0 && activePlan?.addonSiteBilling === "recurring") {
            const addonPrice = activePlan.features?.addonSitePrice || 0;
            total += (selectedSub.addonSlots * addonPrice);
        }
        return total.toLocaleString();
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            {selectedSub.site?.users && selectedSub.site.users.length > 0 ? (
                                <>
                                    <h3 className="text-sm font-bold text-foreground">
                                        {selectedSub.site.users[0].name || "Tanpa Nama"}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground font-semibold">
                                        {selectedSub.site.users[0].email}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-sm font-bold text-foreground">{selectedSub.site?.name}</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                        {selectedSub.site?.subdomain}.{rootDomain}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                        <div className="space-y-1 col-span-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Kelola Paket</p>
                            {isEditing ? (
                                <div className="space-y-3 mt-2">
                                    <div className="relative">
                                        {loadingPlans ? (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                                <Loader2 className="animate-spin" size={14} /> Memuat paket yang tersedia...
                                            </div>
                                        ) : (
                                            <div className="grid gap-2">
                                                {plans.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => setSelectedPlanId(p.id)}
                                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                                            selectedPlanId === p.id 
                                                                ? "bg-primary/5 border-primary shadow-sm" 
                                                                : "bg-muted/30 border-border hover:bg-muted/50"
                                                        }`}
                                                    >
                                                        <div>
                                                            <p className="text-xs font-bold text-foreground">{p.name}</p>
                                                            <p className="text-[10px] text-muted-foreground">Rp {Number(p.price).toLocaleString()} / {p.interval?.toLowerCase() === 'month' ? 'bulan' : p.interval?.toLowerCase() === 'year' ? 'tahun' : p.interval}</p>
                                                        </div>
                                                        {selectedPlanId === p.id && <Check className="text-primary" size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                                    <div>
                                        <p className="text-xs font-bold text-foreground">{selectedSub.plan?.name}</p>
                                        <p className="text-[10px] text-muted-foreground">Paket Aktif</p>
                                    </div>
                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase border border-emerald-500/20">
                                        {selectedSub.status}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Tagihan</p>
                            <p className="text-sm font-bold text-foreground">
                                Rp {billingAmount}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Mulai</p>
                            <p className="text-sm font-bold text-foreground">{new Date(selectedSub.startDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="p-4 bg-muted/30 rounded-2xl space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batas Paket</p>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Slot Situs</span>
                                <span className="font-bold text-primary">
                                    {selectedSub.plan?.maxSites === -1 ? "Tanpa Batas" : (selectedSub.plan?.maxSites || 0)} 
                                    {selectedSub.addonSlots > 0 && ` + ${selectedSub.addonSlots} Tambahan`}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Maksimal Artikel</span>
                                <span className="font-bold">
                                    {selectedSub.plan?.maxPosts === -1 ? "Tanpa Batas" : (selectedSub.plan?.maxPosts || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Maksimal Produk</span>
                                <span className="font-bold">
                                    {selectedSub.plan?.maxProducts === -1 ? "Tanpa Batas" : (selectedSub.plan?.maxProducts || 0)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button 
                            onClick={isEditing ? () => setIsEditing(false) : onClose}
                            className="flex-1 bg-muted text-foreground py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-muted/80 transition-all"
                            disabled={updating}
                        >
                            {isEditing ? "Batal" : "Tutup"}
                        </button>
                        {isEditing ? (
                            <button 
                                onClick={handleUpdatePlan}
                                disabled={updating || !selectedPlanId}
                                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                            >
                                {updating ? <Loader2 className="animate-spin" size={14} /> : "Simpan Perubahan"}
                            </button>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all"
                            >
                                Ubah Paket
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
