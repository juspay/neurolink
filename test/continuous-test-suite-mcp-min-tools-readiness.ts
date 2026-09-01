#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — MCP external server minTools readiness gate
 *
 * `ExternalServerManager.addServer` used to report `success: true`,
 * `connected`/`healthy`, for a stdio server that discovered zero tools —
 * indistinguishable from a legitimate resource/prompt-only server and from a
 * server that is quietly broken. There was no way for a caller to require a
 * minimum tool count.
 *
 * Fix: additive `minTools?: number` on `MCPServerInfo` (default 0, so a
 * resource/prompt-only server registers exactly as before). When discovery
 * finds fewer tools than the configured floor, `startServer` tears the
 * connection back down before it is ever marked connected or registered with
 * health monitoring, and `addServer` returns a typed non-ready result
 * (`metadata.readiness: "insufficient_tools"`, `metadata.toolsDiscovered`)
 * instead of `success: true`.
 *
 * Drives real stdio MCP servers (test/fixtures/mcp-zero-tools-server.mjs,
 * which speaks the `tools` capability but advertises none, and the shared
 * test/fixtures/mcp-stdio-lifecycle-server.mjs, which advertises three)
 * through the shipped `ExternalServerManager` and `NeuroLink` — the same
 * public surfaces callers use. No AI provider, no network.
 *
 * The `NeuroLink`-level test compares `getMCPStatus()` before/after rather
 * than asserting absolute counts: `initializeMCP()` (which `getMCPStatus()`
 * calls internally) auto-loads its own default servers in this environment
 * (observed: a `filesystem` server), so an absolute-zero assertion would be
 * fragile against environment config, not the behaviour under test. The
 * delta is what the fix actually promises: adding and rejecting one more
 * server must not move the connected/total counts.
 *
 * Run: pnpm run build && pnpm run test:mcp:min-tools-readiness
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ExternalServerManager, NeuroLink } from "../dist/index.js";
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
  "MCP external server minTools readiness",
  {
    offline: true,
  },
);

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const ZERO_TOOLS_FIXTURE = join(FIXTURES_DIR, "mcp-zero-tools-server.mjs");
const THREE_TOOLS_FIXTURE = join(
  FIXTURES_DIR,
  "mcp-stdio-lifecycle-server.mjs",
);

let harnessCounter = 0;

/**
 * One manager per test, unique server id so restart/circuit-breaker state
 * keyed by server id never carries across tests.
 */
function createManagerHarness() {
  const serverId = `min-tools-readiness-${process.pid}-${++harnessCounter}`;
  const manager = new ExternalServerManager({});

  const addServer = (
    fixture: string,
    minTools?: number,
  ): ReturnType<ExternalServerManager["addServer"]> => {
    const config: MCPServerInfo = {
      id: serverId,
      name: serverId,
      description: "minTools readiness fixture",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: process.execPath,
      args: [fixture],
      minTools,
    };
    return manager.addServer(serverId, config);
  };

  const cleanup = async (): Promise<void> => {
    await manager.shutdown();
  };

  return { serverId, manager, addServer, cleanup };
}

/**
 * Summarize an `addServer` result for a failure message without
 * `JSON.stringify`-ing it: `result.data` carries the live MCP client and
 * transport on the success path, which hold circular references (observed:
 * a zod `SchemaEnv` whose `root` points back at itself) that throw out of
 * `JSON.stringify` regardless of whether the assertion actually failed —
 * the message argument is evaluated eagerly either way.
 */
function describeResult(result: {
  success: boolean;
  error?: string;
  metadata?: { readiness?: unknown; toolsDiscovered?: unknown };
}): string {
  return `success=${result.success} error=${result.error ?? "<none>"} readiness=${String(
    result.metadata?.readiness,
  )} toolsDiscovered=${String(result.metadata?.toolsDiscovered)}`;
}

logSection("MCP external server minTools readiness");

