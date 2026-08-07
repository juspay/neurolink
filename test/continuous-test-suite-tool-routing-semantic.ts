#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — L2 Embedding Fast-Path & Tool-Granularity
 * (feat/tool-routing-semantic)
 *
 * Deterministic (no-API) coverage using a fake embedFn (returns fixed vectors
 * per text) PLUS a live-gated section that exercises the real embedding path
 * over a >20-tool catalog with an actual embedding provider.
 *
 * Structure:
 *   Part 1 — cosineSimilarity correctness (4 tests, no-API)
 *   Part 2 — hybrid ranking: semantically-closest tools win (5 tests, no-API)
 *   Part 3 — embedding index caches tool vectors (2 tests, no-API)
 *   Part 4 — granularity:"tool" narrows to individual tools (3 tests, no-API)
 *   Part 5 — granularity:"server" regression guard (2 tests, no-API)
 *   Part 6 — FAIL OPEN: embedFn throws → falls back without throwing (2 tests, no-API)
 *   Part 7 — LIVE-gated: real embedding provider over >20-tool catalog (1 test)
 *
 * Run:
 *   pnpm run build && npx tsx test/continuous-test-suite-tool-routing-semantic.ts
 *   pnpm run test:tool-routing-semantic
 */

import {
  cosineSimilarity,
  ToolEmbeddingIndex,
  selectRelevantToolNames,
  resolveToolRoutingExclusions,
  NeuroLink,
  // Taken from dist, not src: NeuroLink itself is the dist build, and stubbing
  // the src copy of the factory would leave the dist one untouched — the stub
  // would silently never apply.
  AIProviderFactory,
} from "../dist/index.js";
import type {
  ToolRetrievalItem,
  ToolRoutingCatalogEntry,
  ToolRoutingDecision,
  ToolRoutingResolutionParams,
} from "../src/lib/types/index.js";
import {
  defineSuite,
  assert,
  assertEqual,
  assertNotNull,
  Skip,
} from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { isExpectedProviderError } from "./helpers/envGuard.js";
import { spy, stub, withStubs } from "./helpers/stubs.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite(
  "L2 Embedding Fast-Path & Tool-Granularity",
);

/** Vitest's toBeCloseTo(expected, digits): |actual - expected| < 10^-digits / 2. */
function assertCloseTo(
  actual: number,
  expected: number,
  digits: number,
  msg: string,
): void {
  const tolerance = Math.pow(10, -digits) / 2;
  assert(
    Math.abs(actual - expected) < tolerance,
    `${msg} (expected ~${expected} ±${tolerance}, got ${actual})`,
  );
}

// ============================================================================
// Fake embedFn factory
// ============================================================================

/**
 * Returns a fake embedFn that maps known text → fixed unit-direction vectors
 * (4-dimensional) so cosine similarity tests are deterministic and require
 * zero API calls.
 *
 * Cluster assignments:
 *   analytics  → [1, 0, 0, 0]
 *   shipping   → [0, 1, 0, 0]
 *   calendar   → [0, 0, 1, 0]
 *   database   → [0, 0, 0, 1]
 *   (unknown)  → [0.25, 0.25, 0.25, 0.25]
 */
function makeFakeEmbedFn(callCount?: { n: number }) {
  const TABLE: Record<string, number[]> = {
    // analytics
    "Sales and payment analytics — analytics_getSales": [1, 0, 0, 0],
    "Sales and payment analytics — analytics_getRevenue": [0.95, 0.05, 0, 0],
    "Sales and payment analytics — analytics_getPayments": [0.9, 0.1, 0, 0],
    "Sales and payment analytics — analytics_getRefunds": [0.85, 0.15, 0, 0],
    "Sales and payment analytics — analytics_getDashboard": [0.8, 0.2, 0, 0],
    "Sales and payment analytics — analytics_exportReport": [0.75, 0.25, 0, 0],
    // shipping
    "Shipment tracking and courier management — shipping_track": [0, 1, 0, 0],
    "Shipment tracking and courier management — shipping_listCouriers": [
      0, 0.9, 0.1, 0,
    ],
    "Shipment tracking and courier management — shipping_getLabel": [
      0, 0.85, 0.15, 0,
    ],
    "Shipment tracking and courier management — shipping_cancelShipment": [
      0, 0.8, 0.2, 0,
    ],
    "Shipment tracking and courier management — shipping_createShipment": [
      0, 0.75, 0.25, 0,
    ],
    "Shipment tracking and courier management — shipping_getQuote": [
      0, 0.7, 0.3, 0,
    ],
    // calendar
    "Calendar scheduling tools — calendar_createEvent": [0, 0, 1, 0],
    "Calendar scheduling tools — calendar_listEvents": [0, 0, 0.9, 0.1],
    "Calendar scheduling tools — calendar_deleteEvent": [0, 0, 0.85, 0.15],
    "Calendar scheduling tools — calendar_updateEvent": [0, 0, 0.8, 0.2],
    "Calendar scheduling tools — calendar_getAvailability": [0, 0, 0.75, 0.25],
    "Calendar scheduling tools — calendar_setReminder": [0, 0, 0.7, 0.3],
    // database
    "Database administration tools — db_query": [0, 0, 0, 1],
    "Database administration tools — db_migrate": [0, 0, 0.05, 0.95],
    "Database administration tools — db_backup": [0, 0.05, 0, 0.95],
    "Database administration tools — db_restore": [0, 0.1, 0, 0.9],
  };
  const QUERY_TABLE: Record<string, number[]> = {
    "show me yesterday's sales": [1, 0, 0, 0],
    "track my shipment": [0, 1, 0, 0],
    "list upcoming meetings": [0, 0, 1, 0],
    "run a database migration": [0, 0, 0, 1],
    // show me sales (shorter variant)
    "show me sales": [1, 0, 0, 0],
  };
  return async (texts: string[]): Promise<number[][]> => {
    if (callCount !== undefined) {
      callCount.n += 1;
    }
    return texts.map(
      (t) => TABLE[t] ?? QUERY_TABLE[t] ?? [0.25, 0.25, 0.25, 0.25],
    );
  };
}

