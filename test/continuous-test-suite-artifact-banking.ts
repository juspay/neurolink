#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Artifact Banking (N3)
 *
 * Drives the shipped surface only — `NeuroLink` from `../dist/index.js`:
 *   bankArtifact() / readArtifact() / getArtifactStore() as the host API, and
 *   executeTool("retrieve_context", …) as the exact path a model read-back
 *   takes (same registry, same result envelope).
 *
 * The contract under test is "bank the whole payload, hand back a pointer":
 * previews are bounded, the FILE is not, and every byte comes back through the
 * tool that already existed. So the load-bearing assertions are byte-exact
 * round trips, not "looks about right".
 *
 * Covered: lazy store creation with no MCP config at all, preview bounding and
 * its hard cap, UTF-8 byte accounting, byte-exact paging back through
 * retrieve_context, host-side reads, unknown ids, path-traversal ids, the
 * cross-process sidecar path (N3.3, a real second node process), and one live
 * run where the model reads back content it was never shown.
 *
 * Backend choice (`artifacts.store` / `setArtifactStore` / `STORAGE_TYPE`):
 * an injected store is the one every path uses — the MCP output normalizer
 * included, driven through a real stdio fixture; a range-capable backend is
 * asked for windows, never the payload; Redis holds artifacts with a TTL,
 * pages them byte-exact (ASCII fast path and the multi-byte fallback), and a
 * second node process reads them. Artifact search returns offsets the model
 * can jump to, bounded snippets on one-line JSON, and pages past 50 hits.
 *
 * Every mechanical case runs without credentials; the Redis cases SKIP when
 * nothing answers at REDIS_URL (or localhost:6379), and the live case SKIPs
 * without a provider.
 *
 * Run: pnpm run test:artifact-banking [--provider=vertex]
 */

// See test:hitl and test:multimodal:sdk: the tracked .mcp-config.json makes
// every NeuroLink instance wait the full 60s MCP client timeout when the
// filesystem server cannot start. Measured here at 68s without this and 7s
// with it, same assertions either way.
process.env.NEUROLINK_SKIP_MCP = "true";

import { createHash, randomUUID } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "redis";

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  runCommand,
  tempDir,
  Skip,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink, getPoolStats } from "../dist/index.js";
import type {
  ArtifactMeta,
  ArtifactPageRequest,
  ArtifactRef,
  ArtifactStore,
  ArtifactWindow,
  BankedArtifactRef,
  MCPServerInfo,
} from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_ENTRY = join(REPO_ROOT, "dist", "index.js");
const MCP_FIXTURE = join(
  REPO_ROOT,
  "test",
  "fixtures",
  "mcp-artifact-store-server.mjs",
);

const { test, runSuite, opts, section } = defineSuite("Artifact Banking", {
  defaultProvider: "vertex",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Host = InstanceType<typeof NeuroLink>;

/** The registry wraps every tool result: `{ success, data, usage, metadata }`. */
type ToolEnvelope = { success?: boolean; data?: unknown };

/** What retrieve_context returns on the artifact path. */
type ArtifactPage = {
  artifactId?: string;
  content?: string;
  totalSize?: number;
  hasMore?: boolean;
  offset?: number;
  limit?: number;
  error?: string;
};

function unwrap(envelope: unknown): unknown {
  const record = envelope as ToolEnvelope | undefined;
  return record && typeof record === "object" && "data" in record
    ? record.data
    : envelope;
}

function asPage(envelope: unknown): ArtifactPage {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object",
    "retrieve_context must return an object",
  );
  return payload as ArtifactPage;
}

/** Compare large strings by digest — never by pasting them into a message. */
function digest(value: string): string {
  return createHash("sha256").update(value, "utf-8").digest("hex").slice(0, 16);
}

/**
 * Deterministic filler with a marker buried past any preview, so "did the
 * whole payload survive?" and "did the model actually read it back?" are both
 * answerable without inspecting content by eye.
 */
function payloadOf(chars: number, marker: string): string {
  const filler = "0123456789abcdef-";
  let out = "";
  while (out.length < chars) {
    out += filler;
  }
  out = out.slice(0, chars);
  const at = Math.floor(chars * 0.75);
  return out.slice(0, at) + marker + out.slice(at + marker.length);
}

async function toolNames(host: Host): Promise<string[]> {
  const tools = await host.getAllAvailableTools();
  return tools.map((tool: { name: string }) => tool.name);
}

function readPage(
  host: Host,
  artifactId: string,
  offset: number,
  limit: number,
): Promise<unknown> {
  return host.executeTool("retrieve_context", { artifactId, offset, limit });
}

/** Walk an artifact back through the model-facing tool, one window at a time. */
async function pageBackThroughTool(
  host: Host,
  artifactId: string,
  window: number,
): Promise<{ content: string; pages: number; totalSize: number }> {
  let content = "";
  let offset = 0;
  let pages = 0;
  for (;;) {
    const page = asPage(await readPage(host, artifactId, offset, window));
    assert(!page.error, "paging must not error mid-walk");
    assert(typeof page.content === "string", "a page must carry content");
    content += page.content ?? "";
    pages += 1;
    if (!page.hasMore) {
      return { content, pages, totalSize: page.totalSize ?? 0 };
    }
    offset += (page.content ?? "").length;
    assert(pages < 500, "paging failed to terminate");
  }
}

const MB_CHARS = 1_048_576;

// ---------------------------------------------------------------------------
// Backend fakes, search helpers, and the Redis probe
// ---------------------------------------------------------------------------

/** What retrieve_context returns on the artifact search path. */
type ArtifactSearch = {
  artifactId?: string;
  matchCount?: number;
  totalMatches?: number;
  truncated?: boolean;
  nextSearchOffset?: number;
  totalSize?: number;
  matches?: Array<{
    offset: number;
    line: number;
    snippetOffset: number;
    snippet: string;
  }>;
  error?: string;
};

function asSearch(envelope: unknown): ArtifactSearch {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object",
    "retrieve_context must return an object",
  );
  return payload as ArtifactSearch;
}

