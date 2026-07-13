/**
 * prisma/wait-db.js
 *
 * Checks database connectivity before running Prisma migrations.
 * Prevents container crash during rolling deployments on Dokploy/VPS.
 */

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log("ℹ️  DATABASE_URL not set, skipping connection wait.");
  process.exit(0);
}

async function checkConnection() {
  try {
    const parsed = new URL(dbUrl);
    const host = parsed.hostname;
    const port = parseInt(parsed.port || "5432");

    console.log(`⏱️  Waiting for database at ${host}:${port}...`);
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      try {
        const socket = await Bun.connect({
          hostname: host,
          port: port,
          socket: {
            data() {}
          }
        });
        socket.end();
        console.log("✅ Database server is reachable and active!");
        process.exit(0);
      } catch (e) {
        attempts++;
        console.log(`⏳ [Attempt ${attempts}/${maxAttempts}] Database not ready yet, retrying in 2 seconds...`);
        if (attempts >= maxAttempts) {
          console.error("❌ Database server is unreachable after maximum attempts.");
          process.exit(1);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch (err) {
    console.error("❌ Failed to parse DATABASE_URL:", err.message);
    process.exit(1);
  }
}

checkConnection();
