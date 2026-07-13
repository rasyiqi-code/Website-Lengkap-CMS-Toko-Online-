import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerProductCrudCacheListener, initProductListeners } from "@/modules/catalog/listeners/product.listener";
import { eventBus } from "@/modules/shared/core/event-bus";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// We'll use actual next/cache mocked functions
import { revalidateTag, revalidatePath } from "next/cache";

describe("Product Listener", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(eventBus, "subscribe");
  });

  describe("registerProductCrudCacheListener", () => {
    it("should subscribe to crud.created, crud.updated, and crud.deleted events", () => {
      registerProductCrudCacheListener();

      expect(eventBus.subscribe).toHaveBeenCalledWith("crud.created", expect.any(Function));
      expect(eventBus.subscribe).toHaveBeenCalledWith("crud.updated", expect.any(Function));
      expect(eventBus.subscribe).toHaveBeenCalledWith("crud.deleted", expect.any(Function));
    });

    it("should call revalidateTag and revalidatePath correctly on crud event for non-post models", async () => {
      // Capture the callback passed to subscribe
      let createdCallback: ((payload: any) => Promise<void>) | undefined;
      vi.mocked(eventBus.subscribe).mockImplementation((channel, callback) => {
        if (channel === "crud.created") {
          createdCallback = callback as any;
        }
        return Promise.resolve(() => {}); // return mock unsubscribe
      });

      registerProductCrudCacheListener();

      expect(createdCallback).toBeDefined();

      const payload = {
        data: {
          model: "product",
          siteId: "test-site-id",
          item: { id: 1, name: "Test" },
        }
      };

      await createdCallback!(payload);

      expect(revalidateTag).toHaveBeenCalledWith("site-test-site-id", "default");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("should call revalidateTag and revalidatePath correctly on crud event for post models with slug", async () => {
        // Capture the callback passed to subscribe
        let updatedCallback: ((payload: any) => Promise<void>) | undefined;
        vi.mocked(eventBus.subscribe).mockImplementation((channel, callback) => {
          if (channel === "crud.updated") {
            updatedCallback = callback as any;
          }
          return Promise.resolve(() => {}); // return mock unsubscribe
        });

        registerProductCrudCacheListener();

        expect(updatedCallback).toBeDefined();

        const payload = {
          data: {
            model: "post",
            siteId: "test-site-id-post",
            item: { id: 1, slug: "test-post" },
          }
        };

        await updatedCallback!(payload);

        expect(revalidateTag).toHaveBeenCalledWith("site-test-site-id-post", "default");
        expect(revalidatePath).toHaveBeenCalledWith("/blog");
        expect(revalidatePath).toHaveBeenCalledWith("/blog/test-post");
      });

      it("should catch and log errors during cache invalidation", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Make revalidateTag throw an error
        vi.mocked(revalidateTag).mockImplementationOnce(() => {
            throw new Error("Mocked error");
        });

        // Capture the callback passed to subscribe
        let deletedCallback: ((payload: any) => Promise<void>) | undefined;
        vi.mocked(eventBus.subscribe).mockImplementation((channel, callback) => {
          if (channel === "crud.deleted") {
            deletedCallback = callback as any;
          }
          return Promise.resolve(() => {}); // return mock unsubscribe
        });

        registerProductCrudCacheListener();

        expect(deletedCallback).toBeDefined();

        const payload = {
          data: {
            model: "product",
            siteId: "error-site",
            item: { id: 1 },
          }
        };

        await deletedCallback!(payload);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "[crud:crud.deleted] Error invalidating cache:",
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
        vi.mocked(revalidateTag).mockRestore();
      });
  });

  describe("initProductListeners", () => {
      it("should call registerProductCrudCacheListener", () => {
        // Mock registerProductCrudCacheListener is tricky since it's in the same module.
        // We'll just check if it calls subscribe properly as well
        initProductListeners();

        expect(eventBus.subscribe).toHaveBeenCalledWith("crud.created", expect.any(Function));
        expect(eventBus.subscribe).toHaveBeenCalledWith("crud.updated", expect.any(Function));
        expect(eventBus.subscribe).toHaveBeenCalledWith("crud.deleted", expect.any(Function));
      });
  });
});