function searchArtifact(
  host: Host,
  artifactId: string,
  search: string,
  offset?: number,
): Promise<unknown> {
  return host.executeTool("retrieve_context", {
    artifactId,
    search,
    ...(offset === undefined ? {} : { offset }),
  });
}

/** First text block of an MCP CallToolResult. */
function textOf(result: unknown): string {
  const record = result as { content?: Array<{ text?: string }> } | undefined;
  return record?.content?.[0]?.text ?? "";
}

/**
 * An ArtifactStore that lives in a Map and records how it was read. No shipped
 * backend can show, from the outside, that an injected store is the one every
 * path uses or that a paged read asked for a WINDOW — this one can.
 */
class RecordingStore implements ArtifactStore {
  readonly payloads = new Map<string, string>();
  readonly fullReads: string[] = [];
  closed = false;

  generatePreview(payload: string): string {
    return payload.slice(0, 100);
  }

  async store(
    payload: string,
    meta: Omit<ArtifactMeta, "createdAt">,
  ): Promise<ArtifactRef> {
    // Unique across instances: two fakes must never hand out the same id, or
    // "the previous store's ids stop resolving" cannot be told from a swap
    // that never happened.
    const id = `fake-${randomUUID()}`;
    this.payloads.set(id, payload);
    return {
      id,
      preview: this.generatePreview(payload),
      sizeBytes: meta.sizeBytes,
      meta: { ...meta, createdAt: Date.now() },
    };
  }

  async retrieve(id: string): Promise<string | null> {
    this.fullReads.push(id);
    return this.payloads.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.payloads.delete(id);
  }

