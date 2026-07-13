import { test, expect, vi, beforeEach } from "vitest";
import { checkAndUpdateExpiredSubscriptions } from "@/modules/subscription/services/expiration.service";
import { db } from "@/modules/shared/core/db";
import { eventBus } from "@/modules/shared/core/event-bus";
import { GRACE_PERIOD_DAYS } from "@/lib/billing/constants";

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

beforeEach(() => {
    vi.clearAllMocks();
});

test("should update expired subscriptions and return correct counts", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * (GRACE_PERIOD_DAYS + 1));
    const activeSubs = [
        {
            id: "sub-1",
            siteId: "site-1",
            status: "active",
            endDate: past,
            plan: { name: "Pro" }
        },
        {
            id: "sub-2",
            siteId: "site-2",
            status: "active",
            endDate: past,
            plan: { name: "Pro" }
        }
    ];

    (db.subscription.findMany as any).mockResolvedValue(activeSubs);
    (db.subscription.update as any).mockResolvedValue({});
    (db.subscription.updateMany as any).mockResolvedValue({ count: 2 });

    const result = await checkAndUpdateExpiredSubscriptions();

    // With current implementation, db.subscription.update is called individually
    // With optimized, db.subscription.updateMany should be called

    expect(result.updatedToExpired).toBe(2);
});
