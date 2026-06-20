/**
 * Unit tests for pre-call tool routing (src/lib/core/toolRouting.ts).
 *
 * Run:
 *   pnpm exec vitest run test/toolRouting.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import {
  buildToolRoutingCatalog,
  buildRoutingQueryFromHistory,
  resolveToolRoutingExclusions,
} from "../src/lib/core/toolRouting.js";
import { ToolRoutingCache } from "../src/lib/core/toolRoutingCache.js";
import type {
  GenerateResult,
  ToolRoutingCatalogEntry,
  ToolRoutingDecision,
  ToolRoutingResolutionParams,
} from "../src/lib/types/index.js";

const generateResultWith = (content: string): GenerateResult =>
  ({ content }) as GenerateResult;

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

const baseParams = (
  overrides: Partial<ToolRoutingResolutionParams>,
): ToolRoutingResolutionParams => ({
  catalog: CATALOG,
  alwaysIncludeServerIds: ["utility"],
  userQuery: "show me yesterday's sales",
  routerModel: { provider: "vertex", model: "gemini-3-flash-preview" },
  timeoutMs: 15000,
  generateFn: vi
    .fn()
    .mockResolvedValue(generateResultWith('{"servers":["analytics"]}')),
  ...overrides,
});

describe("buildToolRoutingCatalog", () => {
  it("groups registered tool names by `${serverId}_` prefix", () => {
    const catalog = buildToolRoutingCatalog(
      [
        { id: "analytics", description: "Analytics" },
        { id: "shipping", description: "Shipping" },
      ],
      ["analytics_getSales", "shipping_track", "unrelated_tool"],
    );

    expect(catalog).toEqual([
      {
        id: "analytics",
        description: "Analytics",
        toolNames: ["analytics_getSales"],
      },
      {
        id: "shipping",
        description: "Shipping",
        toolNames: ["shipping_track"],
      },
    ]);
  });

  it("drops servers that have zero registered tools", () => {
    const catalog = buildToolRoutingCatalog(
      [{ id: "ghost", description: "No tools registered" }],
      ["analytics_getSales"],
    );

    expect(catalog).toEqual([]);
  });
});

describe("resolveToolRoutingExclusions", () => {
  it("excludes the tools of unpicked routable servers only", async () => {
    const excluded = await resolveToolRoutingExclusions(baseParams({}));

    expect(excluded).toEqual(["shipping_track", "shipping_listCouriers"]);
  });

  it("never offers always-include servers to the router nor excludes them", async () => {
    const generateFn = vi
      .fn()
      .mockResolvedValue(generateResultWith('{"servers":["analytics"]}'));
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ generateFn }),
    );

    const routerPrompt = (
      generateFn.mock.calls[0][0] as { input: { text: string } }
    ).input.text;
    expect(routerPrompt).not.toContain("utility");
    expect(excluded).not.toContain("utility_echo");
  });

  it("parses markdown-fenced router output", async () => {
    const generateFn = vi
      .fn()
      .mockResolvedValue(
        generateResultWith('```json\n{"servers":["shipping"]}\n```'),
      );
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ generateFn }),
    );

    expect(excluded).toEqual(["analytics_getSales", "analytics_getPayments"]);
  });

  it("drops hallucinated server ids but keeps valid picks", async () => {
    const generateFn = vi
      .fn()
      .mockResolvedValue(
        generateResultWith('{"servers":["analytics","made-up-server"]}'),
      );
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ generateFn }),
    );

    expect(excluded).toEqual(["shipping_track", "shipping_listCouriers"]);
  });

  it("fails open on a missing user query without calling the router", async () => {
    const generateFn = vi.fn();
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ userQuery: "", generateFn }),
    );

    expect(excluded).toEqual([]);
    expect(generateFn).not.toHaveBeenCalled();
  });

  it("fails open when <=1 routable server remains", async () => {
    const generateFn = vi.fn();
    const excluded = await resolveToolRoutingExclusions(
      baseParams({
        catalog: CATALOG.slice(1), // shipping + utility; utility is always-include
        generateFn,
      }),
    );

    expect(excluded).toEqual([]);
    expect(generateFn).not.toHaveBeenCalled();
  });

  it("fails open on non-JSON router output", async () => {
    const generateFn = vi
      .fn()
      .mockResolvedValue(generateResultWith("sorry, I cannot help with that"));
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ generateFn }),
    );

    expect(excluded).toEqual([]);
  });

  it("fails open on a schema-invalid router pick", async () => {
    const generateFn = vi
      .fn()
      .mockResolvedValue(generateResultWith('{"servers":"analytics"}'));
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ generateFn }),
    );

    expect(excluded).toEqual([]);
  });

  it("fails open on an empty or fully-hallucinated pick", async () => {
    const generateFn = vi
      .fn()
      .mockResolvedValue(generateResultWith('{"servers":["made-up-server"]}'));
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ generateFn }),
    );

    expect(excluded).toEqual([]);
  });

  it("fails open when the router call throws", async () => {
    const generateFn = vi.fn().mockRejectedValue(new Error("router timeout"));
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ generateFn }),
    );

    expect(excluded).toEqual([]);
  });
});

describe("NeuroLink stream() tool routing wiring", () => {
  it("appends unpicked servers' tools to options.excludeTools via the private hook", async () => {
    const { NeuroLink } = await import("../src/lib/neurolink.js");
    const instance = new NeuroLink({
      toolRouting: { enabled: true, alwaysIncludeServerIds: ["utility"] },
    });

    const noopExecute = async () => ({ ok: true });
    instance.registerTools({
      analytics_getSales: {
        name: "analytics_getSales",
        description: "Get sales",
        execute: noopExecute,
      },
      shipping_track: {
        name: "shipping_track",
        description: "Track shipment",
        execute: noopExecute,
      },
      utility_echo: {
        name: "utility_echo",
        description: "Echo",
        execute: noopExecute,
      },
    });
    instance.setToolRoutingServers([
      { id: "analytics", description: "Sales analytics" },
      { id: "shipping", description: "Shipment tracking" },
      { id: "utility", description: "Always-on utilities" },
    ]);

    vi.spyOn(instance, "generate").mockResolvedValue(
      generateResultWith('{"servers":["analytics"]}'),
    );

    const options = {
      input: { text: "show me yesterday's sales" },
      excludeTools: ["preexisting_exclusion"],
    } as import("../src/lib/types/index.js").StreamOptions;

    await (
      instance as unknown as {
        applyToolRoutingExclusions(
          streamOptions: typeof options,
          userQuery: string,
        ): Promise<void>;
      }
    ).applyToolRoutingExclusions(options, "show me yesterday's sales");

    expect(options.excludeTools).toEqual([
      "preexisting_exclusion",
      "shipping_track",
    ]);
  });

  it("does not mutate excludeTools or call the router when toolRouting.enabled is false", async () => {
    const { NeuroLink } = await import("../src/lib/neurolink.js");
    const instance = new NeuroLink({
      toolRouting: { enabled: false },
    });

    const generateSpy = vi
      .spyOn(instance, "generate")
      .mockResolvedValue(generateResultWith('{"servers":[]}'));

    const options = {
      input: { text: "show me yesterday's sales" },
      excludeTools: ["preexisting_exclusion"],
    } as import("../src/lib/types/index.js").StreamOptions;

    const originalExcludeTools = [...(options.excludeTools ?? [])];

    await (
      instance as unknown as {
        applyToolRoutingExclusions(
          streamOptions: typeof options,
          userQuery: string,
        ): Promise<void>;
      }
    ).applyToolRoutingExclusions(options, "show me yesterday's sales");

    expect(options.excludeTools).toEqual(originalExcludeTools);
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("does not mutate excludeTools or call the router when disableTools is true (even with routing enabled)", async () => {
    const { NeuroLink } = await import("../src/lib/neurolink.js");
    const instance = new NeuroLink({
      toolRouting: { enabled: true, alwaysIncludeServerIds: ["utility"] },
    });

    const noopExecute = async () => ({ ok: true });
    instance.registerTools({
      analytics_getSales: {
        name: "analytics_getSales",
        description: "Get sales",
        execute: noopExecute,
      },
    });
    instance.setToolRoutingServers([
      { id: "analytics", description: "Sales analytics" },
    ]);

    const generateSpy = vi
      .spyOn(instance, "generate")
      .mockResolvedValue(generateResultWith('{"servers":["analytics"]}'));

    const options = {
      input: { text: "show me yesterday's sales" },
      excludeTools: ["preexisting_exclusion"],
      disableTools: true,
    } as import("../src/lib/types/index.js").StreamOptions;

    const originalExcludeTools = [...(options.excludeTools ?? [])];

    await (
      instance as unknown as {
        applyToolRoutingExclusions(
          streamOptions: typeof options,
          userQuery: string,
        ): Promise<void>;
      }
    ).applyToolRoutingExclusions(options, "show me yesterday's sales");

    expect(options.excludeTools).toEqual(originalExcludeTools);
    expect(generateSpy).not.toHaveBeenCalled();
  });
});

describe("buildRoutingQueryFromHistory", () => {
  it("returns the bare query when there is no prior history", () => {
    expect(buildRoutingQueryFromHistory([], "yes please")).toBe("yes please");
  });

  it("returns the bare query when history has no usable content", () => {
    const result = buildRoutingQueryFromHistory(
      [
        { role: "assistant", content: "   " },
        { role: "user", content: "" },
        { role: "assistant", content: null },
      ],
      "yes please",
    );
    expect(result).toBe("yes please");
  });

  it("folds prior turns into a transcript with the current query at the tail", () => {
    const result = buildRoutingQueryFromHistory(
      [
        { role: "user", content: "can you create a surcharge rule" },
        { role: "assistant", content: "Which payment type? COD or PARTIAL?" },
      ],
      "yes please",
    );
    expect(result).toBe(
      "user: can you create a surcharge rule\n" +
        "assistant: Which payment type? COD or PARTIAL?\n" +
        "user: yes please",
    );
  });

  it("keeps only the last `maxMessages` prior turns", () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message ${index}`,
    }));
    const result = buildRoutingQueryFromHistory(history, "final", 4000, 3);
    const lines = result.split("\n");
    // 3 prior turns + the appended current query
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe("assistant: message 7");
    expect(lines[3]).toBe("user: final");
  });

  it("drops turns whose role is not user/assistant (roleless)", () => {
    const result = buildRoutingQueryFromHistory(
      [{ content: "no role here" }],
      "now",
    );
    // A roleless turn is not usable user/assistant history → bare query.
    expect(result).toBe("now");
  });

  it("drops tool_call/tool_result turns, keeping only user/assistant", () => {
    const result = buildRoutingQueryFromHistory(
      [
        { role: "user", content: "fetch surcharge" },
        { role: "tool_call", content: "GetSurchargeRules({})" },
        { role: "tool_result", content: '{"rules":[{"id":"abc"}]}' },
        { role: "assistant", content: "You have 1 surcharge rule." },
      ],
      "update it",
    );
    expect(result).toBe(
      "user: fetch surcharge\n" +
        "assistant: You have 1 surcharge rule.\n" +
        "user: update it",
    );
  });

  it("truncates an overly long transcript keeping the most recent tail", () => {
    const longContent = "x".repeat(5000);
    const result = buildRoutingQueryFromHistory(
      [{ role: "assistant", content: longContent }],
      "current query at the very end",
      200,
    );
    expect(result.length).toBe(200);
    // The current query survives at the tail — it's the highest-signal part.
    expect(result.endsWith("current query at the very end")).toBe(true);
  });

  it("renders each prior message in full (no per-message cap)", () => {
    const longContent = "y".repeat(1000);
    const result = buildRoutingQueryFromHistory(
      [{ role: "assistant", content: longContent }],
      "go",
    );
    expect(result).toBe(`assistant: ${longContent}\nuser: go`);
  });
});

// ---------------------------------------------------------------------------
// ITEM E — emitDecision callback shape
// ---------------------------------------------------------------------------

describe("emitDecision callback (ITEM E)", () => {
  it("fires with outcome=applied and correct fields on a successful routing", async () => {
    let decision: ToolRoutingDecision | undefined;
    const emitDecision = (d: ToolRoutingDecision): void => {
      decision = d;
    };

    const excluded = await resolveToolRoutingExclusions(
      baseParams({ emitDecision }),
    );

    expect(decision).toBeDefined();
    expect(decision?.outcome).toBe("applied");
    expect(decision?.selectedServerIds).toContain("analytics");
    expect(decision?.excludedServerIds).toContain("shipping");
    expect(decision?.cacheHit).toBe(false);
    expect(typeof decision?.durationMs).toBe("number");
    expect(decision?.durationMs).toBeGreaterThanOrEqual(0);
    expect(decision?.excludedToolCount).toBe(excluded.length);
    expect(Array.isArray(decision?.hallucinatedIds)).toBe(true);
  });

  it("fires with outcome=skipped-no-query when userQuery is empty", async () => {
    let decision: ToolRoutingDecision | undefined;
    const emitDecision = (d: ToolRoutingDecision): void => {
      decision = d;
    };

    await resolveToolRoutingExclusions(
      baseParams({ userQuery: "", emitDecision }),
    );

    expect(decision?.outcome).toBe("skipped-no-query");
    expect(decision?.selectedServerIds).toEqual([]);
    expect(decision?.excludedToolCount).toBe(0);
    expect(decision?.cacheHit).toBe(false);
  });

  it("fires with outcome=empty-pick when all router picks are hallucinated", async () => {
    let decision: ToolRoutingDecision | undefined;
    const emitDecision = (d: ToolRoutingDecision): void => {
      decision = d;
    };

    await resolveToolRoutingExclusions(
      baseParams({
        generateFn: vi
          .fn()
          .mockResolvedValue(
            generateResultWith('{"servers":["made-up-server"]}'),
          ),
        emitDecision,
      }),
    );

    expect(decision?.outcome).toBe("empty-pick");
    expect(decision?.hallucinatedIds).toContain("made-up-server");
  });

  it("fires with outcome=failed-open-error when the router throws", async () => {
    let decision: ToolRoutingDecision | undefined;
    const emitDecision = (d: ToolRoutingDecision): void => {
      decision = d;
    };

    await resolveToolRoutingExclusions(
      baseParams({
        generateFn: vi.fn().mockRejectedValue(new Error("network failure")),
        emitDecision,
      }),
    );

    expect(decision?.outcome).toBe("failed-open-error");
  });

  it("fires with outcome=failed-open-parse when router returns non-JSON", async () => {
    let decision: ToolRoutingDecision | undefined;
    const emitDecision = (d: ToolRoutingDecision): void => {
      decision = d;
    };

    await resolveToolRoutingExclusions(
      baseParams({
        generateFn: vi
          .fn()
          .mockResolvedValue(generateResultWith("sorry I cannot help")),
        emitDecision,
      }),
    );

    expect(decision?.outcome).toBe("failed-open-parse");
  });

  it("swallows errors thrown inside emitDecision — routing result still returned", async () => {
    const emitDecision = (_d: ToolRoutingDecision): void => {
      throw new Error("telemetry callback crashed");
    };

    // Must not throw; should still return the exclusion list
    const excluded = await resolveToolRoutingExclusions(
      baseParams({ emitDecision }),
    );
    expect(Array.isArray(excluded)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ITEM C — ToolRoutingCache unit tests
// ---------------------------------------------------------------------------

describe("ToolRoutingCache (ITEM C)", () => {
  it("returns undefined on a cache miss", () => {
    const cache = new ToolRoutingCache();
    expect(cache.get("no-such-key")).toBeUndefined();
  });

  it("set/get roundtrip stores and retrieves the value", () => {
    const cache = new ToolRoutingCache();
    const value = {
      excludedToolNames: ["tool_a", "tool_b"],
      selectedServerIds: ["server1"],
    };
    cache.set("key1", value);
    const result = cache.get("key1");
    expect(result).toBeDefined();
    expect(result?.excludedToolNames).toEqual(["tool_a", "tool_b"]);
    expect(result?.selectedServerIds).toEqual(["server1"]);
  });

  it("returns undefined after TTL expiry (injected clock)", () => {
    let fakeNow = 1000;
    const cache = new ToolRoutingCache({ ttlMs: 500, now: () => fakeNow });
    cache.set("key-ttl", {
      excludedToolNames: ["tool_x"],
      selectedServerIds: ["srv"],
    });

    // Before expiry — should hit
    expect(cache.get("key-ttl")).toBeDefined();

    // Past expiry
    fakeNow = 1501;
    expect(cache.get("key-ttl")).toBeUndefined();
  });

  it("evicts the LRU entry when maxEntries is exceeded", () => {
    const cache = new ToolRoutingCache({ maxEntries: 2 });
    const value = { excludedToolNames: [], selectedServerIds: [] };

    cache.set("key-a", value);
    cache.set("key-b", value);

    // Access key-a to make it more recently used
    cache.get("key-a");

    // Adding key-c should evict key-b (LRU)
    cache.set("key-c", value);

    expect(cache.get("key-b")).toBeUndefined();
    expect(cache.get("key-a")).toBeDefined();
    expect(cache.get("key-c")).toBeDefined();
  });

  it("recordSelection + getStickyServerIds returns ids within the window", () => {
    const cache = new ToolRoutingCache({ stickyTurns: 3 });
    cache.recordSelection("session-1", ["analytics", "shipping"]);

    const ids = cache.getStickyServerIds("session-1");
    expect(ids).toContain("analytics");
    expect(ids).toContain("shipping");
  });

  it("stickiness decrements turns and clears the entry at zero", () => {
    const cache = new ToolRoutingCache({ stickyTurns: 2 });
    cache.recordSelection("session-2", ["analytics"]);

    // Turn 1: turnsRemaining 2 → 1
    expect(cache.getStickyServerIds("session-2")).toContain("analytics");
    // Turn 2: turnsRemaining 1 → 0 (entry deleted)
    expect(cache.getStickyServerIds("session-2")).toContain("analytics");
    // Turn 3: entry deleted
    expect(cache.getStickyServerIds("session-2")).toEqual([]);
  });

  it("returns empty sticky ids for an unknown session", () => {
    const cache = new ToolRoutingCache();
    expect(cache.getStickyServerIds("unknown-session-xyz")).toEqual([]);
  });

  it("cache hit skips the generateFn — call count stays at 0", async () => {
    let callCount = 0;
    const generateFn = vi.fn(async () => {
      callCount++;
      return generateResultWith('{"servers":["analytics"]}');
    });

    // Manually pre-populate a cache and verify get() returns without hitting generateFn
    const cache = new ToolRoutingCache({ ttlMs: 60000 });
    cache.set("routing-key", {
      excludedToolNames: ["shipping_track"],
      selectedServerIds: ["analytics"],
    });

    const hit = cache.get("routing-key");
    expect(hit).toBeDefined();
    expect(hit?.excludedToolNames).toEqual(["shipping_track"]);
    expect(callCount).toBe(0);

    // On a true miss generateFn is called
    await resolveToolRoutingExclusions(baseParams({ generateFn }));
    expect(callCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ITEM A — NeuroLink generate() wiring (mirrors the existing stream() test)
// ---------------------------------------------------------------------------

describe("NeuroLink generate() tool routing wiring (ITEM A)", () => {
  it("appends unpicked servers' tools to options.excludeTools via generate path hook", async () => {
    const { NeuroLink: NL } = await import("../src/lib/neurolink.js");
    const instance = new NL({
      toolRouting: { enabled: true, alwaysIncludeServerIds: ["utility"] },
    });

    const noopExecute = async (): Promise<{ ok: boolean }> => ({ ok: true });
    instance.registerTools({
      analytics_getSales: {
        name: "analytics_getSales",
        description: "Get sales",
        execute: noopExecute,
      },
      shipping_track: {
        name: "shipping_track",
        description: "Track shipment",
        execute: noopExecute,
      },
      utility_echo: {
        name: "utility_echo",
        description: "Echo",
        execute: noopExecute,
      },
    });
    instance.setToolRoutingServers([
      { id: "analytics", description: "Sales analytics" },
      { id: "shipping", description: "Shipment tracking" },
      { id: "utility", description: "Always-on utilities" },
    ]);

    vi.spyOn(instance, "generate").mockResolvedValue(
      generateResultWith('{"servers":["analytics"]}'),
    );

    // Use GenerateOptions shape (same underlying hook)
    const options = {
      input: { text: "show me yesterday's sales" },
      excludeTools: ["preexisting_exclusion"],
    } as import("../src/lib/types/index.js").GenerateOptions;

    await (
      instance as unknown as {
        applyToolRoutingExclusions(
          opts: typeof options,
          userQuery: string,
        ): Promise<void>;
      }
    ).applyToolRoutingExclusions(options, "show me yesterday's sales");

    expect(options.excludeTools).toEqual([
      "preexisting_exclusion",
      "shipping_track",
    ]);
  });
});

// ---------------------------------------------------------------------------
// ITEM C — cache hit via applyToolRoutingExclusions integration path
// Verifies that calling applyToolRoutingExclusions twice with the same
// sessionId+query uses the cache on the second call (generateFn called once).
// ---------------------------------------------------------------------------

describe("ToolRoutingCache — applyToolRoutingExclusions integration path (ITEM C)", () => {
  it("generateFn is called once; second call uses cache and populates options.excludeTools", async () => {
    const { NeuroLink: NL } = await import("../src/lib/neurolink.js");

    let generateCallCount = 0;
    const instance = new NL({
      toolRouting: {
        enabled: true,
        alwaysIncludeServerIds: ["utility"],
        cache: { enabled: true, ttlMs: 60_000 },
      },
    });

    const noopExecute = async (): Promise<{ ok: boolean }> => ({ ok: true });
    instance.registerTools({
      analytics_getSales: {
        name: "analytics_getSales",
        description: "Get sales",
        execute: noopExecute,
      },
      shipping_track: {
        name: "shipping_track",
        description: "Track shipment",
        execute: noopExecute,
      },
      utility_echo: {
        name: "utility_echo",
        description: "Echo",
        execute: noopExecute,
      },
    });
    instance.setToolRoutingServers([
      { id: "analytics", description: "Sales analytics" },
      { id: "shipping", description: "Shipment tracking" },
      { id: "utility", description: "Always-on utilities" },
    ]);

    // Spy on generate: each real router invocation increments the counter.
    vi.spyOn(instance, "generate").mockImplementation(async () => {
      generateCallCount++;
      return generateResultWith('{"servers":["analytics"]}');
    });

    type ApplyFn = (
      opts: import("../src/lib/types/index.js").GenerateOptions,
      userQuery: string,
    ) => Promise<void>;

    const applyExclusions = (
      instance as unknown as { applyToolRoutingExclusions: ApplyFn }
    ).applyToolRoutingExclusions.bind(instance);

    const sessionId = "cache-integration-test-session";
    const query = "show me yesterday's sales";

    // First call — cache miss; router LLM must be invoked once.
    const opts1 = {
      input: { text: query },
      context: { sessionId },
    } as import("../src/lib/types/index.js").GenerateOptions;
    await applyExclusions(opts1, query);

    expect(generateCallCount).toBe(1);
    expect(opts1.excludeTools).toContain("shipping_track");

    // Second call with the same sessionId+query — must hit the cache.
    const opts2 = {
      input: { text: query },
      context: { sessionId },
    } as import("../src/lib/types/index.js").GenerateOptions;
    await applyExclusions(opts2, query);

    // generateFn must NOT have been called again (cache hit).
    expect(generateCallCount).toBe(1);
    // options.excludeTools must still be populated from the cached result.
    expect(opts2.excludeTools).toContain("shipping_track");
  });

  // Regression for the MAJOR empty-sessionId finding: without a sessionId the
  // cache key is undefined, so two otherwise-identical calls must NOT share a
  // cached entry (no cross-session ":query" namespace collision).
  it("does NOT cache when sessionId is absent — router runs on every call", async () => {
    const { NeuroLink: NL } = await import("../src/lib/neurolink.js");

    let generateCallCount = 0;
    const instance = new NL({
      toolRouting: {
        enabled: true,
        alwaysIncludeServerIds: ["utility"],
        cache: { enabled: true, ttlMs: 60_000 },
      },
    });

    const noopExecute = async (): Promise<{ ok: boolean }> => ({ ok: true });
    instance.registerTools({
      analytics_getSales: {
        name: "analytics_getSales",
        description: "Get sales",
        execute: noopExecute,
      },
      shipping_track: {
        name: "shipping_track",
        description: "Track shipment",
        execute: noopExecute,
      },
      utility_echo: {
        name: "utility_echo",
        description: "Echo",
        execute: noopExecute,
      },
    });
    instance.setToolRoutingServers([
      { id: "analytics", description: "Sales analytics" },
      { id: "shipping", description: "Shipment tracking" },
      { id: "utility", description: "Always-on utilities" },
    ]);

    vi.spyOn(instance, "generate").mockImplementation(async () => {
      generateCallCount++;
      return generateResultWith('{"servers":["analytics"]}');
    });

    type ApplyFn = (
      opts: import("../src/lib/types/index.js").GenerateOptions,
      userQuery: string,
    ) => Promise<void>;
    const applyExclusions = (
      instance as unknown as { applyToolRoutingExclusions: ApplyFn }
    ).applyToolRoutingExclusions.bind(instance);

    const query = "show me yesterday's sales";
    // No context.sessionId on either call.
    const opts1 = {
      input: { text: query },
    } as import("../src/lib/types/index.js").GenerateOptions;
    await applyExclusions(opts1, query);
    expect(generateCallCount).toBe(1);
    expect(opts1.excludeTools).toContain("shipping_track");

    const opts2 = {
      input: { text: query },
    } as import("../src/lib/types/index.js").GenerateOptions;
    await applyExclusions(opts2, query);

    // Router MUST run again — anonymous calls never share a cache entry.
    expect(generateCallCount).toBe(2);
    expect(opts2.excludeTools).toContain("shipping_track");
  });
});

// ---------------------------------------------------------------------------
// Stickiness off-by-one regression test
// stickyTurns=1: the NEXT turn (turn 2) must benefit from stickiness, not
// turn 1 itself (which produced the selection). This validates the fix that
// moves getStickyServerIds before recordSelection in neurolink.ts.
// ---------------------------------------------------------------------------

describe("Stickiness off-by-one fix — stickyTurns=1 activates on the next turn", () => {
  it("stickyTurns=1: turn-2 getStickyServerIds returns the ids from turn-1 recordSelection", () => {
    const cache = new ToolRoutingCache({ stickyTurns: 1 });

    // Turn 1: router runs, recordSelection is called.
    cache.recordSelection("session-sticky-1", ["analytics"]);

    // Turn 2: getStickyServerIds is called BEFORE any new recordSelection.
    // With stickyTurns=1, turnsRemaining was set to 1 — this call must return
    // the ids (and then delete the entry, since 1 >= 1).
    const stickyIds = cache.getStickyServerIds("session-sticky-1");
    expect(stickyIds).toContain("analytics");

    // Turn 3: entry is gone — stickiness exhausted.
    expect(cache.getStickyServerIds("session-sticky-1")).toEqual([]);
  });

  it("stickyTurns=1: calling getStickyServerIds on the same turn as recordSelection does not double-consume the window", () => {
    // This test mirrors what neurolink.ts does: getStickyServerIds (prior stickiness)
    // then recordSelection (new selection for next N turns).
    // The fix ensures that getStickyServerIds for a prior-turn entry is consumed
    // first, and the new recordSelection creates a fresh window.
    const cache = new ToolRoutingCache({ stickyTurns: 1 });

    // Prior turn: entry from turn 0 with 1 turn remaining.
    cache.recordSelection("session-sticky-2", ["shipping"]);

    // Current turn (turn 1): apply prior-turn stickiness first, then record new selection.
    const priorStickyIds = cache.getStickyServerIds("session-sticky-2"); // consumes turn-0 entry
    expect(priorStickyIds).toContain("shipping"); // prior selection is still visible

    cache.recordSelection("session-sticky-2", ["analytics"]); // new selection for next turn

    // Next turn (turn 2): new selection should be available.
    const nextStickyIds = cache.getStickyServerIds("session-sticky-2");
    expect(nextStickyIds).toContain("analytics");

    // Turn after that: window exhausted.
    expect(cache.getStickyServerIds("session-sticky-2")).toEqual([]);
  });
});