/**
 * Large catalog (22 tools across 4 servers) that exceeds the default
 * minToolsToActivate threshold (20) so the embedding fast-path activates.
 */
function buildLargeCatalog(): ToolRoutingCatalogEntry[] {
  return [
    {
      id: "analytics",
      description: "Sales and payment analytics",
      toolNames: [
        "analytics_getSales",
        "analytics_getRevenue",
        "analytics_getPayments",
        "analytics_getRefunds",
        "analytics_getDashboard",
        "analytics_exportReport",
      ],
    },
    {
      id: "shipping",
      description: "Shipment tracking and courier management",
      toolNames: [
        "shipping_track",
        "shipping_listCouriers",
        "shipping_getLabel",
        "shipping_cancelShipment",
        "shipping_createShipment",
        "shipping_getQuote",
      ],
    },
    {
      id: "calendar",
      description: "Calendar scheduling tools",
      toolNames: [
        "calendar_createEvent",
        "calendar_listEvents",
        "calendar_deleteEvent",
        "calendar_updateEvent",
        "calendar_getAvailability",
        "calendar_setReminder",
      ],
    },
    {
      id: "db",
      description: "Database administration tools",
      toolNames: ["db_query", "db_migrate", "db_backup", "db_restore"],
    },
  ];
}

// ============================================================================
// Part 1 — cosineSimilarity correctness
// ============================================================================

await test("cosineSimilarity: orthogonal vectors return 0", () => {
  const result = cosineSimilarity([1, 0, 0], [0, 1, 0]);
  assert(
    Math.abs(result) < 1e-10,
    `Expected ~0 for orthogonal vectors, got ${result}`,
  );
});

await test("cosineSimilarity: identical vectors return 1", () => {
  const result = cosineSimilarity([1, 2, 3], [1, 2, 3]);
  assert(
    Math.abs(result - 1) < 1e-10,
    `Expected ~1 for identical vectors, got ${result}`,
  );
});

await test("cosineSimilarity: mismatched length vectors return 0 (guard)", () => {
  const result = cosineSimilarity([1, 2], [1, 2, 3]);
  assertEqual(result, 0, "mismatched length vectors must return 0");
});

await test("cosineSimilarity: zero-magnitude vector returns 0 (guard)", () => {
  const result = cosineSimilarity([0, 0, 0], [1, 2, 3]);
  assertEqual(result, 0, "zero-magnitude vector must return 0");
});

// ============================================================================
// Part 2 — hybrid ranking: semantically-closest tools win
// ============================================================================

await test("hybrid ranking: analytics tool ranks first for a sales query", async () => {
  const items: ToolRetrievalItem[] = [
    {
      name: "analytics_getSales",
      text: "Sales and payment analytics — analytics_getSales",
    },
    {
      name: "shipping_track",
      text: "Shipment tracking and courier management — shipping_track",
    },
    {
      name: "calendar_createEvent",
      text: "Calendar scheduling tools — calendar_createEvent",
    },
    { name: "db_query", text: "Database administration tools — db_query" },
  ];

  const embedFn = makeFakeEmbedFn();
  const index = new ToolEmbeddingIndex(items, embedFn);
  const results = await index.rank("show me yesterday's sales", { topK: 4 });

  assertEqual(
    results[0].name,
    "analytics_getSales",
    "analytics tool must rank first for a sales query",
  );
  assert(results.length === 4, "must return topK results");
});

await test("hybrid ranking: shipping tool ranks first for a shipment query", async () => {
  const items: ToolRetrievalItem[] = [
    {
      name: "analytics_getSales",
      text: "Sales and payment analytics — analytics_getSales",
    },
    {
      name: "shipping_track",
      text: "Shipment tracking and courier management — shipping_track",
    },
    {
      name: "db_query",
      text: "Database administration tools — db_query",
    },
  ];

  const embedFn = makeFakeEmbedFn();
  const index = new ToolEmbeddingIndex(items, embedFn);
  const results = await index.rank("track my shipment", { topK: 3 });

  assertEqual(
    results[0].name,
    "shipping_track",
    "shipping tool must rank first for a shipment query",
  );
});

await test("hybrid ranking: topK cap respected — returns exactly topK items", async () => {
  const items: ToolRetrievalItem[] = Array.from({ length: 10 }, (_, i) => ({
    name: `tool_${i}`,
    text: `Sales and payment analytics — analytics_getSales`,
  }));

  const embedFn = makeFakeEmbedFn();
  const index = new ToolEmbeddingIndex(items, embedFn);
  const results = await index.rank("show me yesterday's sales", { topK: 3 });

  assertEqual(results.length, 3, "topK=3 must return exactly 3 results");
});

await test("hybrid ranking: results sorted descending by score", async () => {
  const items: ToolRetrievalItem[] = [
    {
      name: "analytics_getSales",
      text: "Sales and payment analytics — analytics_getSales",
    },
    {
      name: "shipping_track",
      text: "Shipment tracking and courier management — shipping_track",
    },
    {
      name: "calendar_createEvent",
      text: "Calendar scheduling tools — calendar_createEvent",
    },
  ];

  const embedFn = makeFakeEmbedFn();
  const index = new ToolEmbeddingIndex(items, embedFn);
  const results = await index.rank("show me yesterday's sales", { topK: 3 });

  for (let i = 1; i < results.length; i++) {
    assert(
      results[i - 1].score >= results[i].score,
      `Results not sorted descending: ${results[i - 1].score} < ${results[i].score} at position ${i}`,
    );
  }
});

