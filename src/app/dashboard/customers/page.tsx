import { db } from "@/lib/core/db";
import { getSiteId } from "@/lib/domains/tenant";
import { getPaymentSettings } from "@/modules/shared/utils/settings/payment";
import { getSiteSettings } from "@/modules/site/ui/site-settings";
import { notFound } from "next/navigation";
import CustomersClient from "@/modules/auth/ui/dashboard/customers/CustomersClient";

export const revalidate = 0; // Pastikan data selalu segar (fresh)

export default async function CustomersPage() {
    const siteId = await getSiteId();
    if (!siteId) return notFound();

    // Check if Customers module is enabled for this site
    const settings = await getSiteSettings(siteId);
    if (!settings.enabledCustomers) {
        return notFound();
    }

    // Ambil data setelan pembayaran untuk mendapatkan simbol mata uang yang digunakan
    const paymentSettings = await getPaymentSettings();
    const currency = paymentSettings.currency || "USD";

    // Ambil pesanan terbaru dari situs aktif untuk diagregasi
    // Batasi 500 order terbaru untuk mencegah memory spike pada situs dengan banyak pesanan
    const orders = await db.order.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
            customerName: true,
            customerEmail: true,
            customerAddress: true,
            total: true,
            createdAt: true,
            paymentStatus: true,
        }
    });

    // Peta pembantu untuk mengelompokkan pelanggan berdasarkan email unik
    const customerMap = new Map<string, {
        name: string;
        email: string;
        address: string;
        totalSpent: number;
        orderCount: number;
        lastOrderDate: Date;
        hasPaidOrder: boolean;
    }>();

    let totalRevenue = 0;

    for (const order of orders) {
        const email = order.customerEmail.toLowerCase().trim();
        const orderTotal = Number(order.total) || 0;
        const isPaid = order.paymentStatus === "paid";
        
        if (isPaid) {
            totalRevenue += orderTotal;
        }

        const existing = customerMap.get(email);
        if (existing) {
            existing.totalSpent += isPaid ? orderTotal : 0;
            existing.orderCount += 1;
            if (isPaid) {
                existing.hasPaidOrder = true;
            }
            if (new Date(order.createdAt) > existing.lastOrderDate) {
                existing.lastOrderDate = new Date(order.createdAt);
            }
            // Simpan alamat yang lebih panjang/lengkap
            if (order.customerAddress && order.customerAddress.length > existing.address.length) {
                existing.address = order.customerAddress;
            }
        } else {
            customerMap.set(email, {
                name: order.customerName,
                email: order.customerEmail,
                address: order.customerAddress || "",
                totalSpent: isPaid ? orderTotal : 0,
                orderCount: 1,
                lastOrderDate: new Date(order.createdAt),
                hasPaidOrder: isPaid,
            });
        }
    }

    // Ubah hasil pemetaan ke bentuk array ter-serialisasi agar aman dikirim ke Client Component
    const customerList = Array.from(customerMap.values()).map(c => ({
        name: c.name,
        email: c.email,
        address: c.address,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        lastOrderDate: c.lastOrderDate.toISOString(),
        hasPaidOrder: c.hasPaidOrder
    }));

    return (
        <CustomersClient 
            initialCustomers={customerList}
            currency={currency}
            totalRevenue={totalRevenue}
        />
    );
}
