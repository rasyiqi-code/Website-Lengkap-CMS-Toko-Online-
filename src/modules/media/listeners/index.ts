import { eventBus } from "@/modules/shared/core/event-bus";

interface CrudEventPayload {
    model: string;
    siteId: string;
    item: any;
}

async function handleCrudEvent(channel: string, payload: CrudEventPayload) {
    try {
        if (!["galleryItem", "portfolioItem"].includes(payload.model)) {
            return;
        }

        const { revalidateTag, revalidatePath } = await import("next/cache");
        revalidateTag(`site-${payload.siteId}`, "default");

        if (payload.model === "portfolioItem" && payload.item?.slug) {
            revalidatePath("/portfolio");
            revalidatePath(`/portfolio/${payload.item.slug}`);
        }

        if (payload.model === "galleryItem") {
            revalidatePath("/gallery");
        }
    } catch (err) {
        console.error(`[media-crud:${channel}] Error invalidating cache:`, err);
    }
}

export async function initMediaListeners() {
    eventBus.subscribe("crud.created", ({ data }) => handleCrudEvent("crud.created", data as CrudEventPayload));
    eventBus.subscribe("crud.updated", ({ data }) => handleCrudEvent("crud.updated", data as CrudEventPayload));
    eventBus.subscribe("crud.deleted", ({ data }) => handleCrudEvent("crud.deleted", data as CrudEventPayload));
}