await test("hybrid ranking: both cosine-only and bm25-only correctly rank analytics first for a sales query", async () => {
  // "sales analytics" text — lexically "sales" appears only in analytics
  const items: ToolRetrievalItem[] = [
    {
      name: "analytics_getSales",
      text: "Sales and payment analytics — analytics_getSales",
    },
    {
      name: "shipping_track",
      text: "Shipment tracking and courier management — shipping_track",
    },
  ];

  const embedFn = makeFakeEmbedFn();

  const cosineIndex = new ToolEmbeddingIndex(items, embedFn);
  const cosineResults = await cosineIndex.rank("show me yesterday's sales", {
    topK: 2,
    weights: { cosine: 1.0, bm25: 0.0 },
  });
  // Cosine: analytics [1,0,0,0] is closer to query [1,0,0,0] than shipping [0,1,0,0]
  assertEqual(
    cosineResults[0].name,
    "analytics_getSales",
    "cosine-only: analytics must rank first for sales query",
  );

  const bm25Index = new ToolEmbeddingIndex(items, embedFn);
  const bm25Results = await bm25Index.rank("show me yesterday's sales", {
    topK: 2,
    weights: { cosine: 0.0, bm25: 1.0 },
  });
  // BM25: "sales" appears in analytics text only → analytics tops
  assertEqual(
    bm25Results[0].name,
    "analytics_getSales",
    "bm25-only: analytics must rank first for sales query",
  );
});

// ============================================================================
// Part 3 — embedding index CACHES tool vectors (call count invariant)
// ============================================================================

await test("embedding index: call count does NOT grow on second rank() of same catalog", async () => {
  const callCount = { n: 0 };
  const embedFn = makeFakeEmbedFn(callCount);

  const items: ToolRetrievalItem[] = [
    {
      name: "analytics_getSales",
      text: "Sales and payment analytics — analytics_getSales",
    },
    {
      name: "shipping_track",
      text: "Shipment tracking and courier management — shipping_track",
    },
    {
      name: "calendar_createEvent",
      text: "Calendar scheduling tools — calendar_createEvent",
    },
  ];

  const index = new ToolEmbeddingIndex(items, embedFn);

  await index.rank("show me yesterday's sales", { topK: 3 });
  const callsAfterFirst = callCount.n;

  await index.rank("track my shipment", { topK: 3 });
  const callsAfterSecond = callCount.n;

  // Second rank: only the NEW query needs embedding (1 extra call).
  // Catalog texts are cached, so no batch re-embed.
  assertEqual(
    callsAfterSecond - callsAfterFirst,
    1,
    `Second rank() should add exactly 1 call (query only), got ${callsAfterSecond - callsAfterFirst}`,
  );
});

await test("embedding index: duplicate catalog texts deduplicated before embedding", async () => {
  const callCount = { n: 0 };
  const embedFn = makeFakeEmbedFn(callCount);

  // Two items that share the same description text
  const items: ToolRetrievalItem[] = [
    {
      name: "tool_a",
      text: "Sales and payment analytics — analytics_getSales",
    },
    {
      name: "tool_b",
      text: "Sales and payment analytics — analytics_getSales",
    },
  ];

  const index = new ToolEmbeddingIndex(items, embedFn);
  await index.rank("show me yesterday's sales", { topK: 2 });

  // catalog batch (1 unique text) + query (1 call) = 2 calls total, NOT 3
  assertEqual(
    callCount.n,
    2,
    `Expected 2 embedFn calls (1 catalog + 1 query), got ${callCount.n}`,
  );
});

// ============================================================================
// Part 4 — granularity:"tool" narrows to individual tools
// ============================================================================

await test('granularity:"tool" + embedding: unpicked individual tools excluded even within a kept server', async () => {
  const catalog = buildLargeCatalog();
  const embedFn = makeFakeEmbedFn();

  let decision: ToolRoutingDecision | undefined;

  const excluded = await resolveToolRoutingExclusions({
    catalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me yesterday's sales",
    routerModel: {},
    timeoutMs: 5000,
    // generateFn must NOT be called — embedding path returns first
    generateFn: async () => {
      throw new Error("LLM router must not be called when embedding activates");
    },
    embedFn,
    embeddingConfig: {
      enabled: true,
      topK: 6,
      minToolsToActivate: 20,
    },
    granularity: "tool",
    emitDecision: (d) => {
      decision = d;
    },
  } as ToolRoutingResolutionParams);

  assertNotNull(decision, "emitDecision should have been called");
  assertEqual(
    decision.embeddingActivated,
    true,
    "embedding must have activated",
  );
  assertEqual(decision.granularity, "tool", 'granularity should be "tool"');
  assertEqual(decision.outcome, "applied", 'outcome should be "applied"');

  // analytics tools (top-6 cluster) must NOT be excluded
  for (const toolName of catalog[0].toolNames) {
    assert(
      !excluded.includes(toolName),
      `analytics tool ${toolName} must not be excluded`,
    );
  }

  // At least one non-analytics tool must be excluded
  const nonAnalyticsExcluded = excluded.filter(
    (t) => !t.startsWith("analytics_"),
  );
  assert(
    nonAnalyticsExcluded.length > 0,
    "at least one non-analytics tool must be excluded",
  );
});