  async cleanup(): Promise<number> {
    return 0;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

/** The same store, with native range reads. */
class RangeRecordingStore extends RecordingStore {
  readonly rangeReads: Array<{ id: string; offset?: number; limit?: number }> =
    [];

  async retrieveRange(
    id: string,
    range: ArtifactPageRequest,
  ): Promise<ArtifactWindow | null> {
    this.rangeReads.push({ id, ...range });
    const payload = this.payloads.get(id);
    if (payload === undefined) {
      return null;
    }
    const offset = range.offset ?? 0;
    const content =
      range.limit === undefined
        ? payload.slice(offset)
        : payload.slice(offset, offset + range.limit);
    return { content, offset, totalLength: payload.length };
  }
}

/** Where the Redis cases look: the environment, else a local default. */
const TEST_REDIS_URL =
  process.env.REDIS_URL ??
  (process.env.REDIS_HOST
    ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? "6379"}`
    : "redis://localhost:6379");

const ARTIFACT_KEY_PREFIX = "neurolink:artifact:";

/** A direct client for inspecting keys — or a Skip when nothing answers. */
async function redisProbe(): Promise<ReturnType<typeof createClient>> {
  const client = createClient({
    url: TEST_REDIS_URL,
    socket: { connectTimeout: 1_000, reconnectStrategy: false },
  });
  client.on("error", () => {
    // Reported through the Skip below; an unhandled 'error' would throw.
  });
  try {
    await client.connect();
    await client.ping();
    return client;
  } catch {
    try {
      await client.disconnect();
    } catch {
      // Never connected.
    }
    throw new Skip(
      `no Redis reachable at ${TEST_REDIS_URL.replace(/\/\/[^@]+@/, "//[redacted]@")}`,
    );
  }
}

/** Run `fn` with the artifact backend switched to Redis by environment alone. */
async function withRedisEnv<T>(fn: () => Promise<T>): Promise<T> {
  const saved = {
    STORAGE_TYPE: process.env.STORAGE_TYPE,
    REDIS_URL: process.env.REDIS_URL,
  };
  process.env.STORAGE_TYPE = "redis";
  process.env.REDIS_URL = TEST_REDIS_URL;
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

await runSuite(async () => {
  section("The store is created on demand (no mcp.outputLimits required)");

  await test("a bare instance has no retrieve_context until something banks", async () => {
    const host = new NeuroLink();
    assertEqual(
      (await toolNames(host)).includes("retrieve_context"),
      false,
      "nothing should register a read-back tool before there is anything to read",
    );
    await host.bankArtifact("hello", { kind: "other", label: "smoke" });
    assertEqual(
      (await toolNames(host)).includes("retrieve_context"),
      true,
      "banking must make the payload reachable by the MODEL, not just the host",
    );
  });

  await test("getArtifactStore is idempotent and returns one store", async () => {
    const host = new NeuroLink();
    const first = host.getArtifactStore();
    const second = host.getArtifactStore();
    assertEqual(first, second, "a second call must not swap the backing store");
  });

  await test("banking reuses the store an externalize config already made", async () => {
    const host = new NeuroLink({
      mcp: { outputLimits: { strategy: "externalize" } },
    });
    assertEqual(
      (await toolNames(host)).includes("retrieve_context"),
      true,
      "the configured path registers retrieve_context at construction",
    );
    const ref = await host.bankArtifact("configured", {
      kind: "stage-output",
      label: "warmup",
    });
    assertEqual(await host.readArtifact(ref.artifactId), "configured");
  });

  section("Previews are bounded — the payload never is");

  await test("1 MB banks whole, previews at the 1000-char default", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(MB_CHARS, "MARKER-DEFAULT");
    const ref: BankedArtifactRef = await host.bankArtifact(payload, {
      kind: "worker-report",
      label: "delegate:auth-review",
    });

    assertEqual(ref.sizeBytes, Buffer.byteLength(payload, "utf-8"));
    assertEqual(ref.kind, "worker-report");
    assertEqual(ref.label, "delegate:auth-review");
    assertEqual(
      ref.preview.length,
      1001,
      "1000 characters plus the elision mark",
    );
    assertEqual(
      ref.preview.slice(0, 1000),
      payload.slice(0, 1000),
      "the preview is a head slice, not a summary",
    );
    assertIncludes(ref.readBackHint, "retrieve_context");
    assertIncludes(ref.readBackHint, ref.artifactId);

    const back = await host.readArtifact(ref.artifactId);
    assert(back !== null, "the banked artifact must be readable");
    assertEqual(
      digest(back ?? ""),
      digest(payload),
      "the stored payload must be byte-identical to what was banked",
    );
  });

  await test("previewChars is honoured and capped at 4000", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(20_000, "MARKER-CAP");
    const tiny = await host.bankArtifact(payload, {
      kind: "other",
      label: "tiny-preview",
      previewChars: 50,
    });
    assertEqual(tiny.preview.length, 51);

    const greedy = await host.bankArtifact(payload, {
      kind: "other",
      label: "greedy-preview",
      previewChars: 999_999,
    });
    assertEqual(
      greedy.preview.length,
      4001,
      "a preview past the cap would recreate the context pressure banking removes",
    );
    assertEqual(
      digest((await host.readArtifact(greedy.artifactId)) ?? ""),
      digest(payload),
      "a small preview must not mean a small file",
    );
  });

  await test("a payload shorter than the budget previews whole, unmarked", async () => {
    const host = new NeuroLink();
    const ref = await host.bankArtifact("short report", {
      kind: "stage-output",
      label: "collate",
    });
    assertEqual(ref.preview, "short report");
    assertEqual(ref.preview.endsWith("…"), false);
  });

  await test("sizeBytes counts UTF-8 bytes, not characters", async () => {
    const host = new NeuroLink();
    const payload = "héllo — 世界";
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "utf8",
    });
    assertEqual(ref.sizeBytes, Buffer.byteLength(payload, "utf-8"));
    assert(
      ref.sizeBytes > payload.length,
      "multi-byte characters must not be counted as one byte each",
    );
    assertEqual(await host.readArtifact(ref.artifactId), payload);
  });

  await test("a blank label falls back to the kind rather than banking nameless", async () => {
    const host = new NeuroLink();
    const ref = await host.bankArtifact("x", {
      kind: "command-output",
      label: "   ",
    });
    assertEqual(ref.label, "command-output");
  });

  section("Read-back is the existing retrieve_context tool");

  await test("1 MB pages back byte-exact through retrieve_context", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(MB_CHARS, "MARKER-PAGED");
    const ref = await host.bankArtifact(payload, {
      kind: "worker-report",
      label: "delegate:paging",
    });

    const walked = await pageBackThroughTool(host, ref.artifactId, 100_000);
    assertEqual(walked.totalSize, payload.length, "totalSize is the full size");
    assertEqual(walked.pages, 11, "1 MB in 100k windows is 11 pages");
    assertEqual(
      digest(walked.content),
      digest(payload),
      "the reassembled pages must equal the banked payload exactly",
    );
    assert(
      walked.content.includes("MARKER-PAGED"),
      "content past the preview must survive the round trip",
    );
  });

  await test("offset and limit address the payload precisely", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(5_000, "MARKER-SLICE");
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "slice",
    });
    const page = asPage(await readPage(host, ref.artifactId, 1_000, 250));
    assertEqual(page.offset, 1_000);
    assertEqual(page.content, payload.slice(1_000, 1_250));
    assertEqual(page.totalSize, payload.length);
    assertEqual(page.hasMore, true);

    const tail = asPage(await readPage(host, ref.artifactId, 4_900, 500));
    assertEqual(tail.content, payload.slice(4_900));
    assertEqual(tail.hasMore, false);
  });

  await test("json payloads round trip as json", async () => {
    const host = new NeuroLink();
    const payload = JSON.stringify({
      findings: Array.from({ length: 500 }, (_, i) => ({
        id: `f${i}`,
        severity: "low",
      })),
    });
    const ref = await host.bankArtifact(payload, {
      kind: "stage-output",
      label: "findings",
      contentType: "json",
    });
    const page = asPage(
      await readPage(host, ref.artifactId, 0, payload.length),
    );
    assertEqual(page.content, payload);
    assertEqual(
      JSON.parse(page.content ?? "").findings.length,
      500,
      "the round trip must survive JSON.parse",
    );
  });

  await test("host readArtifact windows the same way the tool does", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(3_000, "MARKER-HOST");
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "host-read",
    });
    assertEqual(await host.readArtifact(ref.artifactId), payload);
    assertEqual(
      await host.readArtifact(ref.artifactId, { offset: 100, limit: 40 }),
      payload.slice(100, 140),
    );
    assertEqual(
      await host.readArtifact(ref.artifactId, { offset: 2_900 }),
      payload.slice(2_900),
      "an omitted limit means the rest, not a hidden cap",
    );
  });

  section("Missing and hostile ids");

  await test("an unknown id reads as null and refuses through the tool", async () => {
    const host = new NeuroLink();
    await host.bankArtifact("anything", { kind: "other", label: "seed" });
    assertEqual(await host.readArtifact("no-such-artifact-id"), null);
    const page = asPage(await readPage(host, "no-such-artifact-id", 0, 100));
    assert(
      typeof page.error === "string",
      "the model must be told the artifact is gone, not handed empty content",
    );
    assertEqual(page.content, undefined);
  });

  await test("a session read with in-memory conversation memory names the Redis requirement", async () => {
    // Regression: retrieve_context registers whenever something banks, and a
    // truthy-but-in-memory conversation memory manager used to sail past the
    // presence guard into the Redis-only getSessionRaw() — the model got a
    // generic "Failed to retrieve context" born from a TypeError. The guard
    // is now on capability, so the answer must name the actual requirement.
    const savedStorageType = process.env.STORAGE_TYPE;
    process.env.STORAGE_TYPE = "memory";
    try {
      const host = new NeuroLink({ conversationMemory: { enabled: true } });
      await host.bankArtifact("seed", { kind: "other", label: "seed" });
      assertEqual(
        await host.ensureConversationMemoryInitialized(),
        true,
        "conversation memory must initialize with the in-memory backend",
      );
      const page = asPage(
        await host.executeTool("retrieve_context", {
          sessionId: "any-session",
        }),
      );
      assert(
        typeof page.error === "string",
        "the session path must answer with an error object, not throw",
      );
      assertIncludes(
        page.error ?? "",
        "Redis",
        "the answer must name the Redis requirement, not a generic message",
      );
    } finally {
      if (savedStorageType === undefined) {
        delete process.env.STORAGE_TYPE;
      } else {
        process.env.STORAGE_TYPE = savedStorageType;
      }
    }
  });

  await test("a traversal id never becomes a path", async () => {
    // The index-miss fallback probes join(dir, id + ext), and ids reach it
    // straight from the model. Anything with a separator or a dot has to be
    // rejected before the filesystem is touched.
    const host = new NeuroLink();
    const ref = await host.bankArtifact("seed", {
      kind: "other",
      label: "seed",
    });

    // Non-vacuous case first: this id resolves, character for character, to a
    // file that DOES exist — the seed artifact's own sidecar. Without the id
    // guard the probe would read it back; the null is the guard working, not
    // a missing file.
    assertEqual(
      await host.readArtifact(`../neurolink-artifacts/${ref.artifactId}`),
      null,
      "a separator in an id must be refused even when the path it builds exists",
    );

    for (const hostile of [
      "../../../../etc/passwd",
      "..",
      "sub/dir",
      "id.with.dots",
      "",
    ]) {
      assertEqual(
        await host.readArtifact(hostile),
        null,
        "an unsafe id must resolve to nothing",
      );
    }

    // The real id still works — the guard rejects shapes, not everything.
    assertEqual(await host.readArtifact(ref.artifactId), "seed");
  });

  section("The backend is chosen like conversation memory");

  await test("an injected store is the one every path uses", async () => {
    const store = new RecordingStore();
    const host = new NeuroLink({ artifacts: { store } });
    assertEqual(
      host.getArtifactStore(),
      store,
      "artifacts.store must be the store itself, not a wrapper",
    );
    const payload = payloadOf(20_000, "MARKER-INJECTED");
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "injected",
    });
    assertEqual(
      store.payloads.has(ref.artifactId),
      true,
      "banking must write to the injected store",
    );
    assertEqual(await host.readArtifact(ref.artifactId), payload);
    const page = asPage(await readPage(host, ref.artifactId, 10, 20));
    assertEqual(page.content, payload.slice(10, 30));
    assertEqual(page.totalSize, payload.length);
    assertEqual(
      (await toolNames(host)).includes("retrieve_context"),
      true,
      "an injected store must still register the read-back tool",
    );
  });

  await test("setArtifactStore swaps every path and leaves a caller's store open", async () => {
    const first = new RecordingStore();
    const second = new RecordingStore();
    const host = new NeuroLink({ artifacts: { store: first } });
    const before = await host.bankArtifact("first", {
      kind: "other",
      label: "before",
    });
    host.setArtifactStore(second);
    assertEqual(host.getArtifactStore(), second);
    assertEqual(
      first.closed,
      false,
      "a store the caller handed in is theirs to close",
    );
    const after = await host.bankArtifact("second", {
      kind: "other",
      label: "after",
    });
    assertEqual(
      second.payloads.has(after.artifactId),
      true,
      "banking must follow the swap",
    );
    assertEqual(await host.readArtifact(after.artifactId), "second");
    assertEqual(
      await host.readArtifact(before.artifactId),
      null,
      "the previous store's ids stop resolving — replace does not migrate",
    );
    host.setArtifactStore(second);
    assertEqual(
      host.getArtifactStore(),
      second,
      "setting the same store twice is a no-op",
    );
  });

  await test("an injected store is the caller's to close — neither shutdown nor replacement closes it", async () => {
    const store = new RecordingStore();
    const host = new NeuroLink({ artifacts: { store } });
    await host.bankArtifact("x", { kind: "other", label: "close" });
    await host.shutdown();
    assertEqual(
      store.closed,
      false,
      "NeuroLink must not close a store it did not build",
    );
    const viaSetter = new RecordingStore();
    const other = new NeuroLink();
    other.setArtifactStore(viaSetter);
    other.setArtifactStore(new RecordingStore());
    assertEqual(
      viaSetter.closed,
      false,
      "a setter-injected store must survive being replaced, exactly like a constructor-injected one",
    );
  });

  await test("setArtifactStore also re-points the MCP output normalizer", async () => {
    // The normalizer captured its store at construction. The bug this guards:
    // assigning the private field swapped banking and read-back but not the
    // normalizer, so externalized MCP outputs kept landing in local /tmp while
    // retrieve_context looked in the new backend and answered "not found".
    const host = new NeuroLink({
      mcp: {
        outputLimits: {
          strategy: "externalize",
          maxBytes: 2_048,
          warnBytes: 1_024,
        },
      },
    });
    const store = new RangeRecordingStore();
    host.setArtifactStore(store);

    const manager = host.getExternalServerManager();
    const serverId = "artifact-fixture";
    const config: MCPServerInfo = {
      id: serverId,
      name: serverId,
      description: "artifact store fixture",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: process.execPath,
      args: [MCP_FIXTURE],
    };
    await manager.addServer(serverId, config);
    try {
      const marker = "MARKER-NORMALIZER";
      const result = await manager.executeTool(serverId, "big_output", {
        chars: 10_000,
        marker,
      });
      const id = /neurolinkArtifactId=([A-Za-z0-9_-]+)/.exec(
        textOf(result),
      )?.[1];
      assert(
        id !== undefined,
        "an output above maxBytes must come back as an externalized surrogate",
      );
      assertEqual(
        store.payloads.has(id ?? ""),
        true,
        "the surrogate's id must resolve in the SWAPPED store",
      );
      const hit = asSearch(await searchArtifact(host, id ?? "", marker));
      assertEqual(
        hit.matchCount,
        1,
        "the model must find the marker through retrieve_context",
      );
      const page = asPage(
        await readPage(
          host,
          id ?? "",
          hit.matches?.[0]?.offset ?? -1,
          marker.length,
        ),
      );
      assertEqual(page.content, marker);
    } finally {
      await manager.shutdown();
    }
  });

  await test("a paged read asks a range-capable backend for a window, never the payload", async () => {
    const store = new RangeRecordingStore();
    const host = new NeuroLink({ artifacts: { store } });
    // The ticket's artifact: 268,002 bytes, paged at the 50k default.
    const payload = payloadOf(268_002, "MARKER-RANGE");
    const ref = await host.bankArtifact(payload, {
      kind: "command-output",
      label: "range",
    });
    const walked = await pageBackThroughTool(host, ref.artifactId, 50_000);
    assertEqual(
      digest(walked.content),
      digest(payload),
      "the walk must reproduce the payload byte for byte",
    );
    assertEqual(walked.pages, 6);
    assertEqual(walked.totalSize, payload.length);
    assertEqual(
      store.fullReads.length,
      0,
      "no page may fetch the whole payload from a backend that can window",
    );
    assertEqual(store.rangeReads.length, 6, "one window per page");
    assertEqual(store.rangeReads[0]?.offset, 0);
    assertEqual(store.rangeReads[0]?.limit, 50_000);
    assertEqual(store.rangeReads[5]?.offset, 250_000);
    // The host reads windows the same way; omitting the window asks for the artifact.
    assertEqual(
      await host.readArtifact(ref.artifactId, { offset: 5, limit: 5 }),
      payload.slice(5, 10),
    );
    assertEqual(store.rangeReads.at(-1)?.offset, 5);
    assertEqual(await host.readArtifact(ref.artifactId), payload);
    assertEqual(
      store.fullReads.length,
      1,
      "a read without a window is a whole read",
    );
  });

  await test("a backend without range reads pages exactly as before", async () => {
    const store = new RecordingStore();
    const host = new NeuroLink({ artifacts: { store } });
    const payload = payloadOf(120_000, "MARKER-PLAIN");
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "plain",
    });
    const walked = await pageBackThroughTool(host, ref.artifactId, 50_000);
    assertEqual(digest(walked.content), digest(payload));
    assertEqual(walked.pages, 3);
    assertEqual(
      store.fullReads.length,
      3,
      "without retrieveRange every page is a whole read plus a slice",
    );
  });

  section("Redis backend (skips when no Redis answers)");

  await test("STORAGE_TYPE=redis moves artifacts to Redis with a TTL and no local file", async () => {
    const probe = await redisProbe();
    try {
      await withRedisEnv(async () => {
        const host = new NeuroLink();
        const payload = payloadOf(268_002, "MARKER-REDIS");
        const ref = await host.bankArtifact(payload, {
          kind: "worker-report",
          label: "redis",
        });
        const key = `${ARTIFACT_KEY_PREFIX}${ref.artifactId}`;
        const stored = await probe.get(key);
        assertEqual(
          stored === null ? "(missing)" : digest(String(stored)),
          digest(payload),
          "the payload must be in Redis under the artifact prefix",
        );
        const ttl = await probe.ttl(key);
        assert(ttl > 0 && ttl <= 86_400, "the payload must expire by TTL");
        assert(
          (await probe.ttl(`${key}:meta`)) > 0,
          "the record must expire with it",
        );
        assertEqual(
          existsSync(
            join(tmpdir(), "neurolink-artifacts", `${ref.artifactId}.txt`),
          ),
          false,
          "nothing may be written to local temp",
        );
        const walked = await pageBackThroughTool(host, ref.artifactId, 50_000);
        assertEqual(digest(walked.content), digest(payload));
        assertEqual(walked.pages, 6);
        // Another instance: a fresh index, as another replica would have.
        const replica = new NeuroLink();
        assertEqual(
          await replica.readArtifact(ref.artifactId, {
            offset: 200_000,
            limit: 17,
          }),
          payload.slice(200_000, 200_017),
        );
        await host.getArtifactStore().delete(ref.artifactId);
        assertEqual(
          await probe.exists([key, `${key}:meta`]),
          0,
          "delete must remove both keys",
        );
        await replica.getArtifactStore().close?.();
        await host.getArtifactStore().close?.();
      });
    } finally {
      await probe.quit();
    }
  });

  await test("shutdown releases the pooled connection of a store NeuroLink built", async () => {
    const probe = await redisProbe();
    await withRedisEnv(async () => {
      const openBefore = getPoolStats().filter((entry) => entry.isOpen).length;
      const host = new NeuroLink();
      const ref = await host.bankArtifact("owned", {
        kind: "other",
        label: "owned",
      });
      try {
        assertEqual(
          getPoolStats().filter((entry) => entry.isOpen).length,
          openBefore + 1,
          "banking through Redis must hold one pooled connection",
        );
        await host.shutdown();
        assertEqual(
          getPoolStats().filter((entry) => entry.isOpen).length,
          openBefore,
          "shutdown must release the connection of a store the instance built",
        );

        // dispose() is the other teardown path and must release the same way,
        // or every construct / use / dispose cycle leaks a pooled reference.
        const disposed = new NeuroLink();
        await disposed.bankArtifact("disposed", { kind: "other", label: "d" });
        assertEqual(
          getPoolStats().filter((entry) => entry.isOpen).length,
          openBefore + 1,
        );
        await disposed.dispose();
        assertEqual(
          getPoolStats().filter((entry) => entry.isOpen).length,
          openBefore,
          "dispose must release the connection of a store the instance built",
        );

        // close() while the connect is still in flight: the reference it is
        // about to acquire must still be released, or it leaks for the life of
        // the process.
        const racer = new NeuroLink();
        const store = racer.getArtifactStore();
        // The read itself is expected to fail — the connection it was waiting
        // for is released underneath it; what must not happen is a leak.
        const inFlight = store
          .retrieve("00000000-0000-0000-0000-000000000000")
          .catch(() => null);
        await store.close?.();
        await inFlight;
        assertEqual(
          getPoolStats().filter((entry) => entry.isOpen).length,
          openBefore,
          "close() during an in-flight connect must release the reference it acquires",
        );
      } finally {
        await probe.del([
          `${ARTIFACT_KEY_PREFIX}${ref.artifactId}`,
          `${ARTIFACT_KEY_PREFIX}${ref.artifactId}:meta`,
        ]);
        await probe.quit();
      }
    });
  });

  await test("a second node process reads a Redis artifact it never stored", async () => {
    const probe = await redisProbe();
    await probe.quit();
    await withRedisEnv(async () => {
      const host = new NeuroLink();
      const marker = "MARKER-REDIS-CROSS";
      const payload = payloadOf(64_000, marker);
      const ref = await host.bankArtifact(payload, {
        kind: "command-output",
        label: "redis-cross",
      });
      try {
        // A genuinely separate process with the same STORAGE_TYPE: it holds no
        // index and no file, so the read can only succeed through Redis.
        const script = [
          "const { NeuroLink } = await import(" +
            JSON.stringify(DIST_ENTRY) +
            ");",
          "const content = await new NeuroLink().readArtifact(process.argv[2], { offset: 48000, limit: 18 });",
          'console.log("RESULT:" + (content === null ? "null" : content));',
          "process.exit(0);",
        ].join("\n");
        const scriptPath = join(tempDir("neurolink-bank-redis-"), "reader.mjs");
        writeFileSync(scriptPath, script, "utf-8");
        const result = await runCommand("node", [scriptPath, ref.artifactId], {
          cwd: REPO_ROOT,
          timeoutMs: 120_000,
          env: {
            ...process.env,
            STORAGE_TYPE: "redis",
            REDIS_URL: TEST_REDIS_URL,
          },
        });
        const reported = /RESULT:(\S+)/.exec(result.stdout)?.[1];
        assert(
          reported !== undefined,
          `the child process printed no result (exit ${result.exitCode})`,
        );
        assertEqual(
          reported,
          marker,
          "a replica that never stored the id must read the same window",
        );
      } finally {
        await host.getArtifactStore().delete(ref.artifactId);
        await host.getArtifactStore().close?.();
      }
    });
  });

  await test("non-ASCII payloads page correctly through Redis (the whole-read fallback)", async () => {
    const probe = await redisProbe();
    await probe.quit();
    await withRedisEnv(async () => {
      const host = new NeuroLink();
      const payload = "héllo wörld ✓ ".repeat(9_000).slice(0, 100_000);
      assert(
        Buffer.byteLength(payload, "utf-8") !== payload.length,
        "the fixture must not be ASCII, or the fallback is not exercised",
      );
      const ref = await host.bankArtifact(payload, {
        kind: "other",
        label: "utf8",
      });
      try {
        const walked = await pageBackThroughTool(host, ref.artifactId, 30_000);
        assertEqual(
          digest(walked.content),
          digest(payload),
          "character offsets must stay exact when bytes and characters differ",
        );
        assertEqual(
          await host.readArtifact(ref.artifactId, { offset: 7, limit: 9 }),
          payload.slice(7, 16),
        );
      } finally {
        await host.getArtifactStore().delete(ref.artifactId);
        await host.getArtifactStore().close?.();
      }
    });
  });

  await test("artifacts.storage 'redis' with its own redisConfig ignores the environment", async () => {
    const probe = await redisProbe();
    const savedStorageType = process.env.STORAGE_TYPE;
    delete process.env.STORAGE_TYPE;
    try {
      const host = new NeuroLink({
        artifacts: {
          storage: "redis",
          redisConfig: {
            url: TEST_REDIS_URL,
            keyPrefix: "nl-test:artifact:",
            ttl: 60,
          },
        },
      });
      const ref = await host.bankArtifact("configured", {
        kind: "stage-output",
        label: "cfg",
      });
      const key = `nl-test:artifact:${ref.artifactId}`;
      try {
        assertEqual(
          String(await probe.get(key)),
          "configured",
          "the payload must land under the configured prefix",
        );
        const ttl = await probe.ttl(key);
        assert(ttl > 0 && ttl <= 60, "the configured ttl must apply");
        assertEqual(await host.readArtifact(ref.artifactId), "configured");
      } finally {
        await host.getArtifactStore().delete(ref.artifactId);
        await host.getArtifactStore().close?.();
      }
    } finally {
      if (savedStorageType !== undefined) {
        process.env.STORAGE_TYPE = savedStorageType;
      }
      await probe.quit();
    }
  });

  section("Search on an artifact");

  await test("search returns the offset of a marker buried past every preview", async () => {
    const host = new NeuroLink();
    const marker = "NEEDLE-7731-HAYSTACK";
    const payload = payloadOf(200_000, marker);
    const ref = await host.bankArtifact(payload, {
      kind: "command-output",
      label: "search",
    });
    const result = asSearch(
      await searchArtifact(host, ref.artifactId, "needle-7731"),
    );
    assert(!result.error, "a valid search must not error");
    assertEqual(result.matchCount, 1);
    assertEqual(result.totalMatches, 1);
    assertEqual(result.truncated, false);
    assertEqual(result.totalSize, payload.length);
    const hit = result.matches?.[0];
    assert(hit !== undefined, "one match must be returned");
    assertEqual(
      hit?.offset,
      payload.indexOf(marker),
      "the offset must be the character offset of the hit",
    );
    assert(
      (hit?.snippet ?? "").includes(marker),
      "the snippet must show the hit",
    );
    assert((hit?.snippet.length ?? 0) <= 300, "a snippet is bounded");
    assert(
      (hit?.snippetOffset ?? 0) <= (hit?.offset ?? 0),
      "the snippet starts at or before the hit",
    );
    // The jump: one targeted read lands on the marker instead of six pages.
    const page = asPage(
      await readPage(host, ref.artifactId, hit?.offset ?? -1, marker.length),
    );
    assertEqual(page.content, marker);
  });

  await test("a compact JSON artifact yields bounded snippets, not the whole line", async () => {
    const host = new NeuroLink();
    const object: Record<string, string> = {};
    for (let i = 0; i < 3_000; i += 1) {
      object[`key${i}`] = `value-${i}-${"x".repeat(20)}`;
    }
    const payload = JSON.stringify(object);
    assertEqual(
      payload.includes("\n"),
      false,
      "the fixture must be one line, like an MCP artifact",
    );
    assert(
      payload.length > 50_000,
      "the fixture must be big enough that the whole line would matter",
    );
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "json",
      contentType: "json",
    });
    const result = asSearch(
      await searchArtifact(host, ref.artifactId, '"key2500"'),
    );
    assertEqual(result.matchCount, 1);
    const hit = result.matches?.[0];
    assertEqual(hit?.line, 1);
    assert(
      (hit?.snippet.length ?? 0) < 400,
      "the snippet must be a window around the hit, not the whole line",
    );
    assert(
      (hit?.snippet ?? "").includes("value-2500-"),
      "the snippet must show the hit and its context",
    );
  });

  await test("search pages past 50 matches with nextSearchOffset", async () => {
    const host = new NeuroLink();
    const payload = Array.from(
      { length: 120 },
      (_, i) => `line ${i} hit-${i}`,
    ).join("\n");
    const ref = await host.bankArtifact(payload, {
      kind: "other",
      label: "many",
    });
    const first = asSearch(await searchArtifact(host, ref.artifactId, "hit-"));
    assertEqual(first.matchCount, 50);
    assertEqual(first.totalMatches, 120);
    assertEqual(first.truncated, true);
    assertEqual(first.matches?.[49]?.line, 50);
    assertEqual(
      first.nextSearchOffset,
      payload.indexOf("hit-50"),
      "nextSearchOffset must be the 51st hit",
    );
    const second = asSearch(
      await searchArtifact(
        host,
        ref.artifactId,
        "hit-",
        first.nextSearchOffset,
      ),
    );
    assertEqual(second.matchCount, 50);
    assertEqual(second.totalMatches, 70);
    assertEqual(second.matches?.[0]?.line, 51);
    const third = asSearch(
      await searchArtifact(
        host,
        ref.artifactId,
        "hit-",
        second.nextSearchOffset,
      ),
    );
    assertEqual(third.matchCount, 20);
    assertEqual(third.truncated, false);
    assertEqual(third.nextSearchOffset, undefined);
  });

  await test("search never silently ignores itself", async () => {
    const host = new NeuroLink();
    const ref = await host.bankArtifact(payloadOf(5_000, "MARKER-X"), {
      kind: "other",
      label: "edge",
    });
    const empty = asSearch(await searchArtifact(host, ref.artifactId, ""));
    assert(!!empty.error, "an empty pattern must be an explicit error");
    const long = asSearch(
      await searchArtifact(host, ref.artifactId, "x".repeat(201)),
    );
    assert(!!long.error, "an over-long pattern must be an explicit error");
    const unknown = asSearch(
      await searchArtifact(host, "no-such-artifact", "MARKER"),
    );
    assert(!!unknown.error, "an unknown id must be an explicit error");
    const none = asSearch(
      await searchArtifact(host, ref.artifactId, "not-in-there"),
    );
    assert(
      !none.error && none.matchCount === 0 && none.totalMatches === 0,
      "no match is a result, not an error",
    );
    // Metacharacters are literal: ".*" matches nothing unless the text has ".*".
    const literal = asSearch(await searchArtifact(host, ref.artifactId, ".*"));
    assertEqual(
      literal.totalMatches,
      0,
      "the pattern must be matched literally",
    );
    const folded = asSearch(
      await searchArtifact(host, ref.artifactId, "marker-x"),
    );
    assertEqual(folded.totalMatches, 1, "matching must be case-insensitive");
  });

  section("Cross-process retrieval via the sidecar (N3.3)");

  await test("a second node process reads an artifact it never stored", async () => {
    const host = new NeuroLink();
    const payload = payloadOf(64_000, "MARKER-CROSS-PROCESS");
    const ref = await host.bankArtifact(payload, {
      kind: "command-output",
      label: "cross-process",
    });

    // A genuinely separate process: its LocalTempArtifactStore starts with an
    // empty in-memory index, so the read can only succeed through the sidecar.
    const script = [
      "import { NeuroLink } from " + JSON.stringify(DIST_ENTRY) + ";",
      "const content = await new NeuroLink().readArtifact(process.argv[2]);",
      'console.log("RESULT:" + (content === null ? "null" : content.length));',
      "process.exit(0);",
    ].join("\n");
    const scriptPath = join(tempDir("neurolink-bank-"), "reader.mjs");
    writeFileSync(scriptPath, script, "utf-8");

    const result = await runCommand("node", [scriptPath, ref.artifactId], {
      cwd: REPO_ROOT,
      timeoutMs: 120_000,
    });
    const reported = /RESULT:(\S+)/.exec(result.stdout)?.[1];
    assert(
      reported !== undefined,
      `the child process printed no result (exit ${result.exitCode})`,
    );
    assertEqual(
      reported,
      String(payload.length),
      "a process that never called store() must still resolve the id",
    );
  });

  section("Live model read-back");

  await test("the model pulls content it was never shown", async () => {
    if (!opts.provider) {
      throw new Skip("no provider configured");
    }
    const host = new NeuroLink();
    const secret = "ZEBRA-4417-QUARTZ";
    const payload = payloadOf(6_000, secret);
    const ref = await host.bankArtifact(payload, {
      kind: "worker-report",
      label: "delegate:live",
      previewChars: 120,
    });
    assertEqual(
      ref.preview.includes(secret),
      false,
      "the preview must not contain the marker, or the test proves nothing",
    );

    let content: string;
    try {
      const result = await host.generate({
        input: {
          text:
            "A worker report was banked as an artifact. Preview:\n" +
            ref.preview +
            "\n\nRead the FULL report with " +
            ref.readBackHint +
            "\nIt contains one token of the form WORD-DIGITS-WORD. " +
            "Reply with that token and nothing else.",
        },
        provider: opts.provider,
        ...(opts.model ? { model: opts.model } : {}),
        maxSteps: 8,
        timeout: 120_000,
      });
      content = result.content;
    } catch (error) {
      throw new Skip(
        `provider "${opts.provider}" unavailable: ${
          error instanceof Error ? error.message.slice(0, 160) : String(error)
        }`,
      );
    }
    assert(
      content.includes(secret),
      "the model must have paged the banked file — the marker was not in its context otherwise",
    );
  });
});
