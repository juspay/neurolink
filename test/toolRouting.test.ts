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
import type {
  GenerateResult,
  ToolRoutingCatalogEntry,
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
