#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — MCP circuit breaker counts resolved isError
 * results as failures
 *
 * The MCP client does not throw on a protocol error — it RESOLVES
 * `{ isError: true, content: [...] }`. Before this fix, inside
 * `circuitBreaker.execute(...)` a resolved `{ isError: true }` result only
 * set the span status and returned: `Promise.race` saw a clean resolve, so
 * `MCPCircuitBreaker` recorded a SUCCESS regardless of the isError flag. A
 * tool that only ever "fails" by resolving an error could therefore never
 * open its own circuit breaker.
 *
 * Drives a real stdio MCP server
 * (test/fixtures/mcp-breaker-resolved-errors-server.mjs) through the shipped
 * `ExternalServerManager` — the same public path production tool calls take
 * (NeuroLink.executeExternalMCPTool -> ExternalServerManager.executeTool ->
 * ToolDiscoveryService.executeTool -> MCPCircuitBreaker.execute) — and
 * proves both properties end to end:
 *
 *   1. A resolved isError result is still returned to the caller unchanged.
 *      No transport error is synthesized in its place.
 *   2. After `minimumCallsBeforeCalculation` (10, the breaker's default)
 *      consecutive resolved-isError calls, the breaker for that tool opens
 *      and the NEXT call is rejected by CircuitBreakerOpenError before it
 *      ever reaches the server — proven by the fixture's own call log, not
 *      just by reading internal breaker state.
 *
 * No AI provider, no network — a real child-process MCP server is the only
 * moving part, so this is fully deterministic.
 *
 * Run: pnpm run build && pnpm run test:mcp-breaker-resolved-errors
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ExternalServerManager,
  globalCircuitBreakerManager,
} from "../dist/index.js";
import type { MCPServerInfo } from "../src/lib/types/index.js";
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
  "MCP breaker counts resolved isError as failure",
  { offline: true, perTestTimeoutMs: 30_000 },
);

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "mcp-breaker-resolved-errors-server.mjs",
);

const TOOL_NAME = "resolve_error";

function textOf(result: unknown): string | undefined {
  const content = (result as { content?: Array<{ text?: string }> })?.content;
  return content?.[0]?.text;
}

function isErrorResult(result: unknown): boolean {
  return (result as { isError?: unknown } | null)?.isError === true;
}

let harnessCounter = 0;

/**
 * One manager + one fixture server per test, with a unique server id, so the
 * global circuit breaker keyed by `tool-execution-<serverId>-<toolName>`
 * never carries state across tests (same reasoning as
 * continuous-test-suite-mcp-stdio-lifecycle.ts's `createHarness`).
 */
