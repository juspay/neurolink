#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Tool Resolution
 *
 * No-API suite covering the unified tool-policy pipeline:
 *
 *   Part 1 — Policy table (resolveToolPolicy + applyToolGate): legacy
 *     fail-open quirks, enabledToolNames native-set fix, instance
 *     include/exclude with globs, fail-closed new-surface semantics,
 *     disableBuiltinTools wiring.
 *   Part 2 — Deterministic ordering + real schemas: direct/file tools
 *     register real JSON schemas (not `{}`), tool listings are name-sorted
 *     (prompt-cache stability across restarts).
 *   Part 3 — Channel B: native-tool providers get the short damping line
 *     instead of the duplicated tool listing; prompt-only providers keep it.
 *   Part 4 — Discovery (tools.discovery): partition behind search_tools,
 *     catalog rendering + degradation ladder, lexical search, live
 *     hydration, session pinning, miss handling.
 *   Part 5 — Mid-turn hydration parity (native loops): the deferred-tool
 *     resolver on the hot record, resolveLiveTool/resolveDeferredTool,
 *     refreshNativeToolDeclarations, and the shared native executor's
 *     dispatch-miss recovery (the curator T1/T7 regression shapes).
 *
 * Run: npx tsx test/continuous-test-suite-tool-resolution.ts
 *      pnpm run test:tool-resolution
 */

import { z } from "zod";
import { tool } from "ai";
import {
  resolveToolPolicy,
  toolNameMatcher,
} from "../src/lib/tools/toolPolicy.js";
import { applyToolGate } from "../src/lib/tools/toolGate.js";
import {
  partitionToolsForDiscovery,
  isDiscoveryMetaTool,
  resolveDeferredTool,
  resolveLiveTool,
} from "../src/lib/tools/toolDiscovery.js";
import {
  buildNativeToolDeclarations,
  executeNativeToolCalls,
  refreshNativeToolDeclarations,
} from "../src/lib/providers/googleNativeGemini3.js";
import { buildWireToolNameMaps } from "../src/lib/providers/openaiChatCompletionsClient.js";
import { MCPToolRegistry } from "../src/lib/mcp/toolRegistry.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import type { Tool, ToolInfo } from "../src/lib/types/index.js";
import { defineSuite, logSection } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Tool Resolution");

function assertEqual(got: unknown, want: unknown, label: string): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    throw new Error(`${label}: expected ${w}, got ${g}`);
  }
}

function fakeTool(desc: string): Tool {
  return tool({
    description: desc,
    inputSchema: z.object({ x: z.string().describe("input") }),
    execute: async () => "ok",
  }) as Tool;
}

const SAMPLE = {
  a: fakeTool("Tool A"),
  b: fakeTool("Tool B"),
  github_create: fakeTool("Create an issue in a GitHub repository"),
  github_merge: fakeTool("Merge a pull request on GitHub"),
} as Record<string, Tool>;

function gateNames(
  options: Parameters<typeof resolveToolPolicy>[0]["options"],
  instanceConfig?: Parameters<typeof resolveToolPolicy>[0]["instanceConfig"],
  builtinToolNames?: string[],
): string[] {
  return Object.keys(
    applyToolGate(
      SAMPLE,
      resolveToolPolicy({ options, instanceConfig, builtinToolNames }),
    ),
  );
}

