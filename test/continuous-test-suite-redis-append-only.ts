#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Redis append-only message storage
 *
 * `storeConversationTurn` used to re-serialize and SET the ENTIRE conversation
 * every turn, so per-turn write cost grew with history size. Measured against
 * local Redis: 200 turns of 2KB messages stayed flat at 2ms, but 400 turns of
 * 20KB messages (~16MB blob) went 2ms -> 61ms — a 30x degradation on exactly
 * the agentic tool-output profile.
 *
 * Messages now live in an append-only companion LIST (`<key>:msgs`) while the
 * blob keeps only metadata, flagged with a marker. A blob WITHOUT the marker is
 * a legacy record whose inline messages are authoritative — read as-is and
 * converted on its next write. That is the backward-compatibility contract this
 * suite pins.
 *
 * Requires a local Redis on 127.0.0.1:6379; SKIPs cleanly when unavailable.
 *
 * Run: npx tsx test/continuous-test-suite-redis-append-only.ts
 *      pnpm run test:redis-append-only
 */

import { createClient } from "redis";
import { RedisConversationMemoryManager } from "../src/lib/core/redisConversationMemoryManager.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Redis append-only storage");

/**
 * NOTE: assertion messages must NEVER interpolate message content — the
 * harness downgrades a throw to SKIP when the text matches
 * `isExpectedProviderError()`, silently turning a failure into ⊘.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const HOST = "127.0.0.1";
const PORT = 6379;
const PREFIX = `nltest:${Date.now()}:conversation:`;
const USER = "u1";

const raw = createClient({ socket: { host: HOST, port: PORT } });
let redisUp = false;
try {
  await raw.connect();
  await raw.ping();
  redisUp = true;
} catch {
  redisUp = false;
}

function newManager(): RedisConversationMemoryManager {
  return new RedisConversationMemoryManager(
    {
      enabled: true,
      maxSessions: 50,
      maxTurnsPerSession: 1000,
      enableSummarization: false,
    },
    { host: HOST, port: PORT, keyPrefix: PREFIX, ttl: 300 },
  );
}

async function storeTurns(
  mgr: RedisConversationMemoryManager,
  sessionId: string,
  count: number,
  body = "body",
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await mgr.storeConversationTurn({
      sessionId,
      userId: USER,
      userMessage: `q${i} ${body}`,
      aiResponse: `a${i} ${body}`,
      enableSummarization: false,
    });
  }
}

const sessionKey = (sessionId: string): string =>
  `${PREFIX}${USER}:${sessionId}`;

await runSuite(async () => {
  if (!redisUp) {
    await test("redis reachable", async () => {
      throw new Error("SKIP: no local Redis on 6379");
    });
    return;
  }

  section("Messages move to an append-only LIST");

  await test("blob holds no messages, LIST holds them all", async () => {
    const mgr = newManager();
    await mgr.initialize();
    const sid = "s-split";
    await storeTurns(mgr, sid, 3);

    const blob = JSON.parse((await raw.get(sessionKey(sid))) ?? "{}");
    const listLen = await raw.lLen(`${sessionKey(sid)}:msgs`);
    assert(blob.messages.length === 0, "metadata blob still carries messages");
    assert(listLen === 6, "companion LIST does not hold every message");
    await mgr.close();
  });

  await test("reads return the full history", async () => {
    const mgr = newManager();
    await mgr.initialize();
    const sid = "s-read";
    await storeTurns(mgr, sid, 4);
    const messages = await mgr.getSessionMessages(sid, USER);
    assert(messages.length === 8, "read path lost messages");
    assert(
      messages[0].role === "user" && messages[1].role === "assistant",
      "message ordering was not preserved",
    );
    await mgr.close();
  });

  await test("buildContextMessages sees the split history", async () => {
    const mgr = newManager();
    await mgr.initialize();
    const sid = "s-ctx";
    await storeTurns(mgr, sid, 3);
    const ctx = await mgr.buildContextMessages(sid, USER);
    assert(ctx.length === 6, "context builder lost split messages");
    await mgr.close();
  });

  section("Backward compatibility with legacy blobs");

  await test("a legacy inline-messages blob is read correctly", async () => {
    const sid = "s-legacy";
    // Exactly the pre-migration on-disk shape: messages inline, no marker.
    await raw.set(
      sessionKey(sid),
      JSON.stringify({
        sessionId: sid,
        userId: USER,
        title: "legacy",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          { id: "m1", role: "user", content: "old q" },
          { id: "m2", role: "assistant", content: "old a" },
        ],
      }),
    );
    const mgr = newManager();
    await mgr.initialize();
    const messages = await mgr.getSessionMessages(sid, USER);
    assert(messages.length === 2, "legacy blob messages were not read");
    assert(messages[0].content === "old q", "legacy message content was lost");
    await mgr.close();
  });

  await test("a legacy blob converts on its next write, losing nothing", async () => {
    const sid = "s-migrate";
    await raw.set(
      sessionKey(sid),
      JSON.stringify({
        sessionId: sid,
        userId: USER,
        title: "legacy",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          { id: "m1", role: "user", content: "old q" },
          { id: "m2", role: "assistant", content: "old a" },
        ],
      }),
    );
    const mgr = newManager();
    await mgr.initialize();
    await storeTurns(mgr, sid, 1);

    const listLen = await raw.lLen(`${sessionKey(sid)}:msgs`);
    assert(listLen === 4, "conversion did not carry the legacy messages over");
    const messages = await mgr.getSessionMessages(sid, USER);
    assert(messages.length === 4, "history was lost during conversion");
    assert(
      messages[0].content === "old q",
      "oldest legacy message was dropped",
    );
    await mgr.close();
  });

  section("Scan-based paths must not trip on the LIST keys");

  await test("getStats does not double-count or hit WRONGTYPE", async () => {
    const mgr = newManager();
    await mgr.initialize();
    await storeTurns(mgr, "s-stats-1", 2);
    await storeTurns(mgr, "s-stats-2", 2);
    const stats = await mgr.getStats();
    assert(stats.totalSessions >= 2, "session count collapsed after the split");
    // The companion LIST keys must not be counted as sessions.
    const allKeys = await raw.keys(`${PREFIX}*`);
    const msgKeys = allKeys.filter((k) => k.endsWith(":msgs"));
    assert(msgKeys.length > 0, "test did not actually create LIST keys");
    assert(
      stats.totalSessions === allKeys.length - msgKeys.length,
      "message LIST keys were counted as sessions",
    );
    await mgr.close();
  });

  await test("listSessions reports a real message count", async () => {
    const mgr = newManager();
    await mgr.initialize();
    const sid = "s-list";
    await storeTurns(mgr, sid, 3);
    const sessions = await mgr.listSessions();
    const entry = sessions.find((s) => s.id === sid);
    assert(entry !== undefined, "split session missing from the listing");
    assert(entry!.messageCount === 6, "listing reported a stale message count");
    await mgr.close();
  });

  section("Lifecycle");

  await test("clearSession removes the companion LIST too", async () => {
    const mgr = newManager();
    await mgr.initialize();
    const sid = "s-clear";
    await storeTurns(mgr, sid, 2);
    assert(
      (await raw.exists(`${sessionKey(sid)}:msgs`)) === 1,
      "test did not create a LIST to clear",
    );
    await mgr.clearSession(sid, USER);
    assert(
      (await raw.exists(`${sessionKey(sid)}:msgs`)) === 0,
      "clearSession leaked the companion message LIST",
    );
    assert(
      (await raw.exists(sessionKey(sid))) === 0,
      "clearSession left the metadata blob behind",
    );
    await mgr.close();
  });

  await test("setSessionMessages replaces rather than appends", async () => {
    const mgr = newManager();
    await mgr.initialize();
    const sid = "s-replace";
    await storeTurns(mgr, sid, 3);
    await mgr.setSessionMessages(
      sid,
      [{ id: "n1", role: "user", content: "only one" }],
      USER,
    );
    const messages = await mgr.getSessionMessages(sid, USER);
    assert(messages.length === 1, "replacement appended instead of replacing");
    assert(
      (await raw.lLen(`${sessionKey(sid)}:msgs`)) === 1,
      "companion LIST was not rewritten on replacement",
    );
    await mgr.close();
  });

  await test("both keys carry a TTL", async () => {
    const mgr = newManager();
    await mgr.initialize();
    const sid = "s-ttl";
    await storeTurns(mgr, sid, 1);
    assert((await raw.ttl(sessionKey(sid))) > 0, "metadata blob has no TTL");
    assert(
      (await raw.ttl(`${sessionKey(sid)}:msgs`)) > 0,
      "companion LIST has no TTL and would outlive the session",
    );
    await mgr.close();
  });

  // Housekeeping: this suite writes under a unique prefix, so clean it up.
  const leftovers = await raw.keys(`${PREFIX}*`);
  if (leftovers.length > 0) {
    await raw.del(leftovers);
  }
  await raw.quit();
});