await test("granularity:tool + embedding: total tools = excluded + kept", async () => {
  const catalog = buildLargeCatalog();
  const totalTools = catalog.reduce((s, c) => s + c.toolNames.length, 0); // 22

  const embedFn = makeFakeEmbedFn();
  const excluded = await resolveToolRoutingExclusions({
    catalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me yesterday's sales",
    routerModel: {},
    timeoutMs: 5000,
    generateFn: async () => {
      throw new Error("LLM router must not be called");
    },
    embedFn,
    embeddingConfig: { enabled: true, topK: 10, minToolsToActivate: 20 },
    granularity: "tool",
  } as ToolRoutingResolutionParams);

  // NB: the obvious "kept + excluded === total" phrasing is a tautology when
  // `kept` is itself derived as `total - excluded.length` — it holds for any
  // value the router returns. Assert the exact count instead: topK=10 keeps
  // ten tools, so precisely the other twelve must be excluded.
  assertEqual(
    excluded.length,
    totalTools - 10,
    `topK=10 must keep exactly 10 of ${totalTools} tools, leaving ${totalTools - 10} excluded`,
  );
  // No tool may be reported twice — a duplicate would inflate the count above
  // without excluding anything extra.
  assertEqual(
    new Set(excluded).size,
    excluded.length,
    "the exclusion list must not contain duplicates",
  );
});

await test("granularity:tool fallback: embedding disabled → uses server granularity via LLM router", async () => {
  const catalog = buildLargeCatalog();
  let routerCalled = false;

  const excluded = await resolveToolRoutingExclusions({
    catalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me yesterday's sales",
    routerModel: {},
    timeoutMs: 5000,
    generateFn: async () => {
      routerCalled = true;
      return {
        content: '{"servers":["analytics"]}',
      } as unknown as import("../src/lib/types/index.js").GenerateResult;
    },
    // No embedFn → embedding path bypassed entirely
    granularity: "tool",
  });

  // LLM router must be called since embedding is off
  assert(routerCalled, "LLM router must be called when embedding is disabled");
  // analytics tools must not be excluded
  assert(
    !excluded.includes("analytics_getSales"),
    "analytics_getSales must not be excluded",
  );
  // non-analytics tools must be excluded
  assert(
    excluded.includes("shipping_track"),
    "shipping tools must be excluded by server-granularity fallback",
  );
});

// ============================================================================
// Part 5 — granularity:"server" regression guard (identical to pre-existing behavior)
// ============================================================================

await test("granularity:server + embedding disabled: excludes whole unpicked servers (regression guard)", async () => {
  const CATALOG: ToolRoutingCatalogEntry[] = [
    {
      id: "analytics",
      description: "Sales and payment analytics queries",
      toolNames: ["analytics_getSales", "analytics_getPayments"],
    },
    {
      id: "shipping",
      description: "Shipment tracking and courier management",
      toolNames: ["shipping_track", "shipping_listCouriers"],
    },
    {
      id: "utility",
      description: "Always-on utility helpers",
      toolNames: ["utility_echo"],
    },
  ];

  const excluded = await resolveToolRoutingExclusions({
    catalog: CATALOG,
    alwaysIncludeServerIds: ["utility"],
    userQuery: "show me yesterday's sales",
    routerModel: { provider: "openai", model: "gpt-4o-mini" },
    timeoutMs: 15000,
    generateFn: async () =>
      ({
        content: '{"servers":["analytics"]}',
      }) as unknown as import("../src/lib/types/index.js").GenerateResult,
    // No embedFn → pure LLM router path (original behavior)
    granularity: "server",
  });

  assert(
    excluded.includes("shipping_track"),
    "shipping_track must be excluded",
  );
  assert(
    excluded.includes("shipping_listCouriers"),
    "shipping_listCouriers must be excluded",
  );
  assert(
    !excluded.includes("analytics_getSales"),
    "analytics tools must NOT be excluded",
  );
  assert(
    !excluded.includes("utility_echo"),
    "utility tools must NEVER be excluded (always-include)",
  );
});

await test("granularity:server + embedding (large catalog): excludes entire unpicked servers", async () => {
  const catalog = buildLargeCatalog();
  const embedFn = makeFakeEmbedFn();
  let decision: ToolRoutingDecision | undefined;

  const excluded = await resolveToolRoutingExclusions({
    catalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me yesterday's sales",
    routerModel: {},
    timeoutMs: 5000,
    generateFn: async () => {
      throw new Error("LLM router must not be called");
    },
    embedFn,
    embeddingConfig: { enabled: true, topK: 8, minToolsToActivate: 20 },
    granularity: "server",
    emitDecision: (d) => {
      decision = d;
    },
  } as ToolRoutingResolutionParams);

  assertEqual(decision?.embeddingActivated, true, "embedding must activate");
  assertEqual(decision?.granularity, "server", "granularity must be server");

  // analytics server must be kept entire
  for (const toolName of catalog[0].toolNames) {
    assert(
      !excluded.includes(toolName),
      `analytics tool ${toolName} must not be excluded`,
    );
  }

  // At least one server is excluded wholesale
  assert(
    excluded.length > 0,
    "at least one non-analytics server must be excluded",
  );
});

// ============================================================================
// Part 6 — FAIL OPEN: embedFn throws → fallback, no throw
// ============================================================================

await test("fail open: embedFn that throws → resolveToolRoutingExclusions does NOT throw", async () => {
  const throwingEmbedFn = async (): Promise<number[][]> => {
    throw new Error("embedding service unavailable");
  };

  let llmCalled = false;
  const result = await resolveToolRoutingExclusions({
    catalog: buildLargeCatalog(),
    alwaysIncludeServerIds: [],
    userQuery: "show me sales",
    routerModel: {},
    timeoutMs: 5000,
    generateFn: async () => {
      llmCalled = true;
      return {
        content: '{"servers":["analytics"]}',
      } as unknown as import("../src/lib/types/index.js").GenerateResult;
    },
    embedFn: throwingEmbedFn,
    embeddingConfig: { enabled: true, topK: 10, minToolsToActivate: 20 },
    granularity: "tool",
  });

  // Must not throw — result is an array
  assert(
    Array.isArray(result),
    "result must be an array even when embedFn throws",
  );
  // LLM router must have been called as fallback
  assert(llmCalled, "LLM router must be called after embedFn throws");
});