async function main() {
  logSection("Part 1 — Policy table");

  await test("legacy toolFilter: [] is a no-op (fail-open)", async () => {
    assertEqual(
      gateNames({ toolFilter: [] }),
      ["a", "b", "github_create", "github_merge"],
      "empty toolFilter",
    );
  });

  await test("toolFilter exact-match whitelist", async () => {
    assertEqual(gateNames({ toolFilter: ["a"] }), ["a"], "exact whitelist");
  });

  await test("enabledToolNames filters the NATIVE set (bug fix)", async () => {
    assertEqual(
      gateNames({ enabledToolNames: ["b"] }),
      ["b"],
      "enabledToolNames",
    );
  });

  await test("toolFilter alone bounds the native set when both allowlists are set", async () => {
    // Pre-refactor contract: the native set is bounded by toolFilter alone;
    // merging enabledToolNames as a union would WIDEN it (unsafe direction).
    assertEqual(
      gateNames({ toolFilter: ["a"], enabledToolNames: ["b"] }),
      ["a"],
      "toolFilter wins",
    );
  });

  await test("excludeTools applies after toolFilter (denylist wins)", async () => {
    assertEqual(
      gateNames({ toolFilter: ["a", "b"], excludeTools: ["b"] }),
      ["a"],
      "deny-after-allow",
    );
  });

  await test("malformed toolFilter shape is ignored (autoresearch quirk)", async () => {
    assertEqual(
      gateNames({ toolFilter: { include: [] } as unknown as string[] }),
      ["a", "b", "github_create", "github_merge"],
      "malformed shape",
    );
  });

  await test("NEW tools.include: [] is fail-closed (no tools)", async () => {
    assertEqual(gateNames({}, { include: [] }), [], "fail-closed");
  });

  await test("tools.include glob patterns", async () => {
    assertEqual(
      gateNames({}, { include: ["github*"] }),
      ["github_create", "github_merge"],
      "glob include",
    );
  });

  await test("per-call toolFilter bounded by tools.include", async () => {
    assertEqual(
      gateNames(
        { toolFilter: ["a", "github_create"] },
        { include: ["github*"] },
      ),
      ["github_create"],
      "bounded intersection",
    );
  });

  await test("glob-vs-glob bounding intersects by NAME, not pattern string", async () => {
    // toolFilter "github*" and include "github_c*" overlap on github_create;
    // pre-intersecting pattern strings would wrongly produce zero tools.
    assertEqual(
      gateNames({ toolFilter: ["github*"] }, { include: ["github_c*"] }),
      ["github_create"],
      "glob intersection",
    );
  });

  await test("tools.enabled: false disables everything", async () => {
    assertEqual(gateNames({}, { enabled: false }), [], "instance disable");
  });

  await test("disableTools yields an empty set at the gate itself", async () => {
    // Defense-in-depth: call sites zero the record via shouldUseTools, but
    // the gate must also be self-sufficient for future call sites.
    assertEqual(gateNames({ disableTools: true }), [], "gate-level disable");
  });

  await test("malformed tools.include fails CLOSED, never open", async () => {
    // A broken lockdown config must not expose every tool (fail-open would
    // invert the operator's intent). Objects/numbers → no tools.
    assertEqual(
      gateNames({}, { include: { bad: true } as unknown as string[] }),
      [],
      "object include fails closed",
    );
    // A bare string is obvious intent — coerced to a one-element list.
    assertEqual(
      gateNames({}, { include: "a" as unknown as string[] }),
      ["a"],
      "string include coerced",
    );
    // Arrays are salvaged to their string entries (converges toward fewer).
    assertEqual(
      gateNames({}, { include: ["a", 42] as unknown as string[] }),
      ["a"],
      "array include salvaged",
    );
  });

  await test("tools.disableBuiltinTools excludes builtin names", async () => {
    assertEqual(
      gateNames({}, { disableBuiltinTools: true }, ["a", "b"]),
      ["github_create", "github_merge"],
      "builtin exclusion",
    );
  });

  await test("tools.exclude glob patterns", async () => {
    assertEqual(
      gateNames({}, { exclude: ["github*"] }),
      ["a", "b"],
      "glob exclude",
    );
  });

  await test("gate preserves input key order (cache stability)", async () => {
    const filtered = applyToolGate(
      SAMPLE,
      resolveToolPolicy({ options: { excludeTools: ["b"] } }),
    );
    assertEqual(
      Object.keys(filtered),
      ["a", "github_create", "github_merge"],
      "order preserved",
    );
  });

  await test("toolNameMatcher: exact is case-sensitive, glob spans segments", async () => {
    const m = toolNameMatcher(["readFile", "jira.*"]);
    assertEqual(
      [m("readFile"), m("readfile"), m("jira.create"), m("jirax")],
      [true, false, true, false],
      "matcher semantics",
    );
  });

  logSection("Part 2 — Determinism + real schemas");

  await test("direct tools register real JSON schemas (not {})", async () => {
    const registry = new MCPToolRegistry();
    const tools = await registry.listTools();
    const direct = tools.filter((t: ToolInfo) => t.serverId === "direct");
    if (direct.length === 0) {
      throw new Error("no direct tools registered");
    }
    const empty = direct.filter(
      (t: ToolInfo) =>
        !t.inputSchema || Object.keys(t.inputSchema as object).length === 0,
    );
    if (empty.length > 0) {
      throw new Error(
        `direct tools with empty schema: ${empty.map((t) => t.name).join(",")}`,
      );
    }
    // Assert real schema CONTENTS for a stable parameterized tool — the
    // conversion fallback ({ type: "object", properties: {} }) must not pass.
    const readFile = direct.find((t) => t.name === "readFile");
    const schema = readFile?.inputSchema as
      | {
          properties?: Record<string, unknown>;
          required?: string[];
        }
      | undefined;
    if (!schema?.properties?.path) {
      throw new Error(
        `readFile schema lost its 'path' property: ${JSON.stringify(schema)}`,
      );
    }
    if (!Array.isArray(schema.required) || !schema.required.includes("path")) {
      throw new Error(
        `readFile schema lost its required list: ${JSON.stringify(schema)}`,
      );
    }
  });

  await test("getAllAvailableTools returns a name-sorted, schema-bearing list", async () => {
    const nl = new NeuroLink();
    const tools = await nl.getAllAvailableTools();
    const names = tools.map((t) => t.name);
    const sorted = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assertEqual(names, sorted, "sorted listing");
    const withSchema = tools.filter(
      (t) => t.inputSchema && Object.keys(t.inputSchema as object).length > 0,
    );
    if (withSchema.length !== tools.length) {
      throw new Error(
        `${tools.length - withSchema.length}/${tools.length} tools missing real schemas`,
      );
    }
    // Content check for a file tool: read_file_section must expose real
    // parameters, not the conversion fallback.
    const fileTool = tools.find((t) => t.name === "read_file_section");
    const fileSchema = fileTool?.inputSchema as
      | { properties?: Record<string, unknown> }
      | undefined;
    if (
      !fileSchema?.properties ||
      Object.keys(fileSchema.properties).length === 0
    ) {
      throw new Error(
        `read_file_section schema has no properties: ${JSON.stringify(fileSchema)}`,
      );
    }
  });

  logSection("Part 3 — Channel B (system-prompt tool listing)");

  await test("native-tool providers get damping line, NOT the tool listing", async () => {
    const nl = new NeuroLink();
    const tools = await nl.getAllAvailableTools();
    const priv = nl as unknown as {
      createToolAwareSystemPrompt(
        p: string | undefined,
        t: ToolInfo[],
        native: boolean,
      ): string;
    };
    const nativePrompt = priv.createToolAwareSystemPrompt("Base.", tools, true);
    const promptOnly = priv.createToolAwareSystemPrompt("Base.", tools, false);
    if (nativePrompt.includes("additional tools if needed")) {
      throw new Error("native prompt still contains the tool listing");
    }
    if (!nativePrompt.includes("Tools are available via native tool calling")) {
      throw new Error("native prompt lost the damping line");
    }
    if (!promptOnly.includes("additional tools if needed")) {
      throw new Error("prompt-only provider lost the tool listing");
    }
  });

  await test("a tool named __proto__ survives the prompt-listing filter", async () => {
    const nl = new NeuroLink();
    const priv = nl as unknown as {
      applyToolInfoFiltering(
        tools: ToolInfo[],
        options: Record<string, unknown>,
      ): ToolInfo[];
    };
    const listing: ToolInfo[] = [
      { name: "__proto__", description: "hostile name", serverId: "x" },
      { name: "normal_tool", description: "ok", serverId: "x" },
    ] as ToolInfo[];
    const filtered = priv.applyToolInfoFiltering(listing, {});
    // With a plain {} record, `"__proto__" in record` is truthy via the
    // prototype and the tool silently vanished from the listing.
    assertEqual(
      filtered.map((t) => t.name).sort(),
      ["__proto__", "normal_tool"],
      "proto-named tool retained in listing",
    );
  });

  logSection("Part 4 — Discovery (tools.discovery)");

  await test("partition defers external tools behind search_tools; pins stay hot", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket in a project"),
      jira_search: fakeTool("Search Jira issues with JQL"),
      github_merge: fakeTool("Merge a GitHub pull request"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create", "jira_search", "github_merge"],
      pinnedNames: new Set(["github_merge"]),
      onHydrate: () => {},
    });
    assertEqual(
      Object.keys(hot).sort(),
      ["github_merge", "readFile", "search_tools"],
      "hot set",
    );
    const desc = (hot["search_tools"] as { description?: string }).description;
    if (!desc?.includes("jira_create:") || !desc.includes("jira_search:")) {
      throw new Error("catalog missing deferred entries");
    }
    if (desc.includes("github_merge:")) {
      throw new Error("pinned tool leaked into the catalog");
    }
  });

  await test("search_tools loads matches, hydrates live record, pins session", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket in a project"),
      github_merge: fakeTool("Merge a GitHub pull request"),
    };
    const pinned: string[] = [];
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create", "github_merge"],
      pinnedNames: new Set(),
      onHydrate: (names) => pinned.push(...names),
    });
    const search = hot["search_tools"] as unknown as {
      execute: (
        args: { query: string },
        opts: unknown,
      ) => Promise<{
        found: number;
        tools?: Array<{ name: string; inputSchema: unknown }>;
      }>;
    };
    const result = await search.execute(
      { query: "create a jira ticket" },
      { toolCallId: "t1", messages: [] },
    );
    if (result.found < 1 || result.tools?.[0]?.name !== "jira_create") {
      throw new Error(
        `expected jira_create as top match, got ${JSON.stringify(result)}`,
      );
    }
    if (!JSON.stringify(result.tools?.[0]?.inputSchema).includes('"x"')) {
      throw new Error("full inputSchema not returned by search");
    }
    if (!("jira_create" in hot)) {
      throw new Error("hydration did not add the tool to the live record");
    }
    if (!pinned.includes("jira_create")) {
      throw new Error("session pin callback not fired");
    }
  });

  await test("search_tools miss returns found: 0 without loading anything", async () => {
    const tools: Record<string, Tool> = {
      jira_create: fakeTool("Create a Jira ticket"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    const search = hot["search_tools"] as unknown as {
      execute: (
        args: { query: string },
        opts: unknown,
      ) => Promise<{ found: number }>;
    };
    const result = await search.execute(
      { query: "zzznothingmatches" },
      { toolCallId: "t2", messages: [] },
    );
    assertEqual(result.found, 0, "miss");
    if ("jira_create" in hot) {
      throw new Error("miss must not hydrate");
    }
  });

  await test("meta-tool carries the internal marker; real tools do not", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    // The marker is what lets re-entrant resolution passes (stream→generate
    // fallback) strip OUR stale meta-tool while never touching a real user
    // tool that claims the name.
    assertEqual(
      [
        isDiscoveryMetaTool(hot["search_tools"]),
        isDiscoveryMetaTool(hot["readFile"]),
      ],
      [true, false],
      "marker discrimination",
    );
  });

  await test("discovery never shadows a real tool named search_tools", async () => {
    const userTool = fakeTool("A user tool that claims the reserved name");
    const tools: Record<string, Tool> = {
      search_tools: userTool,
      jira_create: fakeTool("Create a Jira ticket"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    // Discovery must be skipped entirely: both tools intact, no meta-tool.
    assertEqual(
      Object.keys(hot).sort(),
      ["jira_create", "search_tools"],
      "partition skipped on name collision",
    );
    // Identity check: the surviving entry must be the USER's tool, not a
    // generated meta-tool that merely reuses the key.
    if (hot["search_tools"] !== userTool) {
      throw new Error("user's search_tools was replaced, not preserved");
    }
    if (isDiscoveryMetaTool(hot["search_tools"])) {
      throw new Error("user's search_tools carries the meta-tool marker");
    }
  });

  await test("catalog degradation ladder: large catalogs stay under budget", async () => {
    const many: Record<string, Tool> = {};
    const names: string[] = [];
    for (let i = 0; i < 800; i++) {
      const name = `server_tool_${String(i).padStart(4, "0")}`;
      names.push(name);
      many[name] = fakeTool(
        `Long description for tool number ${i} that does many things with lots of words to inflate the catalog size well past the character budget.`,
      );
    }
    const hot = partitionToolsForDiscovery(many, {
      deferrableNames: names,
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    const desc =
      (hot["search_tools"] as { description?: string }).description ?? "";
    if (desc.length > 20_000) {
      throw new Error(`catalog blew the budget: ${desc.length} chars`);
    }
    if (!desc.includes("server_tool_0000")) {
      throw new Error("catalog lost its first entry");
    }
    // The tail must never be dropped SILENTLY: either the last entry is
    // present (name-only ladder fit) or the truncation note accounts for it.
    if (!desc.includes("server_tool_0799") && !/… and \d+ more/.test(desc)) {
      throw new Error("catalog tail dropped without a truncation note");
    }
  });

  await test("NeuroLink discovery pins are session-scoped and append-only", async () => {
    const nl = new NeuroLink();
    nl.pinDiscoveredTools("session-1", ["a", "b"]);
    nl.pinDiscoveredTools("session-1", ["c"]);
    nl.pinDiscoveredTools("session-2", ["z"]);
    assertEqual(
      [...nl.getDiscoveryPins("session-1")].sort(),
      ["a", "b", "c"],
      "session-1 pins",
    );
    assertEqual([...nl.getDiscoveryPins("session-2")], ["z"], "session-2 pins");
    assertEqual([...nl.getDiscoveryPins("session-3")], [], "unknown session");
  });

  await test("discovery pin eviction is LRU, not FIFO (reads refresh recency)", async () => {
    const nl = new NeuroLink();
    for (let i = 0; i < 1000; i++) {
      nl.pinDiscoveredTools(`s-${i}`, ["t"]);
    }
    // s-0 is the oldest by insertion; touching it must protect it from the
    // next eviction.
    nl.getDiscoveryPins("s-0");
    nl.pinDiscoveredTools("s-overflow", ["t"]);
    assertEqual([...nl.getDiscoveryPins("s-0")], ["t"], "touched survives");
    assertEqual([...nl.getDiscoveryPins("s-1")], [], "untouched LRU evicted");
  });

  logSection("Part 5 — Mid-turn hydration parity (native loops)");

  await test("resolveDeferredTool auto-hydrates a cataloged tool and pins it", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket in a project"),
    };
    const pinned: string[] = [];
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: (names) => pinned.push(...names),
    });
    const resolved = resolveDeferredTool(hot, "jira_create");
    if (!resolved || resolved !== tools["jira_create"]) {
      throw new Error("resolver did not return the deferred tool");
    }
    if (!("jira_create" in hot)) {
      throw new Error("resolver did not hydrate the live record");
    }
    if (!pinned.includes("jira_create")) {
      throw new Error("auto-hydration must persist the session pin");
    }
    // Idempotent: a second resolve returns the same tool without re-pinning.
    resolveDeferredTool(hot, "jira_create");
    assertEqual(pinned, ["jira_create"], "no duplicate pin");
    // Genuinely unknown names stay unknown — the hallucinated-name defense
    // in the native loops must keep firing for these.
    assertEqual(
      resolveDeferredTool(hot, "not_a_tool"),
      undefined,
      "unknown name",
    );
    // Records without a resolver (discovery off) are a clean no-op.
    assertEqual(
      resolveDeferredTool({ a: fakeTool("A") }, "a"),
      undefined,
      "plain record",
    );
  });

  await test("deferred resolver rides a symbol key — invisible to enumeration", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    // Declaration builders iterate string keys — the resolver must never
    // surface there or it would be sent to providers as a "tool".
    assertEqual(
      Object.keys(hot).sort(),
      ["readFile", "search_tools"],
      "string keys",
    );
    if (Object.getOwnPropertySymbols(hot).length === 0) {
      throw new Error("resolver symbol missing from the hot record");
    }
  });

  await test("resolveLiveTool: hot record first, deferred catalog second", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    if (resolveLiveTool(hot, "readFile") !== tools["readFile"]) {
      throw new Error("hot tool must resolve from the record directly");
    }
    if (resolveLiveTool(hot, "jira_create") !== tools["jira_create"]) {
      throw new Error("deferred tool must resolve via the catalog");
    }
    assertEqual(resolveLiveTool(hot, "ghost"), undefined, "unknown name");
    assertEqual(resolveLiveTool(undefined, "a"), undefined, "no record");
  });

  await test("refreshNativeToolDeclarations syncs snapshot with hydrated record", async () => {
    const initial: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
    };
    const snapshot = buildNativeToolDeclarations(initial);
    // Simulate search_tools hydrating a tool into the live record mid-turn.
    const live: Record<string, Tool> = {
      ...initial,
      jira_create: fakeTool("Create a Jira ticket"),
    };
    if (!refreshNativeToolDeclarations(live, snapshot)) {
      throw new Error("refresh must report additions");
    }
    assertEqual(
      snapshot.toolsConfig[0].functionDeclarations.map((d) => d.name).sort(),
      ["jira_create", "readFile"],
      "declarations after refresh",
    );
    if (typeof snapshot.executeMap.get("jira_create") !== "function") {
      throw new Error("executeMap missing hydrated tool");
    }
    assertEqual(
      snapshot.originalNameMap.get("jira_create"),
      "jira_create",
      "name map after refresh",
    );
    // Second refresh with an unchanged record is a no-op.
    assertEqual(
      refreshNativeToolDeclarations(live, snapshot),
      false,
      "idempotent refresh",
    );
  });

  await test("refresh disambiguates sanitized names against the snapshot", async () => {
    // "my/tool" sanitizes to "my_tool" in the pre-loop snapshot; a tool
    // hydrated later that literally claims "my_tool" must be suffixed, not
    // silently collide (reservedNames seeding).
    const initial: Record<string, Tool> = {
      "my/tool": fakeTool("Slashed name"),
    };
    const snapshot = buildNativeToolDeclarations(initial);
    assertEqual(
      snapshot.toolsConfig[0].functionDeclarations.map((d) => d.name),
      ["my_tool"],
      "sanitized snapshot",
    );
    const live: Record<string, Tool> = {
      ...initial,
      my_tool: fakeTool("Claims the sanitized name"),
    };
    refreshNativeToolDeclarations(live, snapshot);
    assertEqual(
      snapshot.toolsConfig[0].functionDeclarations.map((d) => d.name).sort(),
      ["my_tool", "my_tool_2"],
      "collision suffixed",
    );
    assertEqual(
      snapshot.originalNameMap.get("my_tool_2"),
      "my_tool",
      "round-trip mapping for the suffixed name",
    );
  });

  await test("native executor: tool loaded by search_tools runs in the same batch (T1 shape)", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket in a project"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    const snapshot = buildNativeToolDeclarations(hot);
    const failedTools = new Map<string, { count: number; lastError: string }>();
    const responses = await executeNativeToolCalls(
      "[Test]",
      [
        { name: "search_tools", args: { query: "jira_create" } },
        { name: "jira_create", args: { x: "1" } },
      ],
      snapshot.executeMap,
      failedTools,
      [],
      {
        originalNameMap: snapshot.originalNameMap,
        liveTools: hot,
        declarations: snapshot,
      },
    );
    const second = JSON.stringify(responses[1]);
    if (second.includes("TOOL_NOT_FOUND")) {
      throw new Error(`same-batch call died as TOOL_NOT_FOUND: ${second}`);
    }
    if (!second.includes('"ok"')) {
      throw new Error(`expected the tool's real result, got: ${second}`);
    }
    if (failedTools.has("jira_create")) {
      throw new Error("hydrated tool must not carry breaker strikes");
    }
  });

  await test("native executor: direct call to a deferred tool auto-hydrates (T7 shape)", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      slack_channels_list: fakeTool("List Slack channels in the workspace"),
    };
    const pinned: string[] = [];
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["slack_channels_list"],
      pinnedNames: new Set(),
      onHydrate: (names) => pinned.push(...names),
    });
    const snapshot = buildNativeToolDeclarations(hot);
    const failedTools = new Map<string, { count: number; lastError: string }>();
    // No search_tools call at all — the model read the exact name from the
    // catalog and called it directly (the curator T7 failure).
    const responses = await executeNativeToolCalls(
      "[Test]",
      [{ name: "slack_channels_list", args: { x: "1" } }],
      snapshot.executeMap,
      failedTools,
      [],
      {
        originalNameMap: snapshot.originalNameMap,
        liveTools: hot,
        declarations: snapshot,
      },
    );
    const payload = JSON.stringify(responses[0]);
    if (payload.includes("TOOL_NOT_FOUND")) {
      throw new Error(
        `direct deferred call died as TOOL_NOT_FOUND: ${payload}`,
      );
    }
    if (!payload.includes('"ok"')) {
      throw new Error(`expected the tool's real result, got: ${payload}`);
    }
    if (!pinned.includes("slack_channels_list")) {
      throw new Error("auto-hydration must persist the session pin");
    }
    if (
      !snapshot.toolsConfig[0].functionDeclarations.some(
        (d) => d.name === "slack_channels_list",
      )
    ) {
      throw new Error("hydrated tool missing from refreshed declarations");
    }
  });

  await test("native executor: genuinely unknown names still die as TOOL_NOT_FOUND", async () => {
    const tools: Record<string, Tool> = {
      readFile: fakeTool("Read a file"),
      jira_create: fakeTool("Create a Jira ticket"),
    };
    const hot = partitionToolsForDiscovery(tools, {
      deferrableNames: ["jira_create"],
      pinnedNames: new Set(),
      onHydrate: () => {},
    });
    const snapshot = buildNativeToolDeclarations(hot);
    const responses = await executeNativeToolCalls(
      "[Test]",
      [{ name: "hallucinated_tool", args: {} }],
      snapshot.executeMap,
      new Map(),
      [],
      {
        originalNameMap: snapshot.originalNameMap,
        liveTools: hot,
        declarations: snapshot,
      },
    );
    if (!JSON.stringify(responses[0]).includes("TOOL_NOT_FOUND")) {
      throw new Error("hallucinated-name defense must keep firing");
    }
  });

  await test("wire-name maps seed reserved names so hydration refresh cannot collide", async () => {
    // Chat-completions mid-turn refresh maps only the hydrated subset; the
    // reserved seed must keep it from re-issuing a wire name an earlier
    // tool already claimed.
    // Sanitized hydrated name lands on an already-declared wire name.
    const sanitized = buildWireToolNameMaps(["my/tool"], new Set(["my_tool"]));
    if (!sanitized) {
      throw new Error("reserved collision must materialize maps");
    }
    assertEqual(
      sanitized.toWire.get("my/tool"),
      "my_tool_2",
      "sanitized collision suffixed",
    );
    // Even a wire-VALID hydrated name must be remapped when reserved.
    const literal = buildWireToolNameMaps(
      ["github_search"],
      new Set(["github_search"]),
    );
    if (!literal) {
      throw new Error("literal reserved collision must materialize maps");
    }
    assertEqual(
      literal.toWire.get("github_search"),
      "github_search_2",
      "literal collision suffixed",
    );
    // All-valid, unreserved names keep the no-mapping fast path.
    assertEqual(
      buildWireToolNameMaps(["a_tool"], new Set(["other_tool"])),
      undefined,
      "fast path intact",
    );
  });

  await runSuite();
}

main();
