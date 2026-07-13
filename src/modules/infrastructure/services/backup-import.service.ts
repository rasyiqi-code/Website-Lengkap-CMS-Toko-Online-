import { db } from "@/modules/shared/core/db";
import { type BackupData } from "./backup-export.service";

/**
 * Memulihkan database dari data cadangan, mempertahankan admin yang sedang masuk
 */
export async function importBackupData(backupData: BackupData, currentAdminId?: string): Promise<{ success: boolean; message: string }> {
    try {
        if (!backupData || !backupData.data) {
            throw new Error("Berkas cadangan tidak valid: properti 'data' hilang.");
        }

        const d = backupData.data;

        // Memverifikasi tabel yang diperlukan di dalam berkas cadangan
        if (!d.users || !Array.isArray(d.users)) {
            throw new Error("Berkas cadangan tidak valid: tabel 'users' hilang atau rusak.");
        }

        console.log("Memulai proses pemulihan. Mengosongkan database...");

        // Mengambil email dan telepon admin saat ini untuk menyelesaikan konflik jika memungkinkan
        const currentAdmin = currentAdminId 
            ? await db.user.findUnique({ where: { id: currentAdminId } }) 
            : null;
        const currentAdminEmail = currentAdmin?.email;
        const currentAdminPhone = currentAdmin?.phone;

        // Mengisi pemetaan ID User Cadangan -> ID User Riil di database
        const userIdMap = new Map<string, string>();
        for (const user of d.users) {
            if (currentAdminId) {
                if (user.id === currentAdminId) {
                    userIdMap.set(user.id, currentAdminId);
                } else if (user.email && currentAdminEmail && user.email.toLowerCase() === currentAdminEmail.toLowerCase()) {
                    userIdMap.set(user.id, currentAdminId);
                } else if (user.phone && currentAdminPhone && user.phone === currentAdminPhone) {
                    userIdMap.set(user.id, currentAdminId);
                } else {
                    userIdMap.set(user.id, user.id);
                }
            } else {
                userIdMap.set(user.id, user.id);
            }
        }

        // 1. Hapus dalam urutan topologis terbalik dari hubungan tabel
        await db.metaData.deleteMany();
        await db.seoMeta.deleteMany();
        await db.orderItem.deleteMany();
        await db.order.deleteMany();
        await db.commission.deleteMany();
        await db.withdrawal.deleteMany();
        await db.paymentTransaction.deleteMany();
        await db.subscription.deleteMany();
        await db.coupon.deleteMany();
        await db.platformSettings.deleteMany();
        await db.paymentSettings.deleteMany();
        await db.siteSettings.deleteMany();
        await db.siteStatistics.deleteMany();
        await db.menuItem.deleteMany();
        await db.menu.deleteMany();
        await db.contactSubmission.deleteMany();
        await db.galleryItem.deleteMany();
        await db.portfolioItem.deleteMany();
        await db.testimonial.deleteMany();
        await db.mediaItem.deleteMany();
        await db.mediaFolder.deleteMany();
        await db.term.deleteMany();
        await db.taxonomy.deleteMany();
        await db.post.deleteMany();
        await db.product.deleteMany();
        await db.credBuildPage.deleteMany();
        
        // Menghapus sites secara otomatis akan membersihkan entri hubungan '_SiteToUser'
        await db.site.deleteMany();

        // Penghapusan User yang Aman - Pertahankan kredensial & sesi admin aktif saat ini
        if (currentAdminId) {
            await db.session.deleteMany({ where: { userId: { not: currentAdminId } } });
            await db.account.deleteMany({ where: { userId: { not: currentAdminId } } });
            await db.user.deleteMany({ where: { id: { not: currentAdminId } } });
        } else {
            await db.session.deleteMany();
            await db.account.deleteMany();
            await db.user.deleteMany();
        }

        await db.plan.deleteMany();
        await db.verificationToken.deleteMany();

        console.log("Database berhasil dikosongkan. Memasukkan data cadangan (Tahap 1)...");

        // 2. Masukkan Plans
        if (d.plans && d.plans.length > 0) {
            for (const plan of d.plans) {
                await db.plan.create({ data: plan });
            }
        }

        // 3. Masukkan Users (Tahap 1 - referredById bernilai null)
        if (d.users && d.users.length > 0) {
            for (const user of d.users) {
                const resolvedId = userIdMap.get(user.id) || user.id;
                const { referredById: _referredById, ...userFields } = user;
                
                const userExists = await db.user.count({ where: { id: resolvedId } });
                if (userExists > 0) {
                    // Perbarui admin aktif yang ada daripada membuat ulang untuk mempertahankan sesi aktif
                    await db.user.update({
                        where: { id: resolvedId },
                        data: {
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            image: user.image,
                            password: user.password,
                            role: user.role, // Harus tetap admin atau sesuai berkas cadangan
                            referredById: null, // Diperbarui pada tahap 2
                            affiliateBalance: user.affiliateBalance
                        }
                    });
                } else {
                    await db.user.create({
                        data: {
                            ...userFields,
                            id: resolvedId,
                            referredById: null // Diperbarui pada tahap 2
                        }
                    });
                }
            }
        }

        // 4. Accounts
        if (d.accounts && d.accounts.length > 0) {
            for (const acc of d.accounts) {
                const resolvedUserId = userIdMap.get(acc.userId) || acc.userId;
                const mappedAcc = { ...acc, userId: resolvedUserId };
                // Pastikan akun belum ada untuk admin aktif
                const exists = await db.account.count({ where: { id: mappedAcc.id } });
                if (!exists) {
                    await db.account.create({ data: mappedAcc });
                }
            }
        }

        // 5. Sessions
        if (d.sessions && d.sessions.length > 0) {
            for (const ses of d.sessions) {
                const resolvedUserId = userIdMap.get(ses.userId) || ses.userId;
                const mappedSes = { ...ses, userId: resolvedUserId };
                const exists = await db.session.count({ where: { id: mappedSes.id } });
                if (!exists) {
                    await db.session.create({ data: mappedSes });
                }
            }
        }

        // 6. Verification Tokens
        if (d.verificationTokens && d.verificationTokens.length > 0) {
            for (const token of d.verificationTokens) {
                await db.verificationToken.create({ data: token });
            }
        }

        // 7. Sites & Hubungkan userIds ke tabel penghubung 'siteUsers'
        if (d.sites && d.sites.length > 0) {
            for (const site of d.sites) {
                const { userIds, ...siteFields } = site;
                // Buat site terlebih dahulu
                const createdSite = await db.site.create({
                    data: siteFields
                });

                // Buat tautan siteUsers
                if (userIds && Array.isArray(userIds) && userIds.length > 0) {
                    const mappedUserIds = userIds.map(id => userIdMap.get(id) || id);
                    const existingUsers = await db.user.findMany({
                        where: { id: { in: mappedUserIds } },
                        select: { id: true }
                    });
                    
                    for (const u of existingUsers) {
                        await db.siteUser.create({
                            data: {
                                siteId: createdSite.id,
                                userId: u.id,
                                role: "owner" // Peran cadangan default
                            }
                        });
                    }
                }
            }
        }

        // 8. SiteSettings
        if (d.siteSettings && d.siteSettings.length > 0) {
            await db.siteSettings.createMany({ data: d.siteSettings });
        }

        // 9. SiteStatistics
        if (d.siteStatistics && d.siteStatistics.length > 0) {
            for (const stat of d.siteStatistics) {
                await db.siteStatistics.create({ data: stat });
            }
        }

        // 10. PaymentSettings
        if (d.paymentSettings && d.paymentSettings.length > 0) {
            for (const ps of d.paymentSettings) {
                await db.paymentSettings.create({ data: ps });
            }
        }

        // 11. Subscriptions
        if (d.subscriptions && d.subscriptions.length > 0) {
            for (const sub of d.subscriptions) {
                await db.subscription.create({ data: sub });
            }
        }

        // 12. Coupons
        if (d.coupons && d.coupons.length > 0) {
            for (const cp of d.coupons) {
                const resolvedAffiliateId = cp.affiliateId ? (userIdMap.get(cp.affiliateId) || cp.affiliateId) : null;
                await db.coupon.create({ 
                    data: {
                        ...cp,
                        affiliateId: resolvedAffiliateId
                    } 
                });
            }
        }

        // 13. Payment Transactions
        if (d.paymentTransactions && d.paymentTransactions.length > 0) {
            for (const pt of d.paymentTransactions) {
                await db.paymentTransaction.create({ data: pt });
            }
        }

        // 14. Commissions
        if (d.commissions && d.commissions.length > 0) {
            for (const comm of d.commissions) {
                const resolvedUserId = userIdMap.get(comm.userId) || comm.userId;
                await db.commission.create({ 
                    data: {
                        ...comm,
                        userId: resolvedUserId
                    } 
                });
            }
        }

        // 15. Withdrawals
        if (d.withdrawals && d.withdrawals.length > 0) {
            for (const wd of d.withdrawals) {
                const resolvedUserId = userIdMap.get(wd.userId) || wd.userId;
                await db.withdrawal.create({ 
                    data: {
                        ...wd,
                        userId: resolvedUserId
                    } 
                });
            }
        }

        // 16. Contact Submissions
        if (d.contactSubmissions && d.contactSubmissions.length > 0) {
            for (const cs of d.contactSubmissions) {
                await db.contactSubmission.create({ data: cs });
            }
        }

        // 17. Gallery Items
        if (d.galleryItems && d.galleryItems.length > 0) {
            for (const gi of d.galleryItems) {
                await db.galleryItem.create({ data: gi });
            }
        }

        // 18. Portfolio Items
        if (d.portfolioItems && d.portfolioItems.length > 0) {
            for (const pi of d.portfolioItems) {
                await db.portfolioItem.create({ data: pi });
            }
        }

        // 19. Testimonials
        if (d.testimonials && d.testimonials.length > 0) {
            for (const tm of d.testimonials) {
                await db.testimonial.create({ data: tm });
            }
        }

        // 20. Media Folders (Tahap 1 - parentId bernilai null)
        if (d.mediaFolders && d.mediaFolders.length > 0) {
            for (const mf of d.mediaFolders) {
                const { parentId: _parentId, ...mfFields } = mf;
                await db.mediaFolder.create({
                    data: {
                        ...mfFields,
                        parentId: null
                    }
                });
            }
        }

        // 21. Media Items
        if (d.mediaItems && d.mediaItems.length > 0) {
            for (const mi of d.mediaItems) {
                await db.mediaItem.create({ data: mi });
            }
        }

        // 22. Pages
        if (d.credBuildPages && d.credBuildPages.length > 0) {
            for (const page of d.credBuildPages) {
                await db.credBuildPage.create({ data: page });
            }
        }

        // 23. Posts
        if (d.posts && d.posts.length > 0) {
            for (const post of d.posts) {
                const resolvedAuthorId = post.authorId ? (userIdMap.get(post.authorId) || post.authorId) : null;
                await db.post.create({ 
                    data: {
                        ...post,
                        authorId: resolvedAuthorId
                    } 
                });
            }
        }

        // 24. Products
        if (d.products && d.products.length > 0) {
            for (const prod of d.products) {
                await db.product.create({ data: prod });
            }
        }

        // 25. Orders
        if (d.orders && d.orders.length > 0) {
            for (const ord of d.orders) {
                await db.order.create({ data: ord });
            }
        }

        // 26. Order Items
        if (d.orderItems && d.orderItems.length > 0) {
            for (const item of d.orderItems) {
                await db.orderItem.create({ data: item });
            }
        }

        // 27. Taxonomies
        if (d.taxonomies && d.taxonomies.length > 0) {
            for (const tax of d.taxonomies) {
                await db.taxonomy.create({ data: tax });
            }
        }

        // 28. Terms (Tahap 1 - parentId null, relasi implisit diabaikan)
        if (d.terms && d.terms.length > 0) {
            for (const term of d.terms) {
                const { parentId: _parentId, pageIds: _pageIds, postIds: _postIds, productIds: _productIds, ...termFields } = term;
                await db.term.create({
                    data: {
                        ...termFields,
                        parentId: null
                    }
                });
            }
        }

        // 29. Menus
        if (d.menus && d.menus.length > 0) {
            for (const menu of d.menus) {
                await db.menu.create({ data: menu });
            }
        }

        // 30. Menu Items
        if (d.menuItems && d.menuItems.length > 0) {
            for (const item of d.menuItems) {
                await db.menuItem.create({ data: item });
            }
        }

        // 31. MetaData
        if (d.metaData && d.metaData.length > 0) {
            for (const meta of d.metaData) {
                await db.metaData.create({ data: meta });
            }
        }

        // 32. SeoMeta
        if (d.seoMetas && d.seoMetas.length > 0) {
            for (const seo of d.seoMetas) {
                await db.seoMeta.create({ data: seo });
            }
        }

        // 33. Platform Settings
        if (d.platformSettings && d.platformSettings.length > 0) {
            for (const ps of d.platformSettings) {
                await db.platformSettings.create({ data: ps });
            }
        }

        console.log("Tahap 1 pemasukan data selesai. Menyelesaikan relasi dan referensi-diri (Tahap 2)...");

        // TAHAP 2: Perbarui Referensi-Diri dan Hubungan Many-to-Many
        
        // 2.1 Perbarui User.referredById
        if (d.users && d.users.length > 0) {
            for (const user of d.users) {
                const resolvedUserId = userIdMap.get(user.id) || user.id;
                if (user.referredById) {
                    const resolvedReferredById = userIdMap.get(user.referredById) || user.referredById;
                    // Pastikan user referredById terdaftar di database
                    const referrerExists = await db.user.count({ where: { id: resolvedReferredById } });
                    if (referrerExists > 0) {
                        await db.user.update({
                            where: { id: resolvedUserId },
                            data: { referredById: resolvedReferredById }
                        });
                    }
                }
            }
        }

        // 2.2 Perbarui MediaFolder.parentId
        if (d.mediaFolders && d.mediaFolders.length > 0) {
            for (const mf of d.mediaFolders) {
                if (mf.parentId) {
                    const parentExists = await db.mediaFolder.count({ where: { id: mf.parentId } });
                    if (parentExists > 0) {
                        await db.mediaFolder.update({
                            where: { id: mf.id },
                            data: { parentId: mf.parentId }
                        });
                    }
                }
            }
        }

        // 2.3 Perbarui Term.parentId dan relasi implisit (postIds)
        if (d.terms && d.terms.length > 0) {
            for (const term of d.terms) {
                const { parentId, postIds } = term;
                
                // Pastikan parent ada
                let parentVal = null;
                if (parentId) {
                    const parentExists = await db.term.count({ where: { id: parentId } });
                    if (parentExists > 0) {
                        parentVal = parentId;
                    }
                }

                // Pastikan postIds ada sebelum menghubungkan
                let validPostIds: string[] = [];
                if (postIds && Array.isArray(postIds) && postIds.length > 0) {
                    const existing = await db.post.findMany({
                        where: { id: { in: postIds } },
                        select: { id: true }
                    });
                    validPostIds = existing.map(x => x.id);
                }

                await db.term.update({
                    where: { id: term.id },
                    data: {
                        parentId: parentVal,
                        posts: validPostIds.length > 0 ? {
                            connect: validPostIds.map(id => ({ id }))
                        } : undefined
                    }
                });
            }
        }

        console.log("Proses pemulihan selesai dengan sukses!");
        return { success: true, message: "Database berhasil dipulihkan dari data cadangan." };
    } catch (error) {
        console.error("Import Backup Error:", error);
        return { 
            success: false, 
            message: "Gagal memulihkan data cadangan: " + (error as Error).message 
        };
    }
}