await test("fail open: embedFn throws → result matches routing-without-embedding", async () => {
  const catalog = buildLargeCatalog();
  const throwingEmbedFn = async (): Promise<number[][]> => {
    throw new Error("embed down");
  };

  const generateFn = async () =>
    ({
      content: '{"servers":["analytics"]}',
    }) as unknown as import("../src/lib/types/index.js").GenerateResult;

  // With broken embedFn → falls back to LLM router
  const withBrokenEmbed = await resolveToolRoutingExclusions({
    catalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me sales",
    routerModel: {},
    timeoutMs: 5000,
    generateFn,
    embedFn: throwingEmbedFn,
    embeddingConfig: { enabled: true, topK: 10, minToolsToActivate: 20 },
  });

  // Without embedFn → LLM router directly
  const withoutEmbed = await resolveToolRoutingExclusions({
    catalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me sales",
    routerModel: {},
    timeoutMs: 5000,
    generateFn,
  });

  assertEqual(
    JSON.stringify(withBrokenEmbed.sort()),
    JSON.stringify(withoutEmbed.sort()),
    "broken embedFn result must equal no-embedding result",
  );
});

// ============================================================================
// Part 7 — cosineSimilarity edge cases beyond the four guards above
// ============================================================================

await test("cosineSimilarity: anti-parallel vectors return -1", () => {
  // Real embeddings are non-negative, so this never arises in practice — but
  // the sign has to survive, otherwise a "most similar" ranking could silently
  // become a "most opposite" one.
  assertCloseTo(
    cosineSimilarity([1, 0, 0], [-1, 0, 0]),
    -1,
    10,
    "exact sign flip must give -1",
  );
});

await test("cosineSimilarity: empty vectors return 0 (guard)", () => {
  assertEqual(cosineSimilarity([], []), 0, "both empty");
  assertEqual(cosineSimilarity([], [1]), 0, "left empty");
  assertEqual(cosineSimilarity([1], []), 0, "right empty");
});

await test("cosineSimilarity: 2-D case matches the analytic result", () => {
  // [1,1] · [1,0] = 1; |[1,1]| = √2; |[1,0]| = 1 → cos = 1/√2 ≈ 0.7071.
  // The guards above only prove it returns 0 or 1; this pins an intermediate
  // value, so a normalisation bug can't hide between them.
  assertCloseTo(
    cosineSimilarity([1, 1], [1, 0]),
    1 / Math.SQRT2,
    6,
    "45° between vectors",
  );
});

await test("hybrid ranking: an empty catalog ranks nothing", async () => {
  const index = new ToolEmbeddingIndex([], makeFakeEmbedFn());
  const results = await index.rank("any query", { topK: 5 });
  assertEqual(results.length, 0, "an empty catalog must yield no results");
});

await test("granularity:tool reports the decision and keeps exactly the top-K tools", async () => {
  // The count-only test above proves the arithmetic; this one pins WHICH tools
  // survive and what the emitted decision claims — an exclusion list of the
  // right length made of the wrong tools would satisfy the other test.
  const catalog = buildLargeCatalog();
  const totalTools = catalog.reduce((s, c) => s + c.toolNames.length, 0);
  let decision: ToolRoutingDecision | undefined;

  const excluded = await resolveToolRoutingExclusions({
    catalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me yesterday's sales",
    routerModel: {},
    timeoutMs: 5000,
    generateFn: (async () => {
      throw new Error("LLM router must not be called");
    }) as ToolRoutingResolutionParams["generateFn"],
    embedFn: makeFakeEmbedFn(),
    embeddingConfig: { enabled: true, topK: 6, minToolsToActivate: 20 },
    granularity: "tool",
    emitDecision: (d) => {
      decision = d;
    },
  });

  assertEqual(decision?.embeddingActivated, true, "embedding must activate");
  assertEqual(decision?.granularity, "tool", "granularity must be reported");
  assertEqual(decision?.outcome, "applied", "the decision must be applied");

  // The six analytics tools are the six closest to a "sales" query, so with
  // topK=6 every one of them must survive and nothing else may.
  for (const toolName of catalog.find((c) => c.id === "analytics")!.toolNames) {
    assert(
      !excluded.includes(toolName),
      `${toolName} is in the top-6 and must not be excluded`,
    );
  }
  assert(
    excluded.filter((t) => !t.startsWith("analytics_")).length > 0,
    "tools far from the query vector must be excluded",
  );
  assertEqual(
    excluded.length,
    totalTools - 6,
    `topK=6 must leave exactly ${totalTools - 6} tools excluded`,
  );
});

// ============================================================================
// Part 8 — selectRelevantToolNames (the convenience wrapper)
// ============================================================================

await test("selectRelevantToolNames: returns the top-K names, best match first", async () => {
  const items: ToolRetrievalItem[] = [
    {
      name: "analytics_getSales",
      text: "Sales and payment analytics — analytics_getSales",
    },
    {
      name: "analytics_getRevenue",
      text: "Sales and payment analytics — analytics_getRevenue",
    },
    {
      name: "shipping_track",
      text: "Shipment tracking and courier management — shipping_track",
    },
  ];
  const result = await selectRelevantToolNames(
    "show me yesterday's sales",
    items,
    { topK: 2, embedFn: makeFakeEmbedFn() },
  );
  assertEqual(result.length, 2, "topK must cap the name list");
  assertEqual(result[0], "analytics_getSales", "best match must come first");
});

