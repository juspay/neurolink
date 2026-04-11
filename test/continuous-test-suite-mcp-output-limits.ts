#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Large MCP Response Handling
 *
 * Tests the MCP output normalizer, artifact store, and retrieve_context
 * integration without requiring a live AI provider.
 *
 * 5 sections:
 *  1. ArtifactStore — store, retrieve, cleanup, permissions
 *  2. McpOutputNormalizer — inline and externalize strategies
 *  3. Surrogate result shape — MCP-compatible output, _meta fields
 *  4. Error safety — normalizer never throws
 *  5. retrieve_context artifact resolution — artifactId param
 *
 * Run with: npx tsx test/continuous-test-suite-mcp-output-limits.ts
 */

import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";

import { LocalTempArtifactStore } from "../src/lib/artifacts/artifactStore.js";
import {
  McpOutputNormalizer,
  DEFAULT_MAX_MCP_OUTPUT_BYTES,
  DEFAULT_WARN_MCP_OUTPUT_BYTES,
  NEUROLINK_ARTIFACT_ID_KEY,
} from "../src/lib/mcp/mcpOutputNormalizer.js";

// ─── helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors: string[] = [];

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ✗ ${name}\n    ${msg}`);
    errors.push(`${name}: ${msg}`);
    failed++;
  }
}

function makePayload(sizeBytes: number): string {
  return "x".repeat(sizeBytes);
}

function makeMcpResult(text: string): unknown {
  return { content: [{ type: "text", text }] };
}

// ─── Test root ───────────────────────────────────────────────────────────────
// All per-test artifact stores are nested under a single mkdtemp root so a
// single rm() at teardown cleans everything, with no leaks into tmpdir().

const testRoot = await mkdtemp(join(tmpdir(), "neurolink-test-"));

/** Return a sub-directory path under the test root. */
function underTestDir(name: string): string {
  return join(testRoot, name);
}

// ─── Section 1: ArtifactStore ───────────────────────────────────────────────

console.log("\nSection 1: ArtifactStore");

const testDir = underTestDir("s1-main");
const store = new LocalTempArtifactStore(testDir);

await test("store() returns ArtifactRef with correct metadata", async () => {
  const payload = JSON.stringify({ key: "value", items: [1, 2, 3] });
  const ref = await store.store(payload, {
    toolName: "test_tool",
    serverId: "test-server",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "json",
  });

  assert.ok(typeof ref.id === "string" && ref.id.length > 0, "id is set");
  assert.equal(ref.meta.toolName, "test_tool");
  assert.equal(ref.meta.serverId, "test-server");
  assert.equal(ref.meta.contentType, "json");
  assert.ok(ref.meta.createdAt > 0, "createdAt is set");
});

await test("retrieve() returns the exact stored payload", async () => {
  const payload = "hello world\nline 2\nline 3";
  const ref = await store.store(payload, {
    toolName: "echo_tool",
    serverId: "srv",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "text",
  });

  const retrieved = await store.retrieve(ref.id);
  assert.equal(retrieved, payload);
});

await test("retrieve() returns null for unknown id", async () => {
  const result = await store.retrieve("00000000-0000-0000-0000-000000000000");
  assert.equal(result, null);
});

await test("delete() removes the artifact", async () => {
  const payload = "to be deleted";
  const ref = await store.store(payload, {
    toolName: "t",
    serverId: "s",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "text",
  });

  await store.delete(ref.id);
  const result = await store.retrieve(ref.id);
  assert.equal(result, null);
});

await test("cleanup() removes only expired artifacts", async () => {
  const payload = "cleanup test";
  const ref = await store.store(payload, {
    toolName: "t",
    serverId: "s",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "text",
  });

  // Cleanup with 1-hour TTL — the artifact was just created, should survive
  const deleted = await store.cleanup(60 * 60 * 1000);
  assert.equal(deleted, 0);

  // Cleanup with -1000ms TTL — cutoff is 1 second in the future,
  // so every artifact (including ones just created) is treated as expired.
  const deleted2 = await store.cleanup(-1000);
  assert.ok(deleted2 >= 1, "at least one artifact cleaned up");

  const result = await store.retrieve(ref.id);
  assert.equal(result, null, "artifact was cleaned up");
});

await test("generatePreview() truncates long payloads", () => {
  const long = "a".repeat(2000);
  const preview = store.generatePreview(long);
  assert.ok(preview.length < long.length, "preview is shorter");
  assert.ok(preview.endsWith("…"), "preview ends with ellipsis");
});

// ─── Section 2: McpOutputNormalizer strategies ──────────────────────────────

console.log("\nSection 2: McpOutputNormalizer strategies");

const ctx = { toolName: "big_tool", serverId: "test-server" };

await test("small payload (below warnBytes) passes through inline with no logging", async () => {
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 1000, warnBytes: 500 },
    new LocalTempArtifactStore(underTestDir("s2a")),
  );
  const payload = makeMcpResult("hello");
  const out = await normalizer.normalize(payload, ctx);

  assert.equal(out.isExternalized, false);
  assert.deepEqual(out.result, payload);
});

await test("payload between warnBytes and maxBytes passes through inline", async () => {
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 1000, warnBytes: 100 },
    new LocalTempArtifactStore(underTestDir("s2b")),
  );
  // ~200 bytes — above warnBytes but below maxBytes
  const payload = makeMcpResult(makePayload(200));
  const out = await normalizer.normalize(payload, ctx);

  assert.equal(out.isExternalized, false);
  assert.deepEqual(out.result, payload);
});

await test("inline strategy: oversized payload always passes through", async () => {
  const normalizer = new McpOutputNormalizer({
    strategy: "inline",
    maxBytes: 100,
    warnBytes: 50,
  });
  const payload = makeMcpResult(makePayload(5000));
  const out = await normalizer.normalize(payload, ctx);

  assert.equal(out.isExternalized, false);
  assert.deepEqual(out.result, payload);
});

await test("externalize strategy: oversized payload is stored and surrogate returned", async () => {
  const extStore = new LocalTempArtifactStore(underTestDir("s2c"));
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 100, warnBytes: 50 },
    extStore,
  );
  const bigPayload = makePayload(500);
  const out = await normalizer.normalize(makeMcpResult(bigPayload), ctx);

  assert.equal(out.isExternalized, true);
  assert.ok(typeof out.artifactId === "string", "artifactId is set");

  // Full payload is retrievable from the store
  const stored = await extStore.retrieve(out.artifactId!);
  assert.ok(stored !== null, "artifact is retrievable");
  assert.ok(
    stored!.includes(bigPayload.slice(0, 100)),
    "stored payload matches",
  );
});

await test("externalize without store: falls through inline + logs error", async () => {
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 100, warnBytes: 50 },
    // deliberately no artifact store
  );
  const payload = makeMcpResult(makePayload(500));
  const out = await normalizer.normalize(payload, ctx);

  // Must not throw and must not lose the data
  assert.equal(out.isExternalized, false);
  assert.deepEqual(out.result, payload, "raw result returned on store failure");
});

// ─── Section 3: Surrogate result shape ──────────────────────────────────────

console.log("\nSection 3: Surrogate result shape");

await test("externalize surrogate is valid MCP CallToolResult shape", async () => {
  const extStore = new LocalTempArtifactStore(underTestDir("s3a"));
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 100, warnBytes: 50 },
    extStore,
  );
  const out = await normalizer.normalize(makeMcpResult(makePayload(500)), ctx);

  const surrogate = out.result as {
    content: Array<{ type: string; text: string }>;
    _meta: Record<string, unknown>;
  };
  assert.ok(Array.isArray(surrogate.content), "content is array");
  assert.equal(surrogate.content[0].type, "text");
  assert.ok(surrogate.content[0].text.includes("big_tool"), "toolName in text");
  assert.ok(
    surrogate.content[0].text.includes("retrieve_context"),
    "retrieve_context hint present",
  );
});

await test("externalize surrogate carries _meta with artifactId", async () => {
  const extStore = new LocalTempArtifactStore(underTestDir("s3b"));
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 100, warnBytes: 50 },
    extStore,
  );
  const out = await normalizer.normalize(makeMcpResult(makePayload(500)), ctx);

  const surrogate = out.result as Record<string, unknown>;
  const meta = surrogate._meta as Record<string, unknown>;
  assert.ok(meta, "_meta is present");
  assert.equal(typeof meta[NEUROLINK_ARTIFACT_ID_KEY], "string");
  assert.equal(meta[NEUROLINK_ARTIFACT_ID_KEY], out.artifactId);
  assert.ok(typeof meta.originalBytes === "number");
  assert.equal(meta.toolName, "big_tool");
});

await test("surrogate text embeds the artifact ID marker for memory manager extraction", async () => {
  const extStore = new LocalTempArtifactStore(underTestDir("s3c"));
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 100, warnBytes: 50 },
    extStore,
  );
  const out = await normalizer.normalize(makeMcpResult(makePayload(500)), ctx);

  const surrogate = out.result as {
    content: Array<{ type: string; text: string }>;
  };
  const text = surrogate.content[0].text;
  assert.ok(
    text.includes(`${NEUROLINK_ARTIFACT_ID_KEY}=${out.artifactId}`),
    "artifact ID marker embedded in surrogate text",
  );
});

// ─── Section 4: Error safety ─────────────────────────────────────────────────

console.log("\nSection 4: Error safety");

await test("normalize() does not throw on circular reference input", async () => {
  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 1, warnBytes: 0 },
    new LocalTempArtifactStore(underTestDir("s4a")),
  );

  const circ: Record<string, unknown> = { a: 1 };
  circ.self = circ;

  let threw = false;
  try {
    await normalizer.normalize(circ, ctx);
  } catch {
    threw = true;
  }
  assert.equal(threw, false, "normalize() did not throw");
});

await test("normalize() returns raw result when artifact store throws", async () => {
  // Store that always throws on store()
  const brokenStore = {
    store: async () => {
      throw new Error("disk full");
    },
    retrieve: async () => null,
    delete: async () => {},
    cleanup: async () => 0,
    generatePreview: (p: string) => p.slice(0, 100),
  };

  const normalizer = new McpOutputNormalizer(
    { strategy: "externalize", maxBytes: 100, warnBytes: 50 },
    brokenStore,
  );
  const payload = makeMcpResult(makePayload(500));
  const out = await normalizer.normalize(payload, ctx);

  assert.equal(out.isExternalized, false);
  assert.deepEqual(out.result, payload, "raw result returned when store fails");
});

// ─── Section 5: retrieve_context artifact resolution ────────────────────────

console.log("\nSection 5: retrieve_context artifact resolution");

await test("retrieve() returns exact stored payload", async () => {
  const s = new LocalTempArtifactStore(underTestDir("s5a"));
  const payload = JSON.stringify({ result: "full data", rows: 100 });
  const ref = await s.store(payload, {
    toolName: "query_db",
    serverId: "db-server",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "json",
  });

  const content = await s.retrieve(ref.id);
  assert.equal(content, payload);
});

await test("retrieve() + slice simulates offset+limit pagination", async () => {
  const s = new LocalTempArtifactStore(underTestDir("s5b"));
  const payload = "abcdefghijklmnopqrstuvwxyz";
  const ref = await s.store(payload, {
    toolName: "t",
    serverId: "s",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "text",
  });

  const content = await s.retrieve(ref.id);
  assert.ok(content !== null);
  // Simulate offset=5, limit=5
  assert.equal(content!.slice(5, 10), "fghij");
});

await test("retrieve() returns null for missing artifact", async () => {
  const s = new LocalTempArtifactStore(underTestDir("s5c"));
  const result = await s.retrieve("non-existent-id");
  assert.equal(result, null);
});

// ─── Config constants ─────────────────────────────────────────────────────────

console.log("\nConfig constants");

await test("default constants are correct", () => {
  assert.equal(DEFAULT_MAX_MCP_OUTPUT_BYTES, 100 * 1024);
  assert.equal(DEFAULT_WARN_MCP_OUTPUT_BYTES, 50 * 1024);
});

// ─── Section 6: retrieve_context without Redis ────────────────────────────────
// Verifies Fix 1: artifact retrieval works with no memory manager (no Redis).

console.log("\nSection 6: retrieve_context without Redis");

import { createMemoryRetrievalTools } from "../src/lib/memory/memoryRetrievalTools.js";

await test("retrieve_context with artifactId works without memory manager", async () => {
  const s = new LocalTempArtifactStore(underTestDir("s6a"));
  const payload = JSON.stringify({ key: "value", rows: [1, 2, 3] });
  const ref = await s.store(payload, {
    toolName: "my_tool",
    serverId: "srv",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "json",
  });

  // createMemoryRetrievalTools with undefined manager — artifact path only
  const tools = createMemoryRetrievalTools(undefined, s);
  const execute = tools.retrieve_context.execute as (
    params: unknown,
    ctx: unknown,
  ) => Promise<unknown>;

  const result = await execute(
    { artifactId: ref.id },
    { toolCallId: "t1", messages: [] },
  );

  const r = result as Record<string, unknown>;
  assert.equal(r.artifactId, ref.id);
  assert.equal(r.content, payload);
  assert.equal(r.totalSize, payload.length);
  assert.equal(r.hasMore, false);
});

await test("retrieve_context with offset+limit pagination works without memory manager", async () => {
  const s = new LocalTempArtifactStore(underTestDir("s6b"));
  const payload = "abcdefghijklmnopqrstuvwxyz";
  const ref = await s.store(payload, {
    toolName: "t",
    serverId: "s",
    sizeBytes: Buffer.byteLength(payload),
    contentType: "text",
  });

  const tools = createMemoryRetrievalTools(undefined, s);
  const execute = tools.retrieve_context.execute as (
    params: unknown,
    ctx: unknown,
  ) => Promise<unknown>;

  const result = await execute(
    { artifactId: ref.id, offset: 5, limit: 5 },
    { toolCallId: "t2", messages: [] },
  );

  const r = result as Record<string, unknown>;
  assert.equal(r.content, "fghij");
  assert.equal(r.offset, 5);
  assert.equal(r.limit, 5);
  assert.equal(r.totalSize, 26);
  assert.equal(r.hasMore, true);
});

await test("retrieve_context returns error for missing artifact without memory manager", async () => {
  const s = new LocalTempArtifactStore(underTestDir("s6c"));
  const tools = createMemoryRetrievalTools(undefined, s);
  const execute = tools.retrieve_context.execute as (
    params: unknown,
    ctx: unknown,
  ) => Promise<unknown>;

  const result = await execute(
    { artifactId: "non-existent-id" },
    { toolCallId: "t3", messages: [] },
  );

  const r = result as Record<string, unknown>;
  assert.ok(typeof r.error === "string", "error is reported");
});

await test("retrieve_context with sessionId returns error when no memory manager", async () => {
  const s = new LocalTempArtifactStore(underTestDir("s6d"));
  const tools = createMemoryRetrievalTools(undefined, s);
  const execute = tools.retrieve_context.execute as (
    params: unknown,
    ctx: unknown,
  ) => Promise<unknown>;

  // sessionId without Redis — should get a clear error, not a crash
  const result = await execute(
    { sessionId: "some-session" },
    { toolCallId: "t4", messages: [] },
  );

  const r = result as Record<string, unknown>;
  assert.ok(typeof r.error === "string", "error reported for missing manager");
  assert.ok(
    (r.error as string).includes("Redis"),
    "error mentions Redis requirement",
  );
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

try {
  await rm(testRoot, { recursive: true, force: true });
} catch {
  // ignore
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log("\nFailed tests:");
  for (const e of errors) {
    console.log(`  • ${e}`);
  }
  process.exit(1);
} else {
  console.log("All tests passed.");
}
