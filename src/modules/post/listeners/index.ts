import { eventBus } from "@/modules/shared/core/event-bus";
import * as contentService from "../services/content.service";

export async function initPostListeners() {
  await eventBus.reply("request.content.countPosts", async (data: { siteId: string }) => {
    try {
      return await contentService.countPosts(data.siteId);
    } catch (e) {
      console.error(`[PostListener] Gagal menghitung post untuk site ${data.siteId}:`, e);
      return 0;
    }
  });

  await eventBus.reply("request.content.countTestimonials", async (data: { siteId: string }) => {
    try {
      return await contentService.countTestimonials(data.siteId);
    } catch (e) {
      console.error(`[PostListener] Gagal menghitung testimonial untuk site ${data.siteId}:`, e);
      return 0;
    }
  });
}
