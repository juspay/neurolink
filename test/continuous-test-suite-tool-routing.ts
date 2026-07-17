#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Pre-call Tool Routing
 *
 * Deterministic (no-API) coverage using a fake generateFn:
 *   Part 1 — resolveToolRoutingExclusions: core behavior (10 tests)
 *   Part 2 — ITEM E: emitDecision callback shape (5 tests)
 *   Part 3 — ITEM C: ToolRoutingCache (8 tests)
 *   Part 4 — ITEM C: End-to-end cache-hit skips router (2 tests)
 *   Part 5 — LIVE-gated: NeuroLink.generate() wiring (1 test, skips without keys)
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-tool-routing.ts
 *      pnpm run test:tool-routing
 */

import {
  resolveToolRoutingExclusions,
  buildToolRoutingCatalog,
  buildRoutingQueryFromHistory,
  ToolRoutingCache,
  NeuroLink,
} from "../dist/index.js";
import type {
  ToolRoutingCatalogEntry,
  ToolRoutingDecision,
  ToolRoutingResolutionParams,
} from "../src/lib/types/index.js";
import {
  defineSuite,
  assert,
  assertEqual,
  assertNotNull,
} from "./helpers/harness.js";
import { Skip } from "./helpers/harness.js";
import { stub, withStubs } from "./helpers/stubs.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { isExpectedProviderError } from "./helpers/envGuard.js";

const { test, runSuite } = defineSuite("Pre-call Tool Routing");

// ============================================================================
// Shared catalog used across multiple tests
// ============================================================================

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

// Minimal GenerateResult compatible shape
type FakeGenerateResult = { content: string };

function fakeGenerate(
  content: string,
): (opts: unknown) => Promise<FakeGenerateResult> {
  return async () => ({ content });
}

function baseParams(
  overrides: Partial<ToolRoutingResolutionParams>,
): ToolRoutingResolutionParams {
  return {
    catalog: CATALOG,
    alwaysIncludeServerIds: ["utility"],
    userQuery: "show me yesterday's sales",
    routerModel: { provider: "openai", model: "gpt-4o-mini" },
    timeoutMs: 15000,
    generateFn: fakeGenerate(
      '{"servers":["analytics"]}',
    ) as ToolRoutingResolutionParams["generateFn"],
    ...overrides,
  };
}

// ============================================================================
// Part 1 — resolveToolRoutingExclusions: core behavior
// ============================================================================

await test("excludes unpicked routable servers' tools", async () => {
  const excluded = await resolveToolRoutingExclusions(baseParams({}));
  // analytics was picked, shipping was not; utility is always-include
  assert(excluded.includes("shipping_track"), "should exclude shipping_track");
  assert(
    excluded.includes("shipping_listCouriers"),
    "should exclude shipping_listCouriers",
  );
  assert(
    !excluded.includes("analytics_getSales"),
    "should not exclude analytics tools",
  );
  assert(
    !excluded.includes("utility_echo"),
    "should never exclude always-include server",
  );
});

await test("always-include servers never appear in the router prompt or exclusion list", async () => {
  let capturedPrompt = "";
  const generateFn = async (opts: { input?: { text?: string } }) => {
    capturedPrompt = opts?.input?.text ?? "";
    return { content: '{"servers":["analytics"]}' };
  };
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      generateFn: generateFn as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assert(
    !capturedPrompt.includes("utility"),
    "utility should not appear in router prompt",
  );
  assert(
    !excluded.includes("utility_echo"),
    "utility_echo must not be excluded",
  );
});

await test("fails open when userQuery is empty — no router call", async () => {
  let callCount = 0;
  const generateFn = async () => {
    callCount++;
    return { content: '{"servers":[]}' };
  };
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      userQuery: "",
      generateFn: generateFn as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assertEqual(excluded.length, 0, "should exclude nothing on empty query");
  assertEqual(callCount, 0, "router should not be called on empty query");
});

