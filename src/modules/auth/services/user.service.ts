import * as userRepo from "../repositories/user.repository";
import * as tenantUserRepo from "../repositories/tenant-user.repository";
import { UserDTO } from "../index";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Mendapatkan data user berdasarkan ID.
 */
export async function getUserById(userId: string): Promise<UserDTO | null> {
    const user = await userRepo.findUserById(userId);
    return user as UserDTO | null;
}

/**
 * Mendapatkan map dari banyak user.
 */
export async function getUsersMap(userIds: string[]): Promise<Record<string, UserDTO>> {
    if (userIds.length === 0) return {};
    const users = await userRepo.findUsersByIds(userIds);
    
    const resultMap: Record<string, UserDTO> = {};
    users.forEach(u => {
        resultMap[u.id] = u as UserDTO;
    });
    return resultMap;
}

/**
 * Mengubah data profil user sendiri (nama & ganti password).
 */
export async function updateUserProfile(email: string, body: any) {
    const { name, currentPassword, newPassword } = body;

    const currentUser = await userRepo.findUserByEmail(email);
    if (!currentUser) {
        throw new Error("User not found");
    }

    const updateData: any = {};
    if (name) updateData.name = name;

    if (newPassword) {
        if (!currentPassword) {
            throw new Error("Current password required");
        }

        if (currentUser.password) {
            const passwordsMatch = await bcrypt.compare(currentPassword, currentUser.password);
            if (!passwordsMatch) {
                throw new Error("Incorrect current password");
            }
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
    }

    await userRepo.updateUser(currentUser.id, updateData);
    return { success: true };
}

/**
 * Mengambil daftar user di level platform (admin) atau di level site (owner/editor).
 */
export async function getUsers(sessionRole: string, isTenantContext: boolean, siteId?: string) {
    let rawUsers;
    let siteUserRoleMap = new Map<string, string>();

    if (sessionRole === "admin" && !isTenantContext) {
        rawUsers = await userRepo.findAllUsers();
    } else {
        if (!siteId) throw new Error("Site ID required");
        const userIds = await tenantUserRepo.findSiteUserIds(siteId);
        rawUsers = await tenantUserRepo.findSiteUsersExceptAdmin(userIds);

        // Ambil pemetaan role dari tabel SiteUser
        const siteUserLinks = await tenantUserRepo.findSiteUserLinks(siteId);
        siteUserLinks.forEach(link => {
            siteUserRoleMap.set(link.userId, link.role);
        });
    }

    const postCounts = await userRepo.countPostsGroupedByAuthor(isTenantContext ? siteId : undefined);
    const postCountMap = new Map(postCounts.map(pc => [pc.authorId, pc._count.id]));

    const users = rawUsers.map(user => ({
        ...user,
        role: siteUserRoleMap.get(user.id) || user.role, // Gunakan role dari SiteUser jika ada
        _count: {
            posts: postCountMap.get(user.id) || 0
        }
    }));

    return { users };
}

/**
 * Membuat user baru oleh admin atau owner.
 */
export async function createUserByAdmin(siteId: string | undefined, data: any, sessionRole: string) {
    const { name, email, role, password, phone } = data;

    if (role === "admin" && sessionRole !== "admin") {
        throw new Error("Forbidden: Only platform admins can assign the admin role");
    }

    let user = await userRepo.findUserByEmail(email);

    let formattedPhone: string | null = null;
    if (phone && phone.trim() !== "") {
        formattedPhone = phone.replace(/[^0-9]/g, "");
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "62" + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith("8")) {
            formattedPhone = "62" + formattedPhone;
        }
        
        const existingPhone = await userRepo.findUserByPhone(formattedPhone);
        if (existingPhone && (!user || existingPhone.id !== user.id)) {
            throw new Error("Nomor HP sudah terdaftar oleh pengguna lain");
        }
    }

    if (user) {
        const updateData: any = {};
        if (name && user.name !== name) {
            updateData.name = name;
        }
        if (role && user.role !== role) {
            updateData.role = role;
        }
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }
        if (phone !== undefined) {
            if (formattedPhone && user.phone !== formattedPhone) {
                updateData.phone = formattedPhone;
            } else if (phone === "") {
                updateData.phone = null;
            }
        }

        if (Object.keys(updateData).length > 0) {
            await userRepo.updateUser(user.id, updateData);
            user = { ...user, ...updateData };
        }

        if (siteId) {
            await tenantUserRepo.upsertSiteUser(siteId, user.id, role || "user");
        }
    } else {
        const rawPassword = password && password.trim() !== "" ? password : crypto.randomBytes(32).toString("hex");
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        user = await userRepo.createUser({
            name,
            email,
            phone: formattedPhone,
            password: hashedPassword,
            role: role || "user",
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=random`
        });

        if (siteId && user) {
            await tenantUserRepo.createSiteUser(siteId, user.id);
        }
    }

    return user;
}

/**
 * Memperbarui user oleh admin atau owner.
 */
export async function updateUserByAdmin(
    userId: string,
    siteId: string | undefined,
    data: any,
    sessionUserId: string,
    sessionRole: string
) {
    const { role, name, email, password, phone } = data;

    const targetUser = await userRepo.findUserById(userId);
    if (!targetUser) throw new Error("User not found");

    if (sessionRole !== "admin") {
        if (!siteId) throw new Error("Site context required");
        const belongs = await tenantUserRepo.findSiteUserLink(siteId, userId);
        if (!belongs) throw new Error("User not found in site");

        if (targetUser.role === "admin") {
            throw new Error("Forbidden: Cannot modify a platform admin");
        }

        if (role === "admin") {
            throw new Error("Forbidden: Only platform admins can assign the admin role");
        }
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password && password.trim() !== "") {
        updateData.password = await bcrypt.hash(password, 10);
    }

    if (phone !== undefined) {
        if (phone && phone.trim() !== "") {
            let formattedPhone = phone.replace(/[^0-9]/g, "");
            if (formattedPhone.startsWith("0")) {
                formattedPhone = "62" + formattedPhone.slice(1);
            } else if (formattedPhone.startsWith("8")) {
                formattedPhone = "62" + formattedPhone;
            }

            const existingPhone = await userRepo.findUserByPhone(formattedPhone);
            if (existingPhone && existingPhone.id !== userId) {
                throw new Error("Nomor HP sudah terdaftar oleh pengguna lain");
            }
            updateData.phone = formattedPhone;
        } else {
            updateData.phone = null;
        }
    }

    await userRepo.updateUser(userId, updateData);

    if (role && siteId) {
        await tenantUserRepo.upsertSiteUser(siteId, userId, role);
    }

    return { success: true };
}

/**
 * Menghapus/menghilangkan user oleh admin atau owner.
 */
export async function deleteUserByAdmin(
    userId: string,
    siteId: string | undefined,
    sessionUserId: string,
    sessionRole: string
) {
    if (userId === sessionUserId) {
        throw new Error("Cannot delete yourself");
    }

    const { getTenant } = await import("@/lib/domains/tenant");
    const tenant = await getTenant();
    const isTenantContext = !!siteId && tenant !== null && tenant !== "admin";

    if (sessionRole !== "admin" || isTenantContext) {
        if (!siteId) throw new Error("Site context required");
        const belongs = await tenantUserRepo.findSiteUserLink(siteId, userId);
        if (!belongs) throw new Error("User not found in site");

        await tenantUserRepo.deleteSiteUserLinks(siteId, userId);
        return { success: true, removed: true };
    }

    await userRepo.deleteUserPosts(userId);
    await userRepo.deleteUser(userId);

    return { success: true };
}

/**
 * Mengambil daftar user lengkap beserta referrals count untuk admin platform.
 */
export async function getAdminUsersContext() {
    return userRepo.findAdminUsers();
}
