import { eventBus } from "@/modules/shared/core/event-bus";
import { hooks } from "@/modules/shared/core/hooks";
import { getProxiedUrl } from "@/lib/media/utils";

// Recursively proxy all image URLs from file.crediblemark.com inside the builder page data
function proxyUrlsInObject(obj: any): any {
    if (!obj) return obj;
    if (typeof obj === "string") {
        if (obj.startsWith("https://file.crediblemark.com/")) {
            return getProxiedUrl(obj);
        }
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => proxyUrlsInObject(item));
    }
    if (typeof obj === "object") {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
            newObj[key] = proxyUrlsInObject(obj[key]);
        }
        return newObj;
    }
    return obj;
}

/**
 * Menginisialisasi event listener dan reply handler untuk modul content.
 */
export async function initPageListeners() {
  // Register global page_data filter
  hooks.addFilter("page_data", (pageData: any) => {
      if (!pageData) return pageData;
      
      // Proxy the main page image
      if (pageData.imageUrl) {
          pageData.imageUrl = getProxiedUrl(pageData.imageUrl);
      }
      
      // Proxy all images inside builder JSON content
      if (pageData.data) {
          pageData.data = proxyUrlsInObject(pageData.data);
      }
      
      return pageData;
  });
}
