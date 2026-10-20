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
import { tool } from "../dist/index.js";
import { MCPToolRegistry, NeuroLink } from "../dist/index.js";
import type {
  GenerateOptions,
  Tool,
  ToolConfig,
  ToolInfo,
} from "../src/lib/types/index.js";
import { defineSuite, logSection } from "./helpers/harness.js";
import {
  chatCompletion,
  mockOpenAICredentials,
  startMockChatServer,
  startScriptedChatServer,
} from "./helpers/mockChatServer.js";

const { test, runSuite } = defineSuite("Tool Resolution", {
  offline: true,
});

function assertEqual(got: unknown, want: unknown, label: string): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    throw new Error(`${label}: expected ${w}, got ${g}`);
  }
}

async function main() {
  logSection("Part 1 — Policy table");

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

  const REGISTERED_TOOLS = ["keep_time", "orders_lookup", "sales_report"];

  // What reached the wire: the tool names, and the search_tools description.
  const sendWithRegisteredTools = async (
    tools: ToolConfig,
    extra: Pick<GenerateOptions, "toolFilter" | "toolChoice"> = {},
    setUp?: (nl: NeuroLink) => void,
  ): Promise<{ names: string[]; searchDescription: string }> => {
    const server = await startMockChatServer();
    const nl = new NeuroLink({ tools });
    setUp?.(nl);
    for (const name of REGISTERED_TOOLS) {
      nl.registerTool(name, {
        name,
        description: `The ${name} tool.`,
        inputSchema: { type: "object", properties: {}, required: [] },
        execute: async () => ({ ok: true }),
      });
    }
    try {
      await nl.generate({
        input: { text: "hello" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        context: { sessionId: "discovery-scope-session" },
        ...extra,
      });
      const body = JSON.parse(server.getLastRequestBody() ?? "{}") as {
        tools?: Array<{ function?: { name?: string; description?: string } }>;
      };
      const declared = (body.tools ?? []).map((entry) => entry.function ?? {});
      return {
        names: declared.map((fn) => fn.name ?? ""),
        searchDescription:
          declared.find((fn) => fn.name === "search_tools")?.description ?? "",
      };
    } finally {
      await nl.shutdown();
      await server.close();
    }
  };

  await test("discovery: true alone still never defers registered tools", async () => {
    const { names } = await sendWithRegisteredTools({ discovery: true });
    for (const name of REGISTERED_TOOLS) {
      if (!names.includes(name)) {
        throw new Error(`${name} was not sent in full: ${names.join(",")}`);
      }
    }
  });

  await test('discoveryScope "all" defers registered tools except discoveryAlwaysVisible', async () => {
    const { names, searchDescription } = await sendWithRegisteredTools({
      discovery: true,
      discoveryScope: "all",
      discoveryAlwaysVisible: ["keep_*"],
    });
    if (!names.includes("search_tools")) {
      throw new Error(`search_tools missing: ${names.join(",")}`);
    }
    if (!names.includes("keep_time")) {
      throw new Error("always-visible keep_time was deferred");
    }
    for (const deferred of ["orders_lookup", "sales_report"]) {
      if (names.includes(deferred)) {
        throw new Error(`${deferred} was sent in full instead of deferred`);
      }
      if (!searchDescription.includes(deferred)) {
        throw new Error(`${deferred} is missing from the search_tools catalog`);
      }
    }
  });

  const asEventPayload = (value: unknown): Record<string, unknown> =>
    typeof value === "object" && value !== null ? { ...value } : {};

  const toolCall = (id: string, name: string, args: Record<string, unknown>) =>
    chatCompletion({
      finishReason: "tool_calls",
      toolCalls: [
        {
          id,
          type: "function",
          function: { name, arguments: JSON.stringify(args) },
        },
      ],
    });

  // A generate() turn against a scripted model, with discovery deferring the
  // registered tools. Returns the tool events and every request body sent.
  const runScriptedDiscoveryTurn = async (
    script: ReturnType<typeof chatCompletion>[],
    sessionId: string,
  ): Promise<{
    events: Array<{ type: string; payload: Record<string, unknown> }>;
    requestToolNames: string[][];
  }> => {
    const server = await startScriptedChatServer(script);
    const nl = new NeuroLink({
      tools: { discovery: true, discoveryScope: "all" },
    });
    for (const name of REGISTERED_TOOLS) {
      nl.registerTool(name, {
        name,
        description: `The ${name} tool.`,
        inputSchema: { type: "object", properties: {}, required: [] },
        execute: async () => ({ ok: true }),
      });
    }
    const events: Array<{ type: string; payload: Record<string, unknown> }> =
      [];
    const emitter = nl.getEventEmitter();
    emitter.on("tool:start", (...args: unknown[]) => {
      events.push({ type: "start", payload: asEventPayload(args[0]) });
    });
    emitter.on("tool:end", (...args: unknown[]) => {
      events.push({ type: "end", payload: asEventPayload(args[0]) });
    });
    try {
      await nl.generate({
        input: { text: "find the orders tool" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        context: { sessionId },
      });
      const requestToolNames = server.getAllRequestBodies().map((raw) => {
        const body = JSON.parse(raw) as {
          tools?: Array<{ function?: { name?: string } }>;
        };
        return (body.tools ?? []).map((entry) => entry.function?.name ?? "");
      });
      return { events, requestToolNames };
    } finally {
      await nl.shutdown();
      await server.close();
    }
  };

  const eventsFor = (
    events: Array<{ type: string; payload: Record<string, unknown> }>,
    toolName: string,
  ) => events.filter((event) => event.payload.toolName === toolName);

  await test("a search_tools call emits paired tool:start and tool:end", async () => {
    const { events } = await runScriptedDiscoveryTurn(
      [
        toolCall("call_search", "search_tools", { query: "orders_lookup" }),
        chatCompletion({ content: "done" }),
      ],
      "search-tools-events-session",
    );
    const searchEvents = eventsFor(events, "search_tools");
    assertEqual(
      searchEvents.map((event) => event.type),
      ["start", "end"],
      "search_tools events",
    );
    const startId = searchEvents[0].payload.executionId;
    if (typeof startId !== "string" || startId.length === 0) {
      throw new Error("search_tools tool:start has no executionId");
    }
    if (searchEvents[1].payload.executionId !== startId) {
      throw new Error(
        "search_tools tool:end executionId does not match its tool:start",
      );
    }
    const end = searchEvents[1].payload;
    if (end.success !== true) {
      throw new Error("search_tools tool:end was not successful");
    }
    if (!JSON.stringify(end.result).includes("orders_lookup")) {
      throw new Error("search_tools result did not load orders_lookup");
    }
  });

  await test("generate() declares and runs a tool search_tools loaded mid-turn", async () => {
    const { events, requestToolNames } = await runScriptedDiscoveryTurn(
      [
        toolCall("call_search", "search_tools", { query: "orders_lookup" }),
        toolCall("call_orders", "orders_lookup", {}),
        chatCompletion({ content: "done" }),
      ],
      "search-then-call-session",
    );
    if (requestToolNames[0]?.includes("orders_lookup")) {
      throw new Error("orders_lookup was declared before it was searched for");
    }
    if (!requestToolNames[1]?.includes("orders_lookup")) {
      throw new Error(
        `orders_lookup not declared after the search: ${(requestToolNames[1] ?? []).join(",")}`,
      );
    }
    const ordersEnd = eventsFor(events, "orders_lookup").find(
      (event) => event.type === "end",
    );
    if (ordersEnd?.payload.success !== true) {
      throw new Error("orders_lookup did not run after being loaded");
    }
  });

  await test("generate() runs a deferred tool called by its catalog name without a search", async () => {
    const { events, requestToolNames } = await runScriptedDiscoveryTurn(
      [
        toolCall("call_sales", "sales_report", {}),
        chatCompletion({ content: "done" }),
      ],
      "direct-call-session",
    );
    if (requestToolNames[0]?.includes("sales_report")) {
      throw new Error("sales_report was not deferred on the first request");
    }
    const salesEnd = eventsFor(events, "sales_report").find(
      (event) => event.type === "end",
    );
    if (salesEnd?.payload.success !== true) {
      throw new Error("sales_report did not run on a direct call");
    }
  });

  await test("search_tools tells the model to check the catalog before refusing", async () => {
    const { searchDescription } = await sendWithRegisteredTools({
      discovery: true,
      discoveryScope: "all",
    });
    if (
      !searchDescription.includes(
        "Before telling the user you cannot do something, check this catalog",
      )
    ) {
      throw new Error("search_tools description lacks the catalog instruction");
    }
  });

  await test("discoveryScope is ignored while discovery is off", async () => {
    const { names } = await sendWithRegisteredTools({
      discoveryScope: "all",
      discoveryAlwaysVisible: ["keep_*"],
    });
    if (names.includes("search_tools")) {
      throw new Error("search_tools appeared with discovery off");
    }
    for (const name of REGISTERED_TOOLS) {
      if (!names.includes(name)) {
        throw new Error(`${name} was not sent with discovery off`);
      }
    }
  });

  await test('discoveryScope "all" keeps a per-call toolFilter name in full', async () => {
    const { names } = await sendWithRegisteredTools(
      { discovery: true, discoveryScope: "all" },
      { toolFilter: ["orders_lookup"] },
    );
    if (!names.includes("orders_lookup")) {
      throw new Error("a tool named by toolFilter was deferred");
    }
  });

  await test('discoveryScope "all" keeps a forced toolChoice tool in full and defers the rest', async () => {
    const { names } = await sendWithRegisteredTools(
      { discovery: true, discoveryScope: "all" },
      { toolChoice: { type: "tool", toolName: "sales_report" } },
    );
    if (!names.includes("sales_report")) {
      throw new Error("the forced sales_report was deferred");
    }
    if (names.includes("orders_lookup")) {
      throw new Error("orders_lookup was sent in full instead of deferred");
    }
  });

  await test("an unknown discoveryScope falls back to external, which defers no registered tool", async () => {
    const { names } = await sendWithRegisteredTools({
      discovery: true,
      discoveryScope: String("everything") as ToolConfig["discoveryScope"],
    });
    for (const name of REGISTERED_TOOLS) {
      if (!names.includes(name)) {
        throw new Error(`${name} was deferred under the fallback scope`);
      }
    }
  });

  await test("discoveryAlwaysVisible: a bare string is read as one pattern, a malformed value is ignored", async () => {
    const asList = await sendWithRegisteredTools({
      discovery: true,
      discoveryScope: "all",
      discoveryAlwaysVisible: "keep_*" as unknown as string[],
    });
    if (!asList.names.includes("keep_time")) {
      throw new Error("a bare-string pattern did not keep keep_time hot");
    }
    const ignored = await sendWithRegisteredTools({
      discovery: true,
      discoveryScope: "all",
      discoveryAlwaysVisible: 5 as unknown as string[],
    });
    if (ignored.names.includes("keep_time")) {
      throw new Error("a malformed list kept keep_time hot");
    }
    if (!ignored.names.includes("search_tools")) {
      throw new Error("a malformed list switched discovery off");
    }
  });

  await test('discoveryScope "all" defers the tools NeuroLink registers for its own features unless discoveryAlwaysVisible names them', async () => {
    const registerTasks = (nl: NeuroLink) => nl.registerTaskTools();
    const isTaskTool = (name: string) => name.startsWith("tasks_");
    const deferred = await sendWithRegisteredTools(
      { discovery: true, discoveryScope: "all" },
      {},
      registerTasks,
    );
    if (deferred.names.some(isTaskTool)) {
      throw new Error("a NeuroLink task tool was sent in full under scope all");
    }
    if (!deferred.searchDescription.includes("tasks_create")) {
      throw new Error("tasks_create is missing from the search_tools catalog");
    }
    const kept = await sendWithRegisteredTools(
      {
        discovery: true,
        discoveryScope: "all",
        discoveryAlwaysVisible: ["tasks_*"],
      },
      {},
      registerTasks,
    );
    if (!kept.names.includes("tasks_create")) {
      throw new Error("discoveryAlwaysVisible did not keep tasks_create hot");
    }
  });

  await test('discoveryScope "all": a registered tool search_tools loaded stays in full on the next turn of the same session, and a different session still has it deferred', async () => {
    const server = await startScriptedChatServer([
      toolCall("call_search", "search_tools", { query: "orders_lookup" }),
      chatCompletion({ content: "loaded" }),
      chatCompletion({ content: "again" }),
      chatCompletion({ content: "other session" }),
    ]);
    const nl = new NeuroLink({
      tools: { discovery: true, discoveryScope: "all" },
    });
    for (const name of REGISTERED_TOOLS) {
      nl.registerTool(name, {
        name,
        description: `The ${name} tool.`,
        inputSchema: { type: "object", properties: {}, required: [] },
        execute: async () => ({ ok: true }),
      });
    }
    const turn = (sessionId: string) =>
      nl.generate({
        input: { text: "find the orders tool" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        context: { sessionId },
      });
    try {
      await turn("pinned-session");
      await turn("pinned-session");
      await turn("other-session");
      const requestToolNames = server.getAllRequestBodies().map((raw) => {
        const body = JSON.parse(raw) as {
          tools?: Array<{ function?: { name?: string } }>;
        };
        return (body.tools ?? []).map((entry) => entry.function?.name ?? "");
      });
      assertEqual(requestToolNames.length, 4, "requests sent");
      // Request 0 opens turn 1, 1 follows the search, 2 opens the second turn
      // of the same session, 3 opens a turn of another session.
      if (requestToolNames[0].includes("orders_lookup")) {
        throw new Error("orders_lookup was not deferred before the search");
      }
      if (!requestToolNames[2].includes("orders_lookup")) {
        throw new Error("the pinned orders_lookup was deferred again");
      }
      if (requestToolNames[2].includes("sales_report")) {
        throw new Error("sales_report was sent in full on the pinned turn");
      }
      if (requestToolNames[3].includes("orders_lookup")) {
        throw new Error("the pin leaked into a different session");
      }
    } finally {
      await nl.shutdown();
      await server.close();
    }
  });

  logSection("Part 5 — Mid-turn hydration parity (native loops)");

  await runSuite();
}

main();
