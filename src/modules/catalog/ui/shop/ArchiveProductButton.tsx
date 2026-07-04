"use client";

import React from "react";
import { Archive, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { archiveProductAction } from "@/modules/catalog/actions/product.actions";
import toast from "react-hot-toast";

interface ArchiveProductButtonProps {
    productId: string;
    productName: string;
    isArchived: boolean;
}

export function ArchiveProductButton({ productId, productName, isArchived }: ArchiveProductButtonProps) {
    const router = useRouter();

    const handleArchive = async () => {
        try {
            const res = await archiveProductAction(productId, !isArchived);
            if (!res.success) {
                throw new Error(res.error || "Gagal mengubah status produk");
            }

            toast.success(isArchived ? "Produk berhasil dipulihkan" : "Produk berhasil diarsipkan");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Terjadi kesalahan saat mengubah status produk");
        }
    };

    return (
        <ConfirmActionButton
            icon={isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
            title={isArchived ? "Unarchive Asset" : "Archive Asset"}
            confirmTitle={isArchived ? "Unarchive Asset?" : "Archive Asset?"}
            confirmMessage={isArchived 
                ? `Restore "${productName}" to the active catalog buffer?`
                : `Move "${productName}" to long-term storage? It will be hidden from public access.`
            }
            confirmText={isArchived ? "Yes, Restore" : "Yes, Archive"}
            variant={isArchived ? "primary" : "warning"}
            onConfirm={handleArchive}
            className="bg-muted/20 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 rounded-xl transition-all border border-border hover:border-amber-500/20"
        />
    );
}