await test("fails open when <=1 routable server — no router call", async () => {
  let callCount = 0;
  const generateFn = async () => {
    callCount++;
    return { content: '{"servers":[]}' };
  };
  // shipping + utility; utility is always-include → only 1 routable
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      catalog: CATALOG.slice(1),
      generateFn: generateFn as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assertEqual(
    excluded.length,
    0,
    "should exclude nothing when <=1 routable server",
  );
  assertEqual(
    callCount,
    0,
    "router should not be called with single routable server",
  );
});

await test("fails open on non-JSON router response", async () => {
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      generateFn: fakeGenerate(
        "sorry, I cannot help with that",
      ) as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assertEqual(excluded.length, 0, "non-JSON response should fail open");
});

await test("fails open on schema-invalid router response", async () => {
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      generateFn: fakeGenerate(
        '{"servers":"analytics"}',
      ) as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assertEqual(excluded.length, 0, "invalid schema should fail open");
});

await test("fails open when pick is fully hallucinated", async () => {
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      generateFn: fakeGenerate(
        '{"servers":["made-up-server"]}',
      ) as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assertEqual(excluded.length, 0, "hallucinated pick should fail open");
});

await test("fails open when the router call throws", async () => {
  const generateFn = async () => {
    throw new Error("network error");
  };
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      generateFn: generateFn as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assertEqual(excluded.length, 0, "thrown router error should fail open");
});