await test("default config (minTools unset) still registers a zero-tool server as ready — compat", async () => {
  const h = createManagerHarness();
  try {
    const result = await h.addServer(ZERO_TOOLS_FIXTURE);
    assert(
      result.success === true,
      `expected success:true for a zero-tool server with minTools unset, got ${describeResult(result)}`,
    );
    assertEqual(
      result.metadata?.readiness,
      "ready",
      "unset minTools should report readiness 'ready'",
    );
    assertEqual(
      result.metadata?.toolsDiscovered,
      0,
      "toolsDiscovered should reflect the zero tools the fixture exposes",
    );
    assertEqual(
      h.manager.getServer(h.serverId)?.status,
      "connected",
      "the server should be registered as connected",
    );
    const stats = h.manager.getStatistics();
    assertEqual(
      stats.connectedServers,
      1,
      "getStatistics() should count the zero-tool server as connected",
    );
  } finally {
    await h.cleanup();
  }
});

await test("minTools:1 rejects a zero-tool server with a typed insufficient_tools result and tears it down", async () => {
  const h = createManagerHarness();
  try {
    const result = await h.addServer(ZERO_TOOLS_FIXTURE, 1);
    assert(
      result.success === false,
      `expected success:false when discovered tools (0) < minTools (1), got ${describeResult(result)}`,
    );
    assertEqual(
      result.metadata?.readiness,
      "insufficient_tools",
      "readiness should be 'insufficient_tools'",
    );
    assertEqual(
      result.metadata?.toolsDiscovered,
      0,
      "toolsDiscovered should be reported even on the rejected path",
    );
    assert(
      (result.error ?? "").includes("minTools"),
      `error message should explain the minTools gate, got: ${result.error}`,
    );
    assertEqual(
      h.manager.getServer(h.serverId),
      undefined,
      "a rejected registration must not remain registered",
    );
    const stats = h.manager.getStatistics();
    assertEqual(
      stats.connectedServers,
      0,
      "getStatistics() must not count a minTools-rejected server as connected",
    );
  } finally {
    await h.cleanup();
  }
});

await test("minTools:2 still registers a server whose discovered tools clear the floor", async () => {
  const h = createManagerHarness();
  try {
    const result = await h.addServer(THREE_TOOLS_FIXTURE, 2);
    assert(
      result.success === true,
      `expected success:true when discovered tools (3) >= minTools (2), got ${describeResult(result)}`,
    );
    assertEqual(result.metadata?.readiness, "ready");
    assertEqual(result.metadata?.toolsDiscovered, 3);
    assertEqual(h.manager.getStatistics().connectedServers, 1);
  } finally {
    await h.cleanup();
  }
});

await test("getMCPStatus() does not count a minTools-rejected server as connected — public NeuroLink path", async () => {
  const serverId = `min-tools-readiness-sdk-${process.pid}-${++harnessCounter}`;
  const sdk = new NeuroLink({});
  try {
    const before = await sdk.getMCPStatus();

    const config: MCPServerInfo = {
      id: serverId,
      name: serverId,
      description: "minTools readiness fixture (SDK path)",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: process.execPath,
      args: [ZERO_TOOLS_FIXTURE],
      minTools: 1,
    };

    const added = await sdk.addExternalMCPServer(serverId, config);
    assert(
      added.success === false,
      `expected the SDK's public addExternalMCPServer to surface the same rejection, got ${describeResult(added)}`,
    );
    assertEqual(added.metadata?.readiness, "insufficient_tools");

    const after = await sdk.getMCPStatus();
    assertEqual(
      after.externalMCPConnectedCount,
      before.externalMCPConnectedCount,
      "adding and rejecting a minTools-insufficient server must not change externalMCPConnectedCount",
    );
    assertEqual(
      after.externalMCPServersCount,
      before.externalMCPServersCount,
      "a minTools-rejected server must not remain listed in externalMCPServers",
    );
    assert(
      !(after.externalMCPServers ?? []).some(
        (server) => server.id === serverId,
      ),
      "the rejected server id must not appear in externalMCPServers",
    );
  } finally {
    await sdk.dispose();
  }
});

await runSuite();
