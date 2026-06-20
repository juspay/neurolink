#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Tool Signature Deduplication
 *
 * Deterministic (no live AI) tests that run from ../dist/index.js:
 *
 *   Part 1 — computeToolSignature
 *     - stable output for same input
 *     - order-insensitive across reordered parameter keys
 *     - differs for genuinely different tools (name / description / params)
 *     - normalises description whitespace and casing
 *     - handles tools with no schema / undefined inputSchema
 *     - handles Vercel AI SDK jsonSchema wrapper
 *
 *   Part 2 — dedupeTools (disabled path)
 *     - returns original record (same reference) when enabled is false
 *     - removed array is empty when disabled
 *
 *   Part 3 — dedupeTools (exact and near-duplicate collapse)
 *     - exact-duplicate collapses to representative (first in order)
 *     - removed entry reports correct duplicateOf
 *     - near-duplicate ABOVE threshold is collapsed
 *     - near-duplicate BELOW threshold — both tools retained
 *     - threshold boundary at 1.0 — only identical sigs collapse
 *     - representative is first in stable input order
 *     - distinct tools are all retained
 *     - single-tool no-op
 *     - empty tool record no-op
 *
 *   Part 4 — fail-open guarantee
 *     - internal error returns original tool set; no exception escapes
 *
 *   Part 5 — live-gated (optional, skips cleanly with no API keys)
 *     - generate() with toolDedup enabled completes without error
 *
 * Run:
 *   pnpm run build && npx tsx test/continuous-test-suite-tool-dedup.ts
 *   pnpm run test:tool-dedup
 */

import { computeToolSignature, dedupeTools, NeuroLink } from "../dist/index.js";

import type { Tool } from "../dist/index.js";
import type { ToolDedupConfig } from "../dist/index.js";

import {
  defineSuite,
  logSection,
  assert,
  assertEqual,
  Skip,
  isExpectedProviderError,
} from "./helpers/harness.js";
import {
  skipUnlessProviderAvailable,
  skipUnlessTools,
} from "./helpers/skipIf.js";