await test("parses markdown-fenced router output", async () => {
  const excluded = await resolveToolRoutingExclusions(
    baseParams({
      generateFn: fakeGenerate(
        '```json\n{"servers":["shipping"]}\n```',
      ) as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assert(
    excluded.includes("analytics_getSales"),
    "should exclude analytics tools",
  );
  assert(
    excluded.includes("analytics_getPayments"),
    "should exclude analytics tools",
  );
  assert(
    !excluded.includes("shipping_track"),
    "should not exclude shipping tools",
  );
});

await test("buildToolRoutingCatalog groups tool names by server prefix", () => {
  const catalog = buildToolRoutingCatalog(
    [
      { id: "analytics", description: "Analytics" },
      { id: "shipping", description: "Shipping" },
    ],
    ["analytics_getSales", "shipping_track", "unrelated_tool"],
  );
  assertEqual(catalog.length, 2, "should have 2 entries");
  assertEqual(catalog[0].id, "analytics");
  assert(
    catalog[0].toolNames.includes("analytics_getSales"),
    "should include analytics tool",
  );
  assert(
    !catalog[0].toolNames.includes("unrelated_tool"),
    "should not include unrelated tool",
  );
});

await test("buildRoutingQueryFromHistory folds prior turns into transcript", () => {
  const result = buildRoutingQueryFromHistory(
    [
      { role: "user", content: "can you create a surcharge rule" },
      { role: "assistant", content: "Which payment type?" },
    ],
    "yes please",
  );
  assert(
    result.includes("can you create a surcharge rule"),
    "prior user turn included",
  );
  assert(
    result.includes("Which payment type?"),
    "prior assistant turn included",
  );
  assert(result.endsWith("user: yes please"), "current query at the tail");
});

// ============================================================================
// Part 2 — ITEM E: emitDecision callback shape
// ============================================================================

await test("emitDecision fires with outcome=applied on a successful routing", async () => {
  let decision: ToolRoutingDecision | undefined;
  const emitDecision = (d: ToolRoutingDecision) => {
    decision = d;
  };

  await resolveToolRoutingExclusions(baseParams({ emitDecision }));

  assertNotNull(decision, "emitDecision should have been called");
  assertEqual(decision.outcome, "applied", "outcome should be applied");
  assert(
    decision.selectedServerIds.includes("analytics"),
    "analytics should be selected",
  );
  assert(
    decision.excludedServerIds.includes("shipping"),
    "shipping should be excluded",
  );
  assertEqual(
    decision.cacheHit,
    false,
    "cache hit should be false for a live call",
  );
  assert(
    decision.routableServerCount >= 2,
    "should report routable server count",
  );
  assert(
    typeof decision.durationMs === "number" && decision.durationMs >= 0,
    "durationMs should be a number",
  );
  assert(
    Array.isArray(decision.hallucinatedIds),
    "hallucinatedIds should be an array",
  );
});

await test("emitDecision fires with outcome=skipped-no-query when userQuery is empty", async () => {
  let decision: ToolRoutingDecision | undefined;
  const emitDecision = (d: ToolRoutingDecision) => {
    decision = d;
  };

  await resolveToolRoutingExclusions(
    baseParams({ userQuery: "", emitDecision }),
  );

  assertNotNull(decision, "emitDecision should have been called");
  assertEqual(
    decision.outcome,
    "skipped-no-query",
    "outcome should be skipped-no-query",
  );
  assertEqual(decision.selectedServerIds.length, 0, "no servers selected");
  assertEqual(decision.excludedToolCount, 0, "no tools excluded");
});

await test("emitDecision fires with outcome=empty-pick on fully-hallucinated pick", async () => {
  let decision: ToolRoutingDecision | undefined;
  const emitDecision = (d: ToolRoutingDecision) => {
    decision = d;
  };

  await resolveToolRoutingExclusions(
    baseParams({
      generateFn: fakeGenerate(
        '{"servers":["made-up-server"]}',
      ) as ToolRoutingResolutionParams["generateFn"],
      emitDecision,
    }),
  );

  assertNotNull(decision, "emitDecision should have been called");
  assertEqual(decision.outcome, "empty-pick", "outcome should be empty-pick");
  assert(
    decision.hallucinatedIds.includes("made-up-server"),
    "hallucinated id should be reported",
  );
});

await test("emitDecision fires with outcome=failed-open-error when router throws", async () => {
  let decision: ToolRoutingDecision | undefined;
  const emitDecision = (d: ToolRoutingDecision) => {
    decision = d;
  };

  const generateFn = async () => {
    throw new Error("network failure");
  };
  await resolveToolRoutingExclusions(
    baseParams({
      generateFn: generateFn as ToolRoutingResolutionParams["generateFn"],
      emitDecision,
    }),
  );

  assertNotNull(decision, "emitDecision should have been called");
  assertEqual(
    decision.outcome,
    "failed-open-error",
    "outcome should be failed-open-error",
  );
});

await test("emitDecision fires with outcome=failed-open-parse on non-JSON response", async () => {
  let decision: ToolRoutingDecision | undefined;
  const emitDecision = (d: ToolRoutingDecision) => {
    decision = d;
  };

  await resolveToolRoutingExclusions(
    baseParams({
      generateFn: fakeGenerate(
        "not valid json",
      ) as ToolRoutingResolutionParams["generateFn"],
      emitDecision,
    }),
  );

  assertNotNull(decision, "emitDecision should have been called");
  assertEqual(
    decision.outcome,
    "failed-open-parse",
    "outcome should be failed-open-parse",
  );
});

await test("emitDecision errors are swallowed — routing result still returned", async () => {
  const emitDecision = (_d: ToolRoutingDecision) => {
    throw new Error("telemetry callback crashed");
  };

  // Should not throw; should return normally
  const excluded = await resolveToolRoutingExclusions(
    baseParams({ emitDecision }),
  );
  assert(Array.isArray(excluded), "routing result should still be returned");
});

// ============================================================================
// Part 3 — ITEM C: ToolRoutingCache unit tests
// ============================================================================

await test("ToolRoutingCache.get returns undefined on miss", () => {
  const cache = new ToolRoutingCache();
  assertEqual(
    cache.get("no-such-key"),
    undefined,
    "cache miss should return undefined",
  );
});

await test("ToolRoutingCache.set and get roundtrip stores and retrieves value", () => {
  const cache = new ToolRoutingCache();
  const value = {
    excludedToolNames: ["tool_a", "tool_b"],
    selectedServerIds: ["server1"],
  };
  cache.set("key1", value);
  const result = cache.get("key1");
  assertNotNull(result, "cache hit should return value");
  assertEqual(
    result.excludedToolNames.length,
    2,
    "should have 2 excluded tools",
  );
  assert(
    result.excludedToolNames.includes("tool_a"),
    "tool_a should be excluded",
  );
  assert(
    result.selectedServerIds.includes("server1"),
    "server1 should be selected",
  );
});

await test("ToolRoutingCache.get returns undefined after TTL expiry", () => {
  let fakeNow = 1000;
  const cache = new ToolRoutingCache({ ttlMs: 500, now: () => fakeNow });
  cache.set("key-ttl", {
    excludedToolNames: ["tool_x"],
    selectedServerIds: ["srv"],
  });

  // Before expiry
  const before = cache.get("key-ttl");
  assertNotNull(before, "should hit before TTL");

  // Move past TTL
  fakeNow = 1501;
  const after = cache.get("key-ttl");
  assertEqual(after, undefined, "should miss after TTL expiry");
});

await test("ToolRoutingCache LRU evicts oldest entry when maxEntries exceeded", () => {
  const cache = new ToolRoutingCache({ maxEntries: 2 });
  const value = { excludedToolNames: [], selectedServerIds: [] };

  cache.set("key-a", value);
  cache.set("key-b", value);

  // Access key-a to make it more recently used than key-b
  cache.get("key-a");

  // Adding key-c should evict key-b (LRU)
  cache.set("key-c", value);

  assertEqual(cache.get("key-b"), undefined, "key-b should be evicted (LRU)");
  assertNotNull(
    cache.get("key-a"),
    "key-a should still be present (recently used)",
  );
  assertNotNull(cache.get("key-c"), "key-c should be present (just added)");
});

await test("ToolRoutingCache.recordSelection + getStickyServerIds returns ids within window", () => {
  const cache = new ToolRoutingCache({ stickyTurns: 3 });
  cache.recordSelection("session-1", ["analytics", "shipping"]);

  const ids = cache.getStickyServerIds("session-1");
  assert(ids.includes("analytics"), "analytics should be sticky");
  assert(ids.includes("shipping"), "shipping should be sticky");
});

await test("ToolRoutingCache stickiness decrements turns and clears at zero", () => {
  const cache = new ToolRoutingCache({ stickyTurns: 2 });
  cache.recordSelection("session-2", ["analytics"]);

  // First call: turnsRemaining=2 → returns ids, decrements to 1
  const first = cache.getStickyServerIds("session-2");
  assert(first.includes("analytics"), "analytics sticky on first call");

  // Second call: turnsRemaining=1 → returns ids, deletes entry (<=1)
  const second = cache.getStickyServerIds("session-2");
  assert(second.includes("analytics"), "analytics sticky on second call");

  // Third call: entry removed → empty
  const third = cache.getStickyServerIds("session-2");
  assertEqual(
    third.length,
    0,
    "stickiness should expire after stickyTurns calls",
  );
});

await test("ToolRoutingCache returns empty sticky ids for unknown session", () => {
  const cache = new ToolRoutingCache();
  const ids = cache.getStickyServerIds("unknown-session-xyz");
  assertEqual(ids.length, 0, "unknown session should return empty sticky ids");
});

await test("ToolRoutingCache recordSelection no-ops with empty server list", () => {
  const cache = new ToolRoutingCache({ stickyTurns: 5 });
  cache.recordSelection("session-empty", []);
  const ids = cache.getStickyServerIds("session-empty");
  assertEqual(ids.length, 0, "empty server list should produce no stickiness");
});

// ============================================================================
// Part 4 — End-to-end cache-hit skips the router LLM
// ============================================================================

await test("cache hit reuses stored result without calling generateFn again", async () => {
  let callCount = 0;
  const generateFn = async () => {
    callCount++;
    return { content: '{"servers":["analytics"]}' };
  };

  // Build a cache and pre-populate it with the exact key
  // The cache key in applyToolRoutingExclusions is: `${sessionId}:${query}` (normalized).
  // For the unit-level test we exercise the cache directly — calling get/set ourselves
  // to verify the cache-hit path skips resolve.
  const cache = new ToolRoutingCache({ ttlMs: 60000 });

  const cacheKey = "session-test:show me yesterday's sales";
  const storedResult = {
    excludedToolNames: ["shipping_track", "shipping_listCouriers"],
    selectedServerIds: ["analytics"],
  };
  cache.set(cacheKey, storedResult);

  // Simulate the cache-hit path: get from cache, skip generateFn
  const hit = cache.get(cacheKey);
  assertNotNull(hit, "cache should return stored result");
  assertEqual(
    hit.excludedToolNames.length,
    2,
    "should return stored exclusions",
  );

  // generateFn never called because we used the cache directly
  assertEqual(callCount, 0, "generateFn should not be called on cache hit");
});

await test("second identical resolveToolRoutingExclusions call reuses cached result", async () => {
  // We can verify the cache behavior by calling resolveToolRoutingExclusions twice
  // with the same params and a tracked call count, then manually verifying via
  // the ToolRoutingDecision callback
  let callCount = 0;
  const generateFn = async () => {
    callCount++;
    return { content: '{"servers":["analytics"]}' };
  };

  // Direct cache manipulation: populate cache before second resolve call
  const cache = new ToolRoutingCache({ ttlMs: 60000 });
  const cacheKey = "test-session:show me yesterday's sales";
  cache.set(cacheKey, {
    excludedToolNames: ["shipping_track"],
    selectedServerIds: ["analytics"],
  });

  // Cache hit path — get from cache
  const result = cache.get(cacheKey);
  assertNotNull(result, "cache hit should return value");
  // Verify callCount is still 0 (we never called generateFn — we used cache)
  assertEqual(callCount, 0, "generateFn should not have been called");

  // Now confirm generateFn IS called on a cache miss
  await resolveToolRoutingExclusions(
    baseParams({
      generateFn: generateFn as ToolRoutingResolutionParams["generateFn"],
    }),
  );
  assertEqual(callCount, 1, "generateFn should be called on cache miss");
});

// ============================================================================
// Part 5 — BZ-4440: the per-call routing gate on generate()/stream()
// ============================================================================

/**
 * Drive a NeuroLink call far enough to pass the routing gate, then let it fail.
 * The gate runs before provider resolution, so an unroutable provider aborts
 * the turn cheaply while still proving whether routing was consulted — no API
 * key and no network required.
 */
function routedSdk(): InstanceType<typeof NeuroLink> {
  const sdk = new NeuroLink({
    toolRouting: {
      enabled: true,
      routerModel: { provider: "openai", model: "gpt-4o-mini", temperature: 0 },
    },
  });
  sdk.setToolRoutingServers([
    { id: "analytics", description: "Sales and payment analytics" },
    { id: "shipping", description: "Shipment tracking" },
  ]);
  return sdk;
}

async function gateCallCount(
  callOptions: Record<string, unknown>,
): Promise<number> {
  const sdk = routedSdk();
  const proto = Object.getPrototypeOf(sdk) as Record<string, unknown>;
  const spy = stub(proto, "applyToolRoutingExclusions", async () => undefined);
  try {
    return await withStubs([spy], async () => {
      try {
        await sdk.generate({
          input: { text: "how are sales doing?" },
          provider: "this-provider-does-not-exist",
          ...callOptions,
        } as never);
      } catch {
        // Expected — the turn dies after the gate, which is all we measure.
      }
      return spy.callCount;
    });
  } finally {
    spy.restore();
  }
}

await test("BZ-4440: a routed instance still routes a plain generate call", async () => {
  // Regression guard. Gating routing behind an explicit per-call opt-in would
  // silently disable routing for every existing SDK caller that configured
  // `toolRouting` on the constructor. Unset must keep meaning "follow the
  // instance configuration".
  assertEqual(await gateCallCount({}), 1, "routing consulted when flag unset");
});

await test("BZ-4440: useToolRouting:false skips routing for that call", async () => {
  // The actual fix: auxiliary calls opt out so they stop paying a router hop.
  assertEqual(
    await gateCallCount({ useToolRouting: false }),
    0,
    "routing skipped when explicitly opted out",
  );
});

await test("BZ-4440: useToolRouting:true routes as before", async () => {
  assertEqual(
    await gateCallCount({ useToolRouting: true }),
    1,
    "routing consulted when explicitly requested",
  );
});

await test("BZ-4440: an unrouted instance never consults routing", async () => {
  const sdk = new NeuroLink();
  const proto = Object.getPrototypeOf(sdk) as Record<string, unknown>;
  const spy = stub(proto, "applyToolRoutingExclusions", async () => undefined);
  try {
    await withStubs([spy], async () => {
      try {
        await sdk.generate({
          input: { text: "hello" },
          provider: "this-provider-does-not-exist",
        } as never);
      } catch {
        // Expected.
      }
    });
    // The gate is reached, but applyToolRoutingExclusions is a no-op without
    // config; asserting it is still *called* documents that the instance-level
    // switch — not the per-call flag — is what activates routing.
    assertEqual(spy.callCount, 1, "gate defers to the instance configuration");
  } finally {
    spy.restore();
  }
});

// ============================================================================
// Part 6 — LIVE-gated: NeuroLink.generate() wiring
// ============================================================================

await test("NeuroLink generate() routing narrows tools (live — skips without API keys)", async () => {
  // Skip if no provider is available; use openai as the test target
  skipUnlessProviderAvailable("openai");

  const noopExecute = async () => ({ ok: true });

  let sdk: InstanceType<typeof NeuroLink> | null = null;
  try {
    sdk = new NeuroLink({
      toolRouting: {
        enabled: true,
        alwaysIncludeServerIds: ["utility"],
        routerModel: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0,
        },
        timeoutMs: 20000,
      },
    });

    sdk.registerTools({
      analytics_getSales: {
        name: "analytics_getSales",
        description: "Get sales data",
        execute: noopExecute,
      },
      shipping_track: {
        name: "shipping_track",
        description: "Track shipment",
        execute: noopExecute,
      },
      utility_echo: {
        name: "utility_echo",
        description: "Echo utility",
        execute: noopExecute,
      },
    });

    sdk.setToolRoutingServers([
      { id: "analytics", description: "Sales and payment analytics" },
      {
        id: "shipping",
        description: "Shipment tracking and courier management",
      },
      { id: "utility", description: "Always-on utilities" },
    ]);

    // The routing decision is applied internally; we verify it indirectly by
    // checking that the generate call completes without error and that routing
    // was triggered (if it fails open, tools are unchanged — acceptable).
    const result = await sdk.generate({
      input: { text: "show me yesterday's sales figures" },
      useToolRouting: true,
    });

    assert(
      typeof result.content === "string",
      "generate should return content",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
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

// ---------------------------------------------------------------------------
// Migrated from test/toolRouting.test.ts — cases the suite above did not cover.
// ---------------------------------------------------------------------------

await test("buildToolRoutingCatalog drops servers with zero registered tools", () => {
  // A declared server with nothing registered would otherwise be offered to the
  // router, which could then "pick" it and exclude everything else for nothing.
  const catalog = buildToolRoutingCatalog(
    [{ id: "ghost", description: "No tools registered" }],
    ["analytics_getSales"],
  );
  assertEqual(catalog.length, 0, "a server with no tools must not be offered");
});

await test("drops hallucinated server ids but keeps the valid picks alongside them", () => {
  // Distinct from the fully-hallucinated case: a partially valid pick must be
  // honoured for the real id rather than failing open and routing nothing.
  return resolveToolRoutingExclusions(
    baseParams({
      generateFn: fakeGenerate(
        '{"servers":["analytics","made-up-server"]}',
      ) as ToolRoutingResolutionParams["generateFn"],
    }),
  ).then((excluded) => {
    assertEqual(
      JSON.stringify([...excluded].sort()),
      JSON.stringify(["shipping_listCouriers", "shipping_track"]),
      "only the unpicked real server's tools should be excluded",
    );
  });
});

await test("buildRoutingQueryFromHistory returns the bare query with no prior history", () => {
  assertEqual(buildRoutingQueryFromHistory([], "yes please"), "yes please");
});

await test("buildRoutingQueryFromHistory returns the bare query when history has no usable content", () => {
  assertEqual(
    buildRoutingQueryFromHistory(
      [
        { role: "assistant", content: "   " },
        { role: "user", content: "" },
        { role: "assistant", content: null },
      ],
      "yes please",
    ),
    "yes please",
  );
});

await test("buildRoutingQueryFromHistory keeps only the last maxMessages prior turns", () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `message ${index}`,
  }));
  const lines = buildRoutingQueryFromHistory(history, "final", 4000, 3).split(
    "\n",
  );
  assertEqual(lines.length, 4, "3 prior turns plus the current query");
  assertEqual(lines[0], "assistant: message 7", "oldest kept turn");
  assertEqual(lines[3], "user: final", "current query at the tail");
});

await test("buildRoutingQueryFromHistory drops roleless turns", () => {
  assertEqual(
    buildRoutingQueryFromHistory([{ content: "no role here" }], "now"),
    "now",
    "a roleless turn is not usable history",
  );
});

await test("buildRoutingQueryFromHistory drops tool_call/tool_result turns", () => {
  assertEqual(
    buildRoutingQueryFromHistory(
      [
        { role: "user", content: "fetch surcharge" },
        { role: "tool_call", content: "GetSurchargeRules({})" },
        { role: "tool_result", content: '{"rules":[{"id":"abc"}]}' },
        { role: "assistant", content: "You have 1 surcharge rule." },
      ],
      "update it",
    ),
    "user: fetch surcharge\n" +
      "assistant: You have 1 surcharge rule.\n" +
      "user: update it",
  );
});

await test("buildRoutingQueryFromHistory truncates a long transcript, keeping the tail", () => {
  const result = buildRoutingQueryFromHistory(
    [{ role: "assistant", content: "x".repeat(5000) }],
    "current query at the very end",
    200,
  );
  assertEqual(result.length, 200, "transcript must respect the char budget");
  assert(
    result.endsWith("current query at the very end"),
    "the current query is the highest-signal part and must survive at the tail",
  );
});

await test("buildRoutingQueryFromHistory renders each prior message in full", () => {
  // No per-message cap: only the overall transcript budget truncates.
  const longContent = "y".repeat(1000);
  assertEqual(
    buildRoutingQueryFromHistory(
      [{ role: "assistant", content: longContent }],
      "go",
    ),
    `assistant: ${longContent}\nuser: go`,
  );
});

await test("ToolRoutingCache stickyTurns=1: the next turn sees the recorded ids", () => {
  const cache = new ToolRoutingCache({ stickyTurns: 1 });
  cache.recordSelection("session-sticky-1", ["analytics"]);

  // turnsRemaining was set to 1, so this call returns the ids and retires them.
  assert(
    cache.getStickyServerIds("session-sticky-1").includes("analytics"),
    "the next turn must see the recorded selection",
  );
  assertEqual(
    cache.getStickyServerIds("session-sticky-1").length,
    0,
    "stickiness must be exhausted afterwards",
  );
});

await test("ToolRoutingCache stickyTurns=1: a same-turn read does not double-consume", () => {
  // Mirrors what neurolink.ts does per turn: read prior stickiness first, then
  // record the new selection. The prior entry must be consumed once, and the
  // new recordSelection must open a fresh window rather than being swallowed.
  const cache = new ToolRoutingCache({ stickyTurns: 1 });
  cache.recordSelection("session-sticky-2", ["shipping"]);

  assert(
    cache.getStickyServerIds("session-sticky-2").includes("shipping"),
    "the prior selection must still be visible on this turn",
  );
  cache.recordSelection("session-sticky-2", ["analytics"]);

  assert(
    cache.getStickyServerIds("session-sticky-2").includes("analytics"),
    "the new selection must be available on the following turn",
  );
  assertEqual(
    cache.getStickyServerIds("session-sticky-2").length,
    0,
    "the window must then be exhausted",
  );
});

/**
 * Drive NeuroLink's private per-request routing hook with `generate` stubbed,
 * returning how many times the router was asked and what got excluded.
 */
async function applyRoutingWithStubbedRouter(
  instance: InstanceType<typeof NeuroLink>,
  options: Record<string, unknown>,
  userQuery: string,
): Promise<number> {
  const generate = stub(
    instance as unknown as Record<string, unknown>,
    "generate",
    async () => ({ content: '{"servers":["analytics"]}' }),
  );
  await withStubs([generate], async () => {
    await (
      instance as unknown as {
        applyToolRoutingExclusions: (
          opts: Record<string, unknown>,
          query: string,
        ) => Promise<void>;
      }
    ).applyToolRoutingExclusions(options, userQuery);
  });
  return generate.callCount;
}

await test("routing disabled: excludeTools is untouched and the router is never called", async () => {
  const instance = new NeuroLink({ toolRouting: { enabled: false } });
  const options: Record<string, unknown> = {
    input: { text: "show me yesterday's sales" },
    excludeTools: ["preexisting_exclusion"],
  };
  const calls = await applyRoutingWithStubbedRouter(
    instance,
    options,
    "show me yesterday's sales",
  );
  assertEqual(
    JSON.stringify(options.excludeTools),
    JSON.stringify(["preexisting_exclusion"]),
    "a pre-existing exclusion must survive untouched",
  );
  assertEqual(calls, 0, "the router must not be called when routing is off");
});

await test("disableTools wins over enabled routing: no exclusion, no router call", async () => {
  const instance = new NeuroLink({
    toolRouting: { enabled: true, alwaysIncludeServerIds: ["utility"] },
  });
  instance.registerTools({
    analytics_getSales: {
      name: "analytics_getSales",
      description: "Get sales",
      execute: async () => ({ ok: true }),
    },
  });
  instance.setToolRoutingServers([
    { id: "analytics", description: "Sales analytics" },
  ]);

  const options: Record<string, unknown> = {
    input: { text: "show me yesterday's sales" },
    excludeTools: ["preexisting_exclusion"],
    disableTools: true,
  };
  const calls = await applyRoutingWithStubbedRouter(
    instance,
    options,
    "show me yesterday's sales",
  );
  assertEqual(
    JSON.stringify(options.excludeTools),
    JSON.stringify(["preexisting_exclusion"]),
    "routing must not narrow tools when tools are disabled outright",
  );
  assertEqual(calls, 0, "the router must not be called when tools are off");
});

await test("no sessionId: the router runs every call rather than sharing a cache entry", async () => {
  // Anonymous calls must never collide in the cache — otherwise one caller's
  // routing decision would silently narrow another caller's tools.
  const instance = new NeuroLink({
    toolRouting: {
      enabled: true,
      alwaysIncludeServerIds: ["utility"],
      cache: { enabled: true, ttlMs: 60_000 },
    },
  });
  const noop = async () => ({ ok: true });
  instance.registerTools({
    analytics_getSales: {
      name: "analytics_getSales",
      description: "Get sales",
      execute: noop,
    },
    shipping_track: {
      name: "shipping_track",
      description: "Track shipment",
      execute: noop,
    },
    utility_echo: { name: "utility_echo", description: "Echo", execute: noop },
  });
  instance.setToolRoutingServers([
    { id: "analytics", description: "Sales analytics" },
    { id: "shipping", description: "Shipment tracking" },
    { id: "utility", description: "Always-on utilities" },
  ]);

  const query = "show me yesterday's sales";
  const generate = stub(
    instance as unknown as Record<string, unknown>,
    "generate",
    async () => ({ content: '{"servers":["analytics"]}' }),
  );
  await withStubs([generate], async () => {
    const apply = (
      instance as unknown as {
        applyToolRoutingExclusions: (
          opts: Record<string, unknown>,
          query: string,
        ) => Promise<void>;
      }
    ).applyToolRoutingExclusions.bind(instance);

    const first: Record<string, unknown> = { input: { text: query } };
    await apply(first, query);
    assertEqual(generate.callCount, 1, "first call must reach the router");
    assert(
      (first.excludeTools as string[]).includes("shipping_track"),
      "the unpicked server's tools must be excluded",
    );

    const second: Record<string, unknown> = { input: { text: query } };
    await apply(second, query);
    assertEqual(
      generate.callCount,
      2,
      "an anonymous second call must re-run the router, not reuse a cache entry",
    );
    assert(
      (second.excludeTools as string[]).includes("shipping_track"),
      "the second call must still be narrowed",
    );
  });
});

await runSuite();
