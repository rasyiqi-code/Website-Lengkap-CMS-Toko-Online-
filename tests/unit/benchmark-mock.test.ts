import { test, vi } from "vitest";
import { checkAndUpdateExpiredSubscriptions } from "@/modules/subscription/services/expiration.service";
import { db } from "@/modules/shared/core/db";
import { GRACE_PERIOD_DAYS } from "@/lib/billing/constants";
import { performance } from "perf_hooks";

vi.mock("@/modules/shared/core/db", () => ({
    db: {
        subscription: {
            findMany: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        site: {
            findUnique: vi.fn(),
        }
    }
}));

vi.mock("@/modules/shared/core/event-bus", () => ({
    eventBus: {
        request: vi.fn(),
        publish: vi.fn(),
    }
}));

test("benchmark expiration service with 1000 items", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * (GRACE_PERIOD_DAYS + 1));
    const activeSubs = Array.from({ length: 1000 }).map((_, i) => ({
        id: `sub-${i}`,
        siteId: `site-${i}`,
        status: "active",
        endDate: past,
        plan: { name: "Pro" }
    }));

    (db.subscription.findMany as any).mockResolvedValue(activeSubs);
    (db.subscription.update as any).mockImplementation(async () => {
        // mock delay of a typical db query
        await new Promise(r => setTimeout(r, 1));
        return {};
    });
    (db.subscription.updateMany as any).mockImplementation(async () => {
        // mock delay of a typical db query
        await new Promise(r => setTimeout(r, 5));
        return { count: 1000 };
    });

    const start = performance.now();
    const result = await checkAndUpdateExpiredSubscriptions();
    const end = performance.now();

    console.log(`Execution time for 1000 items: ${end - start} ms`);
    console.log(`Update counts: updatedToExpired=${result.updatedToExpired}`);
});
