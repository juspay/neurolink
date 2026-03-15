import { createClient } from "redis";
import { NeuroLink } from "../dist/index.js";

async function main() {
  const sessionId = `debug-${Date.now()}`;
  const userId = `user-${Date.now()}`;

  console.log("Creating SDK with Redis...");
  const sdk = new NeuroLink({
    conversationMemory: {
      enabled: true,
      enableSummarization: false,
      redisConfig: { url: "redis://localhost:6379" },
    },
  });

  console.log("Before generate:");
  console.log(
    "  conversationMemory:",
    (sdk as any).conversationMemory?.constructor?.name || "undefined",
  );
  console.log("  needsInit:", (sdk as any).conversationMemoryNeedsInit);

  console.log(
    "\nCalling generate with sessionId:",
    sessionId,
    "userId:",
    userId,
  );
  try {
    const result = await sdk.generate({
      input: { text: "Remember this code: REDIS-DEBUG-42" },
      provider: "vertex",
      maxTokens: 100,
      context: { sessionId, userId },
    });
    console.log("Generate result:", result?.content?.substring(0, 100));
  } catch (e: any) {
    console.log("Generate error:", e.message?.substring(0, 200));
  }

  console.log("\nAfter generate:");
  console.log(
    "  conversationMemory:",
    (sdk as any).conversationMemory?.constructor?.name || "undefined",
  );

  // Wait for writes
  console.log("\nWaiting 5s...");
  await new Promise((r) => setTimeout(r, 5000));

  // Check Redis
  const client = createClient({ url: "redis://localhost:6379" });
  await client.connect();
  const keys = await client.keys("*neurolink*");
  console.log("\nRedis keys:", keys.length > 0 ? keys : "NONE");

  // Also check for any keys with the session ID
  const sessionKeys = await client.keys(`*${sessionId.substring(0, 20)}*`);
  console.log("Session keys:", sessionKeys.length > 0 ? sessionKeys : "NONE");

  if (keys.length > 0) {
    for (const key of keys.slice(0, 3)) {
      const val = await client.get(key);
      console.log(`Key ${key}: ${val?.substring(0, 200)}...`);
    }
  }

  await client.disconnect();
  try {
    await sdk.shutdown?.();
  } catch {}
  process.exit(0);
}

main();