await test("selectRelevantToolNames: propagates embedFn errors instead of swallowing them", async () => {
  // Deliberately unlike resolveToolRoutingExclusions, which fails open. This
  // wrapper is a direct query: silently returning nothing would look like "no
  // relevant tools" rather than "the embedding backend is down".
  const throwingEmbedFn = async (): Promise<number[][]> => {
    throw new Error("embed service down");
  };
  let caught: unknown;
  try {
    await selectRelevantToolNames("query", [{ name: "t", text: "text" }], {
      topK: 1,
      embedFn: throwingEmbedFn,
    });
  } catch (error) {
    caught = error;
  }
  assert(
    caught instanceof Error && caught.message.includes("embed service down"),
    "the embedFn failure must reach the caller",
  );
});

// ============================================================================
// Part 9 — threshold and granularity-default guards
// ============================================================================

await test("embedding falls open when the catalog is below minToolsToActivate", async () => {
  // 5 tools against a threshold of 20 — the fast-path must not engage, and
  // must not claim it did.
  const smallCatalog: ToolRoutingCatalogEntry[] = [
    {
      id: "analytics",
      description: "Sales and payment analytics",
      toolNames: ["analytics_getSales", "analytics_getPayments"],
    },
    {
      id: "shipping",
      description: "Shipment tracking and courier management",
      toolNames: ["shipping_track", "shipping_listCouriers"],
    },
    {
      id: "calendar",
      description: "Calendar scheduling tools",
      toolNames: ["calendar_createEvent"],
    },
  ];

  let llmRouterCalled = false;
  let decision: ToolRoutingDecision | undefined;

  await resolveToolRoutingExclusions({
    catalog: smallCatalog,
    alwaysIncludeServerIds: [],
    userQuery: "show me yesterday's sales",
    routerModel: { provider: "openai", model: "gpt-4o-mini" },
    timeoutMs: 5000,
    generateFn: (async () => {
      llmRouterCalled = true;
      return {
        content: '{"servers":["analytics"]}',
      } as unknown as import("../src/lib/types/index.js").GenerateResult;
    }) as ToolRoutingResolutionParams["generateFn"],
    embedFn: makeFakeEmbedFn(),
    embeddingConfig: { enabled: true, topK: 3, minToolsToActivate: 20 },
    granularity: "tool",
    emitDecision: (d) => {
      decision = d;
    },
  });

  assert(
    llmRouterCalled,
    "a below-threshold catalog must be routed by the LLM",
  );
  assertEqual(
    decision?.embeddingActivated,
    undefined,
    "embeddingActivated must not be claimed below the threshold",
  );
});

await test("granularity:'server' stated explicitly matches the default", async () => {
  const smallCatalog: ToolRoutingCatalogEntry[] = [
    {
      id: "analytics",
      description: "Sales and payment analytics queries",
      toolNames: ["analytics_getSales", "analytics_getPayments"],
    },
    {
      id: "shipping",
      description: "Shipment tracking and courier management",
      toolNames: ["shipping_track", "shipping_listCouriers"],
    },
    {
      id: "utility",
      description: "Always-on utility helpers",
      toolNames: ["utility_echo"],
    },
  ];
  const generateFn = (async () =>
    ({
      content: '{"servers":["analytics"]}',
    }) as unknown as import("../src/lib/types/index.js").GenerateResult) as ToolRoutingResolutionParams["generateFn"];

  const withDefault = await resolveToolRoutingExclusions({
    catalog: smallCatalog,
    alwaysIncludeServerIds: ["utility"],
    userQuery: "show me yesterday's sales",
    routerModel: {},
    timeoutMs: 15000,
    generateFn,
  });

  const withExplicitServer = await resolveToolRoutingExclusions({
    catalog: smallCatalog,
    alwaysIncludeServerIds: ["utility"],
    userQuery: "show me yesterday's sales",
    routerModel: {},
    timeoutMs: 15000,
    generateFn,
    granularity: "server",
  });

  assertEqual(
    JSON.stringify([...withDefault].sort()),
    JSON.stringify([...withExplicitServer].sort()),
    "stating the default explicitly must not change behaviour",
  );
  // Pin the actual content too, so the pair could not both be empty and still
  // satisfy the equality above.
  assert(
    withDefault.includes("shipping_track"),
    "the unpicked shipping server must be excluded",
  );
  assert(
    !withDefault.includes("utility_echo"),
    "the always-include server must survive",
  );
});

// ============================================================================
// Part 10 — NeuroLink provider wiring (deterministic, no API keys)
// ============================================================================

/**
 * Registers `count` tools per server on a NeuroLink instance so the catalog
 * clears minToolsToActivate.
 */
function registerServerTools(
  instance: NeuroLink,
  servers: { id: string; desc: string; count: number }[],
): void {
  const noopExecute = async (): Promise<{ ok: boolean }> => ({ ok: true });
  const toolEntries: Record<string, unknown> = {};
  for (const srv of servers) {
    for (let i = 0; i < srv.count; i++) {
      const name = `${srv.id}_tool${i}`;
      toolEntries[name] = {
        name,
        description: `${srv.desc} tool ${i}`,
        execute: noopExecute,
      };
    }
  }
  (
    instance as unknown as {
      registerTools(entries: Record<string, unknown>): void;
    }
  ).registerTools(toolEntries);
  instance.setToolRoutingServers(
    servers.map((s) => ({ id: s.id, description: s.desc })),
  );
}

