import { db } from "./src/modules/shared/core/db";

async function run() {
    console.log("Starting benchmark...");

    const numPlans = 1000;
    const plansToInsert = Array.from({ length: numPlans }).map((_, i) => ({
        id: `plan_${Date.now()}_${i}`,
        name: `Plan ${i}`,
        price: 1000,
        currency: "USD",
        interval: "monthly",
        features: ["feature 1"],
    }));

    // Clean up
    await db.plan.deleteMany({
        where: {
            id: { startsWith: 'plan_' }
        }
    });

    console.log(`Inserting ${numPlans} plans sequentially (create)...`);
    const startCreate = performance.now();
    for (const plan of plansToInsert) {
        await db.plan.create({ data: plan as any });
    }
    const endCreate = performance.now();
    const durationCreate = endCreate - startCreate;
    console.log(`create took: ${durationCreate.toFixed(2)}ms`);

    // Clean up
    await db.plan.deleteMany({
        where: {
            id: { startsWith: 'plan_' }
        }
    });

    console.log(`Inserting ${numPlans} plans in bulk (createMany)...`);
    const startCreateMany = performance.now();
    await db.plan.createMany({ data: plansToInsert as any });
    const endCreateMany = performance.now();
    const durationCreateMany = endCreateMany - startCreateMany;
    console.log(`createMany took: ${durationCreateMany.toFixed(2)}ms`);

    // Clean up
    await db.plan.deleteMany({
        where: {
            id: { startsWith: 'plan_' }
        }
    });

    console.log(`Improvement: ${(durationCreate / durationCreateMany).toFixed(2)}x faster`);
}

run().catch(console.error).finally(() => process.exit(0));
