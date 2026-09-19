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

// PR #1753 review follow-up (CodeRabbit stringDistance.ts:36, CodeQL
// js/loop-bound-injection).
//
// A *registered* tool name over MAX_COMPARABLE_LENGTH (128) is not reachable
// here: every tool-registration path in this codebase (toolConverter.ts,
// parameterValidation.ts) rejects/drops names over 64 characters before they
// ever reach discovery — confirmed empirically, registering a 141-char tool
// name on the fixture server left it absent from `toolsDiscovered`. So the
// only unbounded side of a `resolveToolName`/`rankToolNameCandidates`
// comparison a caller can actually produce is the *requested* name — the
// exact thing that didn't match, from `executeExternalMCPTool`'s public
// `toolName` argument, which carries no length limit of its own.
//
// `LONG_MISLEADING_NAME` is built by near-repeating "search_c0de" (one
// substitution away from the real tool "search_code", so it shares most of
// its characters without ever containing "search_code" as a contiguous
// substring — verified below, and re-verified by the SKIP guard in
// `withServer` callers — so `resolveToolName`'s earlier case/substring
// strategies never fire and only the Levenshtein-based ranking is exercised).
// Pre-fix, `levenshtein()` truncated both operands to 128 chars before
// comparing, so this padded near-repeat of "search_code" collapsed close
// enough to it (post-truncation) to rank first in `rankToolNameCandidates` —
// a truncation artifact, not genuine similarity to what was actually typed.
const LONG_MISLEADING_NAME = "search_c0de".repeat(13); // 143 chars
for (const tool of FIXTURE_TOOLS) {
  if (
    LONG_MISLEADING_NAME.includes(tool) ||
    tool.includes(LONG_MISLEADING_NAME)
  ) {
    throw new Error(
      "LONG_MISLEADING_NAME must not literally contain (or be contained by) a real fixture tool name — that would resolve via the substring strategy instead of exercising the Levenshtein path this test targets",
    );
  }
}

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

await test("an over-limit requested name fails closed with candidates in registration order, not truncation-artifact order", () =>
  withServer(async (sdk, serverId) => {
    spans.reset();

    let threw: unknown;
    try {
      await sdk.executeExternalMCPTool(serverId, LONG_MISLEADING_NAME, {});
    } catch (err) {
      threw = err;
    }

    // The pre-fix bug's failure mode was still a throw here (no real tool
    // name is long enough to tie at distance 0), but with `candidates`
    // ordered by a comparison against a 128-char-truncated prefix of
    // LONG_MISLEADING_NAME — which happens to favor "search_code" — rather
    // than the caller's actual (untruncated) input. So the precondition is
    // just that this rejects; the assertion that matters is candidate order.
    assert(
      threw !== undefined,
      "expected an over-limit requested name with no unambiguous match to throw",
    );
    const err = threw as {
      name?: string;
      requestedName?: unknown;
      serverId?: unknown;
      candidates?: unknown;
    };
    assertEqual(
      err.name,
      "ExternalMcpToolNotFoundError",
      "wrong error type for an unresolved over-limit name",
    );
    assertEqual(err.requestedName, LONG_MISLEADING_NAME);
    assertEqual(err.serverId, serverId);
    assert(
      Array.isArray(err.candidates),
      "typed error did not carry a candidate list",
    );
    for (const candidate of err.candidates as unknown[]) {
      assert(
        FIXTURE_TOOLS.includes(candidate as string),
        `candidate "${String(candidate)}" is not one of the server's real tools`,
      );
    }

    // Crux assertion: with the requested name over MAX_COMPARABLE_LENGTH,
    // `rankToolNameCandidates` scores every tool as equally
    // Number.POSITIVE_INFINITY away (see toolCallRepair.ts) instead of
    // comparing truncated prefixes, so a stable sort leaves candidates in
    // registration order — not the order a truncation artifact would favor.
    const candidateOrder = JSON.stringify(err.candidates);
    const registrationOrder = JSON.stringify(FIXTURE_TOOLS);
    assert(
      candidateOrder === registrationOrder,
      "candidate order does not match server registration order — mismatch at the candidate-list shape",
    );

    const repairSpan = spans
      .finished()
      .find((s) => s.name === "neurolink.mcp.toolNameRepair");
    assert(
      repairSpan === undefined,
      "no repair should have been recorded — an unresolved over-limit name must not silently execute any tool",
    );
  }));

// The length a guard checks has to be the length that gets compared. "İ"
// lowercases to two code units, so this name is within the limit as passed and
// one past it once lowercased — a guard on the raw name lets it through to a
// comparison that refuses it.
const LOWERCASE_GROWS_PAST_LIMIT = "İ" + "x".repeat(127);

await test("a name that exceeds the comparison limit only once lowercased fails closed as not-found", () =>
  withServer(async (sdk, serverId) => {
    assert(
      LOWERCASE_GROWS_PAST_LIMIT.length === 128 &&
        LOWERCASE_GROWS_PAST_LIMIT.toLowerCase().length === 129,
      "precondition: the fixture must straddle the limit only after lowercasing",
    );

    let threw: unknown;
    try {
      await sdk.executeExternalMCPTool(
        serverId,
        LOWERCASE_GROWS_PAST_LIMIT,
        {},
      );
    } catch (err) {
      threw = err;
    }
    assert(threw !== undefined, "an unmatched tool name must reject");
    assertEqual(
      (threw as { name?: string }).name,
      "ExternalMcpToolNotFoundError",
      "the name-repair path threw something other than the typed not-found error",
    );
  }));

await runSuite();