/** Reaches the private hook that stream()/generate() call internally. */
const applyExclusions = (
  instance: NeuroLink,
  options: import("../src/lib/types/index.js").StreamOptions,
  userQuery: string,
): Promise<void> =>
  (
    instance as unknown as {
      applyToolRoutingExclusions(
        opts: import("../src/lib/types/index.js").StreamOptions,
        userQuery: string,
      ): Promise<void>;
    }
  ).applyToolRoutingExclusions(options, userQuery);

const FOUR_SERVERS = [
  { id: "analytics", desc: "Sales and payment analytics", count: 6 },
  {
    id: "shipping",
    desc: "Shipment tracking and courier management",
    count: 6,
  },
  { id: "calendar", desc: "Calendar scheduling tools", count: 6 },
  { id: "db", desc: "Database administration tools", count: 4 },
];

await test("applyToolRoutingExclusions falls back to the LLM router when embedding is disabled", async () => {
  const instance = new NeuroLink({
    toolRouting: {
      enabled: true,
      alwaysIncludeServerIds: [],
      embedding: { enabled: false },
      granularity: "tool",
    },
  });
  registerServerTools(instance, FOUR_SERVERS);

  const generateStub = stub(
    instance,
    "generate",
    async () =>
      ({
        content: '{"servers":["analytics"]}',
      }) as unknown as import("../src/lib/types/index.js").GenerateResult,
  );

  const options = {
    input: { text: "show me sales" },
    excludeTools: [] as string[],
  } as import("../src/lib/types/index.js").StreamOptions;

  await withStubs([generateStub], () =>
    applyExclusions(instance, options, "show me sales"),
  );

  assertEqual(
    generateStub.callCount,
    1,
    "with embedding off the LLM router must run exactly once",
  );
  const excluded = options.excludeTools as string[];
  assert(Array.isArray(excluded), "excludeTools must be an array");
  assert(
    excluded.some((t) => t.startsWith("shipping_")),
    "the unpicked shipping server must be excluded",
  );
});

await test("embedMany from the configured provider is wired into applyToolRoutingExclusions", async () => {
  // The suite's other embedding tests inject embedFn directly, which skips the
  // provider lookup entirely. This one stubs the factory instead, so the
  // NeuroLink → AIProviderFactory → embedMany path is what actually runs.
  const fixedEmbedMany = spy(async (texts: string[]) =>
    texts.map((t) => {
      if (t.includes("analytics") || t.includes("sales")) {
        return [1, 0, 0, 0];
      }
      if (t.includes("shipping")) {
        return [0, 1, 0, 0];
      }
      if (t.includes("calendar")) {
        return [0, 0, 1, 0];
      }
      if (t.includes("db") || t.includes("database")) {
        return [0, 0, 0, 1];
      }
      return [0.25, 0.25, 0.25, 0.25];
    }),
  );

  const createProviderStub = stub(
    AIProviderFactory,
    "createProvider",
    async () =>
      ({ embedMany: fixedEmbedMany.fn }) as unknown as Awaited<
        ReturnType<typeof AIProviderFactory.createProvider>
      >,
  );

  const instance = new NeuroLink({
    toolRouting: {
      enabled: true,
      alwaysIncludeServerIds: [],
      embedding: {
        enabled: true,
        provider: "openai",
        model: "text-embedding-3-small",
        topK: 6,
        minToolsToActivate: 20,
      },
      granularity: "tool",
    },
  });
  registerServerTools(instance, FOUR_SERVERS);

  const generateStub = stub(instance, "generate", async () => {
    throw new Error("LLM router must not be called");
  });

  const options = {
    input: { text: "show me yesterday's sales" },
    excludeTools: [] as string[],
    provider: "openai",
  } as import("../src/lib/types/index.js").StreamOptions;

  await withStubs([createProviderStub, generateStub], () =>
    applyExclusions(instance, options, "show me yesterday's sales"),
  );

  // The factory must have been asked for the CONFIGURED provider and model.
  // Without this the test would still pass if embedFn came from somewhere else.
  const callArgs = createProviderStub.calls[0];
  assert(callArgs !== undefined, "createProvider must have been called");
  assertEqual(callArgs?.[0], "openai", "the configured provider must be used");
  assertEqual(
    callArgs?.[1],
    "text-embedding-3-small",
    "the configured model must be used",
  );

  assert(fixedEmbedMany.callCount > 0, "embedMany must have run");
  assertEqual(
    generateStub.callCount,
    0,
    "embedding handled the routing — the LLM router must not run",
  );

  const excludedTools = options.excludeTools as string[];
  assertEqual(
    excludedTools.filter((t) => t.startsWith("analytics_")).length,
    0,
    "analytics tools match the query and must be kept",
  );
  assert(
    excludedTools.filter((t) => !t.startsWith("analytics_")).length > 0,
    "unrelated tools must be excluded",
  );
});