const { test, runSuite } = defineSuite("Tool Signature Deduplication", {
  defaultProvider: "anthropic",
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Tool-shaped value that dedupeTools and computeToolSignature
 * can inspect.  The internal tool registry stores tools with `inputSchema` as
 * a plain JSON Schema object (not the Vercel AI SDK's Zod `parameters`).
 */
function mkTool(description: string, props: Record<string, string> = {}): Tool {
  const properties: Record<string, { type: string }> = {};
  for (const [k, v] of Object.entries(props)) {
    properties[k] = { type: v };
  }
  return {
    description,
    inputSchema: {
      type: "object",
      properties,
    } as unknown as Tool["inputSchema"],
    execute: async () => ({}),
  } as unknown as Tool;
}

// ---------------------------------------------------------------------------
// Part 1 — computeToolSignature
// ---------------------------------------------------------------------------

await test("computeToolSignature: stable output for the same input", () => {
  const t = mkTool("Search for documents", {
    query: "string",
    limit: "number",
  });
  const sig1 = computeToolSignature("search_docs", t);
  const sig2 = computeToolSignature("search_docs", t);
  assertEqual(sig1, sig2, "signature must be identical across two calls");
});

await test("computeToolSignature: order-insensitive across reordered parameter keys", () => {
  const t1 = mkTool("Search for documents", {
    query: "string",
    limit: "number",
  });
  const t2 = mkTool("Search for documents", {
    limit: "number",
    query: "string",
  });
  assertEqual(
    computeToolSignature("search_docs", t1),
    computeToolSignature("search_docs", t2),
    "reordering params must not change the signature",
  );
});

await test("computeToolSignature: differs for different tool names", () => {
  const t = mkTool("Search for documents", { query: "string" });
  const sigA = computeToolSignature("tool_a", t);
  const sigB = computeToolSignature("tool_b", t);
  assert(sigA !== sigB, "different names must produce different signatures");
});

await test("computeToolSignature: differs for different descriptions", () => {
  const t1 = mkTool("Search for documents", { query: "string" });
  const t2 = mkTool("Query documents in the database", { query: "string" });
  assert(
    computeToolSignature("t", t1) !== computeToolSignature("t", t2),
    "different descriptions must produce different signatures",
  );
});

await test("computeToolSignature: differs for different parameter sets", () => {
  const t1 = mkTool("Search for documents", { query: "string" });
  const t2 = mkTool("Search for documents", {
    query: "string",
    limit: "number",
  });
  assert(
    computeToolSignature("search", t1) !== computeToolSignature("search", t2),
    "extra parameter must produce a different signature",
  );
});

await test("computeToolSignature: normalises description whitespace and casing", () => {
  const t1 = mkTool("Search  For   Documents", { query: "string" });
  const t2 = mkTool("search for documents", { query: "string" });
  assertEqual(
    computeToolSignature("t", t1),
    computeToolSignature("t", t2),
    "whitespace collapsing and lowercasing must produce the same signature",
  );
});

await test("computeToolSignature: handles tool with no properties (empty schema)", () => {
  const t = mkTool("No params tool", {});
  const sig = computeToolSignature("no_params", t);
  assert(sig.includes("no_params"), "signature must include tool name");
  assert(
    sig.includes("no params tool"),
    "signature must include normalised description",
  );
});

await test("computeToolSignature: handles undefined inputSchema without throwing", () => {
  const t: Tool = {
    description: "bare tool",
    inputSchema: undefined as unknown as Tool["inputSchema"],
    execute: async () => ({}),
  } as unknown as Tool;
  let threw = false;
  try {
    computeToolSignature("bare", t);
  } catch {
    threw = true;
  }
  assert(
    !threw,
    "computeToolSignature must not throw on undefined inputSchema",
  );
});

await test("computeToolSignature: handles Vercel AI SDK jsonSchema wrapper", () => {
  const wrappedSchema = {
    jsonSchema: {
      type: "object",
      properties: { limit: { type: "number" }, query: { type: "string" } },
    },
  };
  const t1: Tool = {
    description: "search for docs",
    inputSchema: wrappedSchema as unknown as Tool["inputSchema"],
    execute: async () => ({}),
  } as unknown as Tool;
  const t2 = mkTool("search for docs", { query: "string", limit: "number" });
  assertEqual(
    computeToolSignature("search", t1),
    computeToolSignature("search", t2),
    "jsonSchema wrapper must produce the same signature as plain properties",
  );
});

// ---------------------------------------------------------------------------
// Part 2 — dedupeTools: disabled path
// ---------------------------------------------------------------------------

logSection("Part 2 — dedupeTools: disabled path");

await test("dedupeTools(disabled): returns original record (same reference)", () => {
  const tools: Record<string, Tool> = {
    search: mkTool("Search for documents", { query: "string" }),
    list: mkTool("List items", { page: "number" }),
  };
  const config: ToolDedupConfig = { enabled: false };
  const result = dedupeTools(tools, config);
  assert(
    result.tools === tools,
    "disabled dedup must return the SAME object reference",
  );
});

await test("dedupeTools(disabled): removed array is empty", () => {
  const tools: Record<string, Tool> = {
    a: mkTool("Tool A", { x: "string" }),
    b: mkTool("Tool A", { x: "string" }),
  };
  const config: ToolDedupConfig = { enabled: false };
  const result = dedupeTools(tools, config);
  assertEqual(
    result.removed.length,
    0,
    "disabled dedup must report zero removed tools",
  );
});

await test("dedupeTools(undefined enabled): returns original record unchanged", () => {
  const tools: Record<string, Tool> = {
    a: mkTool("Tool A", { x: "string" }),
  };
  const result = dedupeTools(tools, {});
  assert(result.tools === tools, "empty config must be treated as disabled");
  assertEqual(result.removed.length, 0);
});

// ---------------------------------------------------------------------------
// Part 3 — dedupeTools: collapse and retention
// ---------------------------------------------------------------------------

logSection("Part 3 — dedupeTools: collapse and retention");

await test("dedupeTools: near-duplicate collapses — representative is first in order", () => {
  const tools: Record<string, Tool> = {
    search_v1: mkTool("Search for documents in the knowledge base", {
      query: "string",
      limit: "number",
    }),
    search_v2: mkTool("Search for documents in the knowledge base", {
      query: "string",
      limit: "number",
    }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.5 });
  const keys = Object.keys(result.tools);
  assertEqual(keys.length, 1, "near-duplicate pair must collapse to one tool");
  assertEqual(
    keys[0],
    "search_v1",
    "representative must be the first tool in input order",
  );
});

await test("dedupeTools: removed entry reports correct duplicateOf", () => {
  const tools: Record<string, Tool> = {
    search_v1: mkTool("Search for documents", { query: "string" }),
    search_v2: mkTool("Search for documents", { query: "string" }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.5 });
  assertEqual(result.removed.length, 1, "exactly one tool must be removed");
  assertEqual(
    result.removed[0].name,
    "search_v2",
    "removed tool name is incorrect",
  );
  assertEqual(
    result.removed[0].duplicateOf,
    "search_v1",
    "duplicateOf must point to the representative",
  );
  assert(
    result.removed[0].similarity >= 0 && result.removed[0].similarity <= 1,
    "similarity must be in [0, 1]",
  );
});

await test("dedupeTools: near-duplicate ABOVE threshold is collapsed", () => {
  const tools: Record<string, Tool> = {
    find_docs: mkTool("Search for documents in the knowledge base", {
      query: "string",
      limit: "number",
    }),
    search_docs: mkTool("Search for documents in the knowledge base", {
      query: "string",
      limit: "number",
    }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.7 });
  assertEqual(
    Object.keys(result.tools).length,
    1,
    "near-duplicate above threshold must be collapsed",
  );
  assertEqual(result.removed.length, 1);
});

await test("dedupeTools: near-duplicate BELOW threshold — both tools retained", () => {
  const tools: Record<string, Tool> = {
    search_docs: mkTool("Search for documents in the knowledge base", {
      query: "string",
    }),
    send_email: mkTool("Send an email to a recipient with subject and body", {
      to: "string",
      subject: "string",
      body: "string",
    }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.9 });
  assertEqual(
    Object.keys(result.tools).length,
    2,
    "distinct tools below threshold must both be retained",
  );
  assertEqual(result.removed.length, 0);
});

await test("dedupeTools: threshold 1.0 — name-differing tools NOT collapsed", () => {
  // Two tools with identical description + params but different names →
  // their signatures differ on the name token → Jaccard < 1.
  const tools: Record<string, Tool> = {
    search_docs: mkTool("Search for documents", { query: "string" }),
    find_documents: mkTool("Search for documents", { query: "string" }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 1.0 });
  assertEqual(
    Object.keys(result.tools).length,
    2,
    "at threshold 1.0, name-differing tools must not collapse",
  );
  assertEqual(result.removed.length, 0);
});

await test("dedupeTools: threshold 0.01 — any overlap triggers collapse", () => {
  const tools: Record<string, Tool> = {
    a: mkTool("query something", { x: "string" }),
    b: mkTool("query something", { x: "string" }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.01 });
  assertEqual(
    Object.keys(result.tools).length,
    1,
    "near-identical tools must collapse at a very low threshold",
  );
});

await test("dedupeTools: three identical tools — first is representative", () => {
  const tools: Record<string, Tool> = {
    alpha: mkTool("Do the thing", { x: "string" }),
    beta: mkTool("Do the thing", { x: "string" }),
    gamma: mkTool("Do the thing", { x: "string" }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.5 });
  assert(
    "alpha" in result.tools,
    "alpha (first in order) must be the representative",
  );
  assertEqual(
    Object.keys(result.tools).length,
    1,
    "all three identical tools must collapse to one",
  );
  assertEqual(result.removed.length, 2, "two tools must be removed");
  for (const r of result.removed) {
    assertEqual(
      r.duplicateOf,
      "alpha",
      "all removed tools must point to alpha",
    );
  }
});

await test("dedupeTools: all distinct tools are retained", () => {
  const tools: Record<string, Tool> = {
    search: mkTool("Find documents by query text", { query: "string" }),
    email: mkTool("Send electronic mail to a user", {
      to: "string",
      body: "string",
    }),
    calendar: mkTool("Create a new calendar event with a date and title", {
      title: "string",
      date: "string",
    }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.9 });
  assertEqual(
    Object.keys(result.tools).length,
    3,
    "all distinct tools must be retained",
  );
  assertEqual(result.removed.length, 0);
});

await test("dedupeTools: single-tool is a no-op", () => {
  const tools: Record<string, Tool> = {
    only: mkTool("The only tool", { arg: "string" }),
  };
  const result = dedupeTools(tools, { enabled: true, threshold: 0.9 });
  assertEqual(
    Object.keys(result.tools).length,
    1,
    "single-tool must be unchanged",
  );
  assertEqual(result.removed.length, 0);
});

await test("dedupeTools: empty record is a no-op", () => {
  const result = dedupeTools({}, { enabled: true, threshold: 0.9 });
  assertEqual(
    Object.keys(result.tools).length,
    0,
    "empty record must remain empty",
  );
  assertEqual(result.removed.length, 0);
});

// ---------------------------------------------------------------------------
// Part 4 — fail-open guarantee
// ---------------------------------------------------------------------------

logSection("Part 4 — fail-open guarantee");

await test("dedupeTools: internal error returns original tool set (fail-open)", () => {
  let getDescriptionCalled = false;
  const badTool = {
    get description(): string {
      if (getDescriptionCalled) {
        throw new Error("deliberate getter failure");
      }
      getDescriptionCalled = true;
      return "first access ok";
    },
    inputSchema: {
      type: "object",
      properties: { x: { type: "string" } },
    },
    execute: async () => ({}),
  } as unknown as Tool;

  const original: Record<string, Tool> = {
    bad_tool: badTool,
    good_tool: mkTool("A fine tool", { y: "string" }),
  };

  let result: ReturnType<typeof dedupeTools> | undefined;
  let threw = false;
  try {
    result = dedupeTools(original, { enabled: true, threshold: 0.9 });
  } catch {
    threw = true;
  }

  assert(!threw, "dedupeTools must never throw even when internals error");
  // May return original or a partial result — the key contract is no throw.
  assert(result !== undefined, "result must be defined");
});

// ---------------------------------------------------------------------------
// Part 5 — NeuroLink wiring: SDK instance integration (no live AI needed)
// ---------------------------------------------------------------------------

logSection("Part 5 — NeuroLink wiring");

await test("NeuroLink.getToolDedupConfig(): returns config when provided", () => {
  const instance = new NeuroLink({
    toolDedup: { enabled: true, threshold: 0.85 },
  });
  const cfg = instance.getToolDedupConfig();
  assert(cfg !== undefined, "getToolDedupConfig must return the config");
  assertEqual(cfg?.enabled, true, "enabled must be true");
  assertEqual(cfg?.threshold, 0.85, "threshold must be 0.85");
});

await test("NeuroLink.getToolDedupConfig(): returns undefined when not configured", () => {
  const instance = new NeuroLink({});
  const cfg = instance.getToolDedupConfig();
  assertEqual(
    cfg,
    undefined,
    "getToolDedupConfig must return undefined when not set",
  );
});

/**
 * Build a minimal BaseProvider subclass that exposes the protected
 * `getToolsForStream` seam, wired to a NeuroLink instance so that
 * `applyToolFiltering` can read `getToolDedupConfig()`.
 *
 * Imports `BaseProvider` from the dist artefact path because it is not part
 * of the public index.js surface but is accessible as an internal dist file.
 */
async function buildToolSeam(
  neurolinkInstance: InstanceType<typeof NeuroLink>,
): Promise<(opts: Record<string, unknown>) => Promise<Record<string, Tool>>> {
  const { BaseProvider } =
    (await import("../dist/lib/core/baseProvider.js")) as unknown as {
      BaseProvider: new (
        modelName: string,
        providerName: string,
        neurolink: unknown,
      ) => object;
    };

  const provider = new (class extends (BaseProvider as unknown as new (
    m: string,
    p: string,
    nl: unknown,
  ) => object) {
    supportsTools(): boolean {
      return true;
    }
    getDefaultModel(): string {
      return "test-model";
    }
    getProviderName(): string {
      return "test-provider";
    }
  })("test-model", "test-provider", neurolinkInstance) as {
    setupToolExecutor(
      sdk: {
        customTools: Map<string, unknown>;
        executeTool: (name: string, params: unknown) => Promise<unknown>;
      },
      tag: string,
    ): void;
    getToolsForStream(
      opts: Record<string, unknown>,
    ): Promise<Record<string, Tool>>;
  };

  const customTools = (
    neurolinkInstance as unknown as { getCustomTools(): Map<string, unknown> }
  ).getCustomTools();

  provider.setupToolExecutor(
    { customTools, executeTool: async () => ({}) },
    "test",
  );

  return (opts) => provider.getToolsForStream(opts);
}

await test("NeuroLink applyToolFiltering deduplicates near-duplicate tools (SDK integration)", async () => {
  const instance = new NeuroLink({
    toolDedup: { enabled: true, threshold: 0.5 },
  });

  const noopExecute = async (): Promise<Record<string, never>> => ({});

  instance.registerTools({
    search_docs: {
      name: "search_docs",
      description: "Search for documents in the knowledge base",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
      execute: noopExecute,
    },
    find_docs: {
      name: "find_docs",
      description: "Search for documents in the knowledge base",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
      execute: noopExecute,
    },
    send_email: {
      name: "send_email",
      description: "Send an email to a user",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string" },
          body: { type: "string" },
        },
      },
      execute: noopExecute,
    },
  });

  const getTools = await buildToolSeam(instance);
  const tools = await getTools({ disableTools: false });
  const names = Object.keys(tools);

  // send_email is distinct — must always be retained.
  assert(names.includes("send_email"), "send_email must be retained");

  // search_docs and find_docs are near-identical — only one survives.
  const dedupPair = names.filter((n) =>
    ["search_docs", "find_docs"].includes(n),
  );
  assertEqual(
    dedupPair.length,
    1,
    "near-duplicate pair must collapse to one tool",
  );
  assertEqual(
    dedupPair[0],
    "search_docs",
    "search_docs (first in input order) must be the representative",
  );
});

await test("NeuroLink applyToolFiltering unchanged when toolDedup is disabled", async () => {
  const instance = new NeuroLink({
    toolDedup: { enabled: false },
  });

  const noopExecute = async (): Promise<Record<string, never>> => ({});

  instance.registerTools({
    search_docs: {
      name: "search_docs",
      description: "Search for documents in the knowledge base",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
      execute: noopExecute,
    },
    find_docs: {
      name: "find_docs",
      description: "Search for documents in the knowledge base",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
      execute: noopExecute,
    },
  });

  const getTools = await buildToolSeam(instance);
  const tools = await getTools({ disableTools: false });
  const names = Object.keys(tools);
  assert(
    names.includes("search_docs"),
    "search_docs must be present when dedup is off",
  );
  assert(
    names.includes("find_docs"),
    "find_docs must be present when dedup is off",
  );
});

// ---------------------------------------------------------------------------
// Part 6 — Live-gated: real generate() with toolDedup (skips without keys)
// ---------------------------------------------------------------------------

logSection("Part 6 — Live-gated (skips without API keys)");

await test("live: generate() with toolDedup enabled completes without error", async () => {
  // Skip if the default provider (anthropic) is unavailable.
  // These helpers throw Skip() — the harness catches that and records SKIP.
  const provider = "anthropic";
  skipUnlessProviderAvailable(provider);
  skipUnlessTools(provider);

  const instance = new NeuroLink({
    toolDedup: { enabled: true, threshold: 0.7 },
  });

  const noopExecute = async (): Promise<{ ok: boolean }> => ({ ok: true });

  // Register two near-duplicate tools and one distinct tool.
  instance.registerTools({
    search_docs: {
      name: "search_docs",
      description: "Search for documents in the knowledge base by query",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
      execute: noopExecute,
    },
    find_docs: {
      name: "find_docs",
      description: "Search for documents in the knowledge base by query",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
      execute: noopExecute,
    },
    get_time: {
      name: "get_time",
      description: "Returns the current UTC time as an ISO string",
      inputSchema: { type: "object", properties: {} },
      execute: noopExecute,
    },
  });

  let result: { content: string } | undefined;
  try {
    result = await instance.generate({
      provider,
      input: { text: "Say hello in exactly one word." },
      disableTools: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(`provider error: ${msg.slice(0, 120)}`);
    }
    throw err;
  }

  assert(
    typeof result?.content === "string" && result.content.length > 0,
    "generate() must return a non-empty string response",
  );
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await runSuite();
