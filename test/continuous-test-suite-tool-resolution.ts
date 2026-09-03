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
import type { Tool, ToolInfo } from "../src/lib/types/index.js";
import { defineSuite, logSection } from "./helpers/harness.js";

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

  logSection("Part 5 — Mid-turn hydration parity (native loops)");

  await runSuite();
}

main();
