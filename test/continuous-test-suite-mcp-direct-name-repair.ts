#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — direct MCP execution boundary name repair
 *
 * `createToolCallRepair()` (src/lib/utils/toolCallRepair.ts) only runs inside
 * the AI-SDK's own streamText/generateText loop via
 * `experimental_repairToolCall`. A near-miss tool name reaching
 * `NeuroLink.executeExternalMCPTool()` directly — the path Curator's
 * MCPService.callTool and any other non-generation caller uses — had no
 * recovery at all: `ToolDiscoveryService.executeTool` threw a bare
 * `Tool 'x' not found for server 'y'` `Error` with no candidates.
 *
 * Strategy: REAL stdio MCP server (test/fixtures/mcp-direct-name-repair-server.mjs),
 * connected through the public `sdk.addExternalMCPServer()`, driving
 * `sdk.executeExternalMCPTool()` directly — no AI-SDK generation loop
 * involved, no network, no provider credentials. Span capture (real
 * OpenTelemetry, see helpers/spanCapture.ts) proves a repair was recorded,
 * not just that a call happened to succeed.
 *
 * Run: pnpm run build && pnpm run test:mcp-direct-name-repair
 */

// Install OTel span capture BEFORE importing NeuroLink so production tracers
// pick up the in-memory exporter (see continuous-test-suite-mcp-spans.ts).
import { installSpanCapture } from "./helpers/spanCapture.js";
const spans = installSpanCapture();

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NeuroLink } from "../dist/index.js";
import {
  assert,
  assertEqual,
  defineSuite,
  logSection,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite(
  "MCP direct execution boundary name repair",
  {
    offline: true,
  },
);

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "mcp-direct-name-repair-server.mjs",
);

// The fixture's tool set (test/fixtures/mcp-direct-name-repair-server.mjs).
// Kept here too so a test can assert on ranking without importing the fixture.
const FIXTURE_TOOLS = ["get_pull_request", "list_pull_requests", "search_code"];

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> })?.content;
  return content?.[0]?.text ?? "";
}

let harnessCounter = 0;

/**
 * One NeuroLink instance + one real stdio fixture server per test, so a
 * misbehaving test cannot leak process state into another. Shuts down via
 * `shutdownExternalMCPServers()` rather than `dispose()`: `dispose()` also
 * tears down OpenTelemetry (flush + shutdown), which would poison span
 * capture for every later test in this file.
 */
async function withServer(
  body: (sdk: NeuroLink, serverId: string) => Promise<void>,
): Promise<void> {
  const serverId = `direct-name-repair-${process.pid}-${++harnessCounter}`;
  const sdk = new NeuroLink({});

  const added = await sdk.addExternalMCPServer(serverId, {
    id: serverId,
    name: serverId,
    description: "direct name repair fixture",
    transport: "stdio",
    status: "initializing",
    tools: [],
    command: process.execPath,
    args: [FIXTURE],
  });
  assert(
    added.success,
    `fixture server failed to connect: ${JSON.stringify(added.error)}`,
  );
  assertEqual(
    added.metadata?.toolsDiscovered,
    FIXTURE_TOOLS.length,
    "fixture server did not discover its declared tool set",
  );

  try {
    await body(sdk, serverId);
  } finally {
    await sdk.shutdownExternalMCPServers();
  }
}

logSection("Direct MCP execution boundary name repair");

await test("resolves a near-miss name, actually invokes the resolved tool, and records repair metadata on a span", () =>
  withServer(async (sdk, serverId) => {
    spans.reset();

    const result = await sdk.executeExternalMCPTool(
      serverId,
      "get_pull_reques", // missing trailing "t" — unambiguous substring of get_pull_request
      { echo: "probe" },
    );

    // Proves the REPAIRED tool actually ran (not merely that the call didn't
    // throw) — the fixture echoes its own name back in the response.
    assertEqual(
      textOf(result),
      "ran:get_pull_request:probe",
      "the resolved tool was not the one actually executed",
    );

    const repairSpan = spans
      .finished()
      .find((s) => s.name === "neurolink.mcp.toolNameRepair");
    assert(
      repairSpan !== undefined,
      "no neurolink.mcp.toolNameRepair span was recorded for the repair",
    );
    const attrs = repairSpan!.attributes;
    assertEqual(
      attrs["mcp.tool_name.requested"],
      "get_pull_reques",
      "span did not record the requested name",
    );
    assertEqual(
      attrs["mcp.tool_name.resolved"],
      "get_pull_request",
      "span did not record the resolved name",
    );
    assert(
      typeof attrs["mcp.tool_name.repair_strategy"] === "string",
      "span did not record which repair strategy matched",
    );
  }));

await test("an exact tool name is executed unchanged with no repair span", () =>
  withServer(async (sdk, serverId) => {
    spans.reset();

    const result = await sdk.executeExternalMCPTool(serverId, "search_code", {
      echo: "exact",
    });

    assertEqual(textOf(result), "ran:search_code:exact");
    const repairSpan = spans
      .finished()
      .find((s) => s.name === "neurolink.mcp.toolNameRepair");
    assert(
      repairSpan === undefined,
      "an exact-name call must not be recorded as a repair (would change existing-caller behaviour)",
    );
  }));

await test("an unrelated name throws a typed not-found error carrying candidates", () =>
  withServer(async (sdk, serverId) => {
    let threw: unknown;
    try {
      await sdk.executeExternalMCPTool(serverId, "totally_unrelated_zzz", {});
    } catch (err) {
      threw = err;
    }

    assert(threw !== undefined, "expected executeExternalMCPTool to throw");
    const err = threw as {
      name?: string;
      message?: string;
      candidates?: unknown;
      requestedName?: unknown;
      serverId?: unknown;
    };
    assertEqual(
      err.name,
      "ExternalMcpToolNotFoundError",
      "not-found error is not distinguishable by name from a generic Error",
    );
    assertEqual(err.requestedName, "totally_unrelated_zzz");
    assertEqual(err.serverId, serverId);
    assert(
      Array.isArray(err.candidates) && err.candidates.length > 0,
      "typed error did not carry a candidate list",
    );
    for (const candidate of err.candidates as unknown[]) {
      assert(
        FIXTURE_TOOLS.includes(candidate as string),
        `candidate "${String(candidate)}" is not one of the server's real tools`,
      );
    }
  }));

await runSuite();