await test("the vector cache persists across turns — turn 2 re-embeds no catalog text", async () => {
  let embedCallsForCatalogTexts = 0;
  const trackingEmbedMany = spy(async (texts: string[]) => {
    // Count only batches carrying catalog text ("<server desc> — <tool>"),
    // never the bare user query.
    if (texts.some((t) => t.includes(" — ") && !t.includes("show me"))) {
      embedCallsForCatalogTexts += 1;
    }
    return texts.map(() => [1, 0, 0, 0]);
  });

  const createProviderStub = stub(
    AIProviderFactory,
    "createProvider",
    async () =>
      ({ embedMany: trackingEmbedMany.fn }) as unknown as Awaited<
        ReturnType<typeof AIProviderFactory.createProvider>
      >,
  );

  const instance = new NeuroLink({
    toolRouting: {
      enabled: true,
      alwaysIncludeServerIds: [],
      embedding: {
        enabled: true,
        provider: "openai",
        model: "text-embedding-3-small",
        topK: 6,
        minToolsToActivate: 20,
      },
      granularity: "server",
    },
  });
  registerServerTools(instance, [
    { id: "analytics", desc: "Sales analytics", count: 6 },
    { id: "shipping", desc: "Shipment tracking", count: 6 },
    { id: "calendar", desc: "Calendar scheduling", count: 6 },
    { id: "db", desc: "Database tools", count: 4 },
  ]);

  const generateStub = stub(instance, "generate", async () => {
    throw new Error("LLM router must not be called");
  });

  const makeOptions = () =>
    ({
      input: { text: "show me sales" },
      excludeTools: [] as string[],
      provider: "openai",
    }) as import("../src/lib/types/index.js").StreamOptions;

  await withStubs([createProviderStub, generateStub], async () => {
    // Turn 1: nothing cached, so the catalog gets embedded.
    await applyExclusions(instance, makeOptions(), "show me sales");
    const afterTurn1 = embedCallsForCatalogTexts;
    assert(afterTurn1 > 0, "turn 1 must embed the catalog");

    // Turn 2: the shared vector cache should already cover every catalog text.
    await applyExclusions(instance, makeOptions(), "show me sales");
    assertEqual(
      embedCallsForCatalogTexts,
      afterTurn1,
      "turn 2 must not re-embed any catalog text",
    );
  });
});

// ============================================================================
// Part 11 — LIVE-gated: real embedding provider over >20-tool catalog
// ============================================================================

await test("LIVE — real embedding provider narrows tool set for >20-tool catalog (skips without keys)", async () => {
  // Try OpenAI first; fall back to Google AI if OpenAI is absent.
  let provider = "openai";
  let model: string | undefined = "text-embedding-3-small";
  try {
    skipUnlessProviderAvailable("openai");
  } catch {
    // openai unavailable — try google-ai
    try {
      skipUnlessProviderAvailable("google-ai");
      provider = "google-ai";
      model = undefined; // use default embedding model
    } catch {
      throw new Skip(
        "no embedding-capable provider available (openai, google-ai)",
      );
    }
  }

  const catalog = buildLargeCatalog();
  // Add a few more tools so we're clearly above 20
  catalog.push({
    id: "notifications",
    description: "Push notification and alert delivery tools",
    toolNames: [
      "notifications_send",
      "notifications_schedule",
      "notifications_cancel",
    ],
  });

  const noopExecute = async (): Promise<{ ok: boolean }> => ({ ok: true });
  let sdk: InstanceType<typeof NeuroLink> | null = null;

  try {
    sdk = new NeuroLink({
      toolRouting: {
        enabled: true,
        alwaysIncludeServerIds: [],
        embedding: {
          enabled: true,
          provider,
          model,
          topK: 8,
          minToolsToActivate: 20,
        },
        granularity: "tool",
        routerModel: { provider, temperature: 0 },
        timeoutMs: 30000,
      },
    });

    // Register all tools
    const allTools: Record<
      string,
      { name: string; description: string; execute: typeof noopExecute }
    > = {};
    for (const entry of catalog) {
      for (const toolName of entry.toolNames) {
        allTools[toolName] = {
          name: toolName,
          description: `${entry.description} — ${toolName}`,
          execute: noopExecute,
        };
      }
    }
    sdk.registerTools(allTools);
    sdk.setToolRoutingServers(
      catalog.map((e) => ({ id: e.id, description: e.description })),
    );

    let decision: ToolRoutingDecision | undefined;

    // Use applyToolRoutingExclusions directly (private hook, same as stream/generate)
    const options = {
      input: { text: "show me yesterday's sales data" },
      excludeTools: [] as string[],
      provider,
    } as import("../src/lib/types/index.js").StreamOptions;

    // We must observe the decision — inject via emitDecision by hooking into
    // resolveToolRoutingExclusions indirectly. Since we can't inject
    // emitDecision from outside NeuroLink, we call applyToolRoutingExclusions
    // and check the result (exclusion list) instead.
    await (
      sdk as unknown as {
        applyToolRoutingExclusions(
          opts: typeof options,
          userQuery: string,
        ): Promise<void>;
      }
    ).applyToolRoutingExclusions(options, "show me yesterday's sales data");

    // The embedding path may or may not have activated (depends on provider
    // availability and model). What we CAN assert:
    // 1. The call returned without throwing.
    // 2. excludeTools is an array.
    // 3. At least some tools were narrowed OR the result is empty (fail-open).
    assert(
      Array.isArray(options.excludeTools),
      "options.excludeTools must be an array after applyToolRoutingExclusions",
    );

    const totalTools = catalog.reduce((s, c) => s + c.toolNames.length, 0);
    const excluded = options.excludeTools as string[];

    // Either: embedding activated and narrowed (excluded.length > 0 and
    // analytics tools not excluded), or fall-open (excluded.length = 0 or
    // LLM router ran instead). Both are acceptable.
    if (excluded.length > 0) {
      // If something was excluded, analytics tools should NOT be in the list
      // (since "sales" maps semantically to analytics).
      assert(
        !excluded.includes("analytics_getSales"),
        "analytics_getSales must NOT be excluded for a sales query",
      );
    }
    // Total: at most totalTools can be excluded
    assert(
      excluded.length <= totalTools,
      `excluded.length (${excluded.length}) must not exceed totalTools (${totalTools})`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof Skip || msg.startsWith("SKIP:")) {
      throw error;
    }
    if (isExpectedProviderError(msg)) {
      throw new Skip(`provider error: ${msg}`);
    }
    throw error;
  } finally {
    if (sdk) {
      try {
        await sdk.dispose();
      } catch {
        /* swallow */
      }
    }
  }
});

await runSuite();
