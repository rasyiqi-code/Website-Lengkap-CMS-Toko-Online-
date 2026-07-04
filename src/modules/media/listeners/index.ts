import { eventBus } from "@/modules/shared/core/event-bus";
import * as contentService from "../services/content.service";

export async function initMediaListeners() {
  await eventBus.reply("request.content.getMediaSize", async (data: { siteId: string }) => {
    try {
      return await contentService.getMediaSize(data.siteId);
    } catch (e) {
      console.error(`[MediaListener] Gagal mendapatkan ukuran media untuk site ${data.siteId}:`, e);
      return 0;
    }
  });
}