async function createHarness() {
  const serverId = `breaker-resolved-errors-${process.pid}-${++harnessCounter}`;
  const breakerName = `tool-execution-${serverId}-${TOOL_NAME}`;
  const dir = mkdtempSync(join(tmpdir(), "nl-breaker-resolved-errors-"));
  const callLog = join(dir, "calls.log");
  const manager = new ExternalServerManager({});

  const config: MCPServerInfo = {
    id: serverId,
    name: serverId,
    description: "resolved-error breaker fixture",
    transport: "stdio",
    status: "initializing",
    tools: [],
    command: process.execPath,
    args: [FIXTURE, callLog],
  };

  const added = await manager.addServer(serverId, config);
  assert(added.success, `addServer did not succeed: ${added.error ?? ""}`);

  const callCount = (): number => {
    try {
      return readFileSync(callLog, "utf8")
        .split("\n")
        .filter((line) => line.length > 0).length;
    } catch {
      return 0;
    }
  };

  const call = (): Promise<unknown> =>
    manager.executeTool(serverId, TOOL_NAME, {});

  const cleanup = async (): Promise<void> => {
    try {
      // Removing (not just leaving it to the unique name) also destroys the
      // breaker's cleanup interval timer, so a long suite run doesn't leak
      // one per test.
      globalCircuitBreakerManager.removeBreaker(breakerName);
      await manager.shutdown();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  return { serverId, breakerName, manager, call, callCount, cleanup };
}

logSection("MCP breaker counts resolved isError as failure");

await test("10 consecutive resolved isError results still reach the caller unchanged, and open the breaker", async () => {
  const h = await createHarness();
  try {
    for (let i = 1; i <= 10; i++) {
      const result = await h.call();
      assert(
        isErrorResult(result),
        // Structural diagnostics only: interpolating the payload here could
        // make defineSuite classify a real failure as a provider-side skip.
        `call ${i}: expected a resolved isError result (isError !== true)`,
      );
      assertEqual(
        textOf(result),
        "simulated failure",
        `call ${i}: the resolved value must reach the caller unchanged, ` +
          "not be replaced by a synthesized transport error",
      );
    }
    assertEqual(
      h.callCount(),
      10,
      "the fixture server should have been reached exactly 10 times so far",
    );

    const breaker = globalCircuitBreakerManager.getBreaker(h.breakerName);
    assertEqual(
      breaker.getStats().state,
      "open",
      "the breaker should be open after 10 resolved-isError calls " +
        "(minimumCallsBeforeCalculation=10, failureThreshold=3)",
    );
    assertEqual(
      breaker.getStats().failedCalls,
      10,
      "all 10 resolved-isError calls should be counted as breaker failures",
    );

    let threw: Error | undefined;
    try {
      await h.call();
    } catch (err) {
      threw = err instanceof Error ? err : new Error(String(err));
    }
    assert(
      threw !== undefined,
      "the 11th call should be rejected once the breaker is open, not " +
        "resolved with another isError result",
    );
    assert(
      (threw as Error).message.includes("Circuit breaker") &&
        (threw as Error).message.includes("is open"),
      `expected a circuit-breaker-open error, got: ${(threw as Error).message}`,
    );
    assertEqual(
      h.callCount(),
      10,
      "the 11th call must be short-circuited by the open breaker before " +
        "it ever reaches the server",
    );
  } finally {
    await h.cleanup();
  }
});

await test("a single resolved isError call is counted as a breaker failure but does not open the breaker on its own", async () => {
  const h = await createHarness();
  try {
    const result = await h.call();
    assert(
      isErrorResult(result),
      "expected a resolved isError result from the fixture",
    );
    const breaker = globalCircuitBreakerManager.getBreaker(h.breakerName);
    assertEqual(
      breaker.getStats().state,
      "closed",
      "one resolved-isError call must not open the breaker " +
        "(below minimumCallsBeforeCalculation)",
    );
    assertEqual(
      breaker.getStats().failedCalls,
      1,
      "the resolved isError result must still be counted as a breaker " +
        "failure even while the breaker stays closed",
    );
  } finally {
    await h.cleanup();
  }
});

await test("a resolved isError call is reflected in getStatistics()'s totalErrors, matching the breaker/ToolDiscoveryService failure count", async () => {
  const h = await createHarness();
  try {
    const before = h.manager.getStatistics();
    assertEqual(
      before.totalErrors,
      0,
      "no calls have been made yet, so totalErrors should start at 0",
    );

    const result = await h.call();
    assert(
      isErrorResult(result),
      "expected a resolved isError result from the fixture",
    );

    const after = h.manager.getStatistics();
    assertEqual(
      after.totalErrors,
      before.totalErrors + 1,
      "a resolved isError result must be counted in getStatistics()'s " +
        "totalErrors (and therefore NeuroLink.getExternalMCPStatistics()), " +
        "the same way it is already counted by the circuit breaker " +
        "and ToolDiscoveryService's failedCalls",
    );
  } finally {
    await h.cleanup();
  }
});

await test("caller-cancelled calls (aborted signal) are not counted as breaker failures", async () => {
  const h = await createHarness();
  const hangBreaker = `tool-execution-${h.serverId}-hang`;
  try {
    for (let i = 1; i <= 4; i++) {
      const controller = new AbortController();
      const pending = h.manager
        .executeTool(h.serverId, "hang", {}, { signal: controller.signal })
        .then(
          () => undefined,
          (err: unknown) => ({
            err,
            abortedWhenRejected: controller.signal.aborted,
          }),
        );
      setTimeout(() => controller.abort(), 150);
      const outcome = await pending;
      assert(
        outcome !== undefined &&
          typeof outcome === "object" &&
          "abortedWhenRejected" in outcome &&
          outcome.abortedWhenRejected === true,
        `call ${i}: expected the call to reject only after the signal aborted ` +
          "(rejecting earlier means it never reached the hang tool)",
      );
    }
    assert(
      globalCircuitBreakerManager.getBreakerNames().includes(hangBreaker),
      "the hang tool's breaker must already exist, i.e. the calls reached " +
        "breaker execution, before its stats are read",
    );
    const breaker = globalCircuitBreakerManager.getBreaker(hangBreaker);
    assertEqual(
      breaker.getStats().failedCalls,
      0,
      "aborted calls must not be recorded as breaker failures",
    );
    assertEqual(breaker.getStats().state, "closed", "breaker must stay closed");
  } finally {
    globalCircuitBreakerManager.removeBreaker(hangBreaker);
    await h.cleanup();
  }
});

await runSuite();
