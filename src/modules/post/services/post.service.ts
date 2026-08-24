import * as contentRepo from "../repositories/content.repository";
import * as postRepo from "../repositories/post.repository";
import { db } from "@/modules/shared/core/db";
import { eventBus } from "@/modules/shared/core/event-bus";
import { buildPagination, fetchWithCache, publishCrudEvent, checkResourceLimit, invalidateCache } from "@/modules/shared/core/crud-base";
import { AppError } from "@/modules/shared/utils/api/errors";

export async function getPost(slug: string, siteId: string) {
    const post = await contentRepo.findPostBySlug(siteId, slug);
    if (!post) return null;

    let authorName = null;
    if (post.authorId) {
        const author = await eventBus.request<{ userId: string }, { name: string | null } | null>(
            "request.auth.getUserById",
            { userId: post.authorId }
        );
        authorName = author?.name || null;
    }

    return { ...post, authorName };
}

export async function getPosts(siteId: string) {
    return contentRepo.findPublishedPosts(siteId);
}

const postListSelect = { id: true, title: true, slug: true, published: true, createdAt: true };

function transformPostData(data: any, session: any) {
    const { status, ...rest } = data;
    return { ...rest, published: status === "published", authorId: session?.user?.id };
}

export async function listPosts(siteId: string, searchParams: URLSearchParams) {
    const { page, limit, skip } = buildPagination(searchParams);

    const result = await fetchWithCache(
        `post-list-${siteId}-${page}-${limit}`,
        async () => {
            const total = await postRepo.countPosts(siteId);
            const items = await postRepo.findPosts(siteId, { skip, take: limit }, {}, postListSelect);
            return {
                data: items,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            };
        },
        [`site-${siteId}`, `site-${siteId}-post`]
    );

    return { posts: result.data, pagination: result.pagination };
}

export async function createPost(siteId: string, data: any, session: any) {
    const { postId: _extractedId, metaData, ...rest } = data;
    const finalData = transformPostData(rest, session);

    const limitCheck = await checkResourceLimit(siteId, "maxPosts");
    if (!limitCheck.allowed) throw new AppError(limitCheck.message, 403);

    const created = await postRepo.createPost(finalData, siteId);

    if (created && metaData && Array.isArray(metaData)) {
        await db.metaData.createMany({
            data: metaData.map((m: any) => ({
                key: m.key,
                value: m.value,
                type: m.type || "text",
                postId: created.id
            }))
        });
    }

    await publishCrudEvent("crud.created", "post", siteId, created);
    
    // Invalidate cache untuk post list site ini
    await invalidateCache(`post-list-${siteId}`);

    return { success: true, item: created, post: created };
}

export async function getPostDetail(id: string, siteId: string) {
    const post = await postRepo.findPostById(id, siteId);
    if (!post) throw new AppError("Item not found", 404);
    return post;
}

export async function updatePost(id: string, siteId: string, data: any, session: any) {
    const existing = await postRepo.findPostById(id, siteId);
    if (!existing) throw new AppError("Not Found or Unauthorized", 404);

    const { postId: _extractedId, metaData, ...rest } = data;
    const finalData = transformPostData(rest, session);

    const updated = await postRepo.updatePost(id, siteId, finalData);

    if (updated && metaData && Array.isArray(metaData)) {
        await db.metaData.deleteMany({ where: { postId: id } });
        if (metaData.length > 0) {
            await db.metaData.createMany({
                data: metaData.map((m: any) => ({
                    key: m.key,
                    value: m.value,
                    type: m.type || "text",
                    postId: id
                }))
            });
        }
    }

    await publishCrudEvent("crud.updated", "post", siteId, updated);
    
    // Invalidate cache untuk post list site ini
    await invalidateCache(`post-list-${siteId}`);

    return { success: true, item: updated, post: updated };
}

export async function deletePost(id: string, siteId: string) {
    const existing = await postRepo.findPostById(id, siteId);
    if (!existing) throw new AppError("Item not found", 404);

    await postRepo.deletePost(id, siteId);
    await publishCrudEvent("crud.deleted", "post", siteId, existing);
    
    // Invalidate cache untuk post list site ini
    await invalidateCache(`post-list-${siteId}`);

    return { success: true };
}

export async function archivePost(id: string, siteId: string, isArchived: boolean) {
    const existing = await postRepo.findPostById(id, siteId);
    if (!existing) throw new AppError("Not Found or Unauthorized", 404);

    return postRepo.updatePost(id, siteId, { isArchived } as any);
}
