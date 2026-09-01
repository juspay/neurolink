#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — stdio MCP server lifecycle
 *
 * Reproduces the CI failure where a stdio MCP server (code-review-graph, a
 * single-threaded Python server) died two minutes into a review and NeuroLink
 * never noticed: every later call failed with "Not connected" while the
 * manager still reported the server as connected and never restarted it,
 * although it has restart logic. The cause was a startup probe that spawned
 * the command a second time — every lifecycle hook watched the probe, the
 * real process was unobserved, its stderr was discarded, and the probe
 * leaked as an orphan on every shutdown.
 *
 * Drives a real stdio MCP server (test/fixtures/mcp-stdio-lifecycle-server.mjs)
 * through the shipped ExternalServerManager and kills, wedges, crashes,
 * stops and boot-fails it the way production servers die. No AI provider,
 * no network.
 *
 * Run: pnpm run build && pnpm run test:mcp:stdio-lifecycle
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ExternalServerManager } from "../dist/index.js";
import type {
  ExternalMCPServerEvents,
  ExternalMCPServerHealth,
  MCPServerInfo,
} from "../src/lib/types/index.js";
import { assert, defineSuite, logSection } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("MCP stdio lifecycle", {
  offline: true,
  perTestTimeoutMs: 90_000,
});

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "mcp-stdio-lifecycle-server.mjs",
);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  what: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await sleep(50);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}`);
}

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> })?.content;
  return content?.[0]?.text ?? "";
}

let harnessCounter = 0;

/**
 * One manager + one fixture server per test. Every server id is unique so the
 * global circuit breakers keyed by server id never carry state across tests.
 */
async function createHarness(
  overrides: { healthCheckInterval?: number; autoRestart?: boolean } = {},
) {
  const serverId = `stdio-lifecycle-${process.pid}-${++harnessCounter}`;
  const dir = mkdtempSync(join(tmpdir(), "nl-stdio-lifecycle-"));
  const spawnLog = join(dir, "spawns.log");
  const manager = new ExternalServerManager({
    defaultHealthCheckInterval: overrides.healthCheckInterval ?? 500,
    maxRestartAttempts: 3,
    // Constant 1s backoff keeps the restart tests fast and deterministic.
    restartBackoffMultiplier: 1,
  });

  const disconnected: string[] = [];
  const health: ExternalMCPServerHealth[] = [];
  let connected = 0;
  manager.on(
    "disconnected",
    (event: ExternalMCPServerEvents["disconnected"]) => {
      disconnected.push(event.reason ?? "");
    },
  );
  manager.on("connected", () => {
    connected++;
  });
  manager.on("healthCheck", (event: ExternalMCPServerEvents["healthCheck"]) => {
    health.push(event.health);
  });

  const add = (mode: "serve" | "die-on-start" = "serve") => {
    const config: MCPServerInfo = {
      id: serverId,
      name: serverId,
      description: "stdio lifecycle fixture",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: process.execPath,
      args: [FIXTURE, mode, spawnLog],
      autoRestart: overrides.autoRestart,
    };
    return manager.addServer(serverId, config);
  };

  const spawnedPids = (): number[] => {
    try {
      return readFileSync(spawnLog, "utf8")
        .split("\n")
        .filter((line) => line.length > 0)
        .map(Number);
    } catch {
      return [];
    }
  };

  const whoami = async (): Promise<number> =>
    Number(textOf(await manager.executeTool(serverId, "whoami", {})));

  const cleanup = async (): Promise<void> => {
    try {
      await manager.shutdown();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  return {
    serverId,
    manager,
    add,
    spawnedPids,
    whoami,
    disconnected,
    health,
    connectedCount: () => connected,
    cleanup,
  };
}

// ============================================================
// Tests
// ============================================================

logSection("stdio MCP server lifecycle");

await test("server is spawned once and its real pid is reported", async () => {
  const h = await createHarness();
  try {
    const added = await h.add();
    assert(added.success, "addServer did not succeed");

    const pid = await h.whoami();
    const spawned = h.spawnedPids();
    assert(
      spawned.length === 1,
      `expected exactly one spawned server process, saw ${spawned.length}`,
    );
    assert(
      spawned[0] === pid,
      "the process answering tool calls is not the one that was spawned",
    );
    assert(
      h.manager.getServer(h.serverId)?.pid === pid,
      "manager does not report the pid of the live server",
    );
  } finally {
    await h.cleanup();
  }
});

await test("SIGKILL mid-session is observed and the server restarts", async () => {
  const h = await createHarness();
  try {
    assert((await h.add()).success, "addServer did not succeed");
    const pid = await h.whoami();

    process.kill(pid, "SIGKILL");

    await waitFor(
      () => h.disconnected.length > 0,
      5_000,
      "the manager to observe the dead server",
    );
    assert(
      h.disconnected[0].includes(String(pid)),
      "disconnect reason does not name the pid that died",
    );

    await waitFor(
      () => h.connectedCount() >= 2,
      15_000,
      "the server to be restarted",
    );
    const newPid = await h.whoami();
    assert(newPid !== pid, "restart did not produce a new server process");
    assert(
      h.spawnedPids().length === 2,
      `expected two spawns after one restart, saw ${h.spawnedPids().length}`,
    );

    const server = h.manager.getServer(h.serverId);
    assert(
      server?.status === "connected",
      "server is not connected after restart",
    );
    assert(
      server?.reconnectAttempts === 0,
      "attempt counter was not reset after a successful restart",
    );
    assert(
      h.disconnected.length === 1,
      "the restart's own close was treated as a second crash",
    );
  } finally {
    await h.cleanup();
  }
});

await test("a crash's stderr is surfaced in the disconnect reason", async () => {
  const h = await createHarness();
  try {
    assert((await h.add()).success, "addServer did not succeed");
    await h.whoami();

    try {
      await h.manager.executeTool(h.serverId, "crash", {});
    } catch {
      // The exit can cut the response short; the disconnect is what matters.
    }

    await waitFor(
      () => h.disconnected.length > 0,
      5_000,
      "the manager to observe the crash",
    );
    assert(
      h.disconnected[0].includes("fixture crash marker"),
      "disconnect reason does not carry the server's last stderr lines",
    );
    assert(
      (h.manager.getServer(h.serverId)?.lastError ?? "").includes(
        "fixture crash marker",
      ),
      "lastError does not carry the server's last stderr lines",
    );

    await waitFor(
      () => h.connectedCount() >= 2,
      15_000,
      "the server to be restarted after the crash",
    );
    assert(
      (await h.whoami()) > 0,
      "restarted server does not answer tool calls",
    );
  } finally {
    await h.cleanup();
  }
});

await test("a wedged server fails the ping health check and is restarted", async () => {
  const h = await createHarness({ healthCheckInterval: 400 });
  try {
    assert((await h.add()).success, "addServer did not succeed");
    const pid = await h.whoami();

    // Alive but frozen: no close event will ever fire for this process.
    process.kill(pid, "SIGSTOP");

    await waitFor(
      () => h.health.some((entry) => !entry.isHealthy),
      5_000,
      "a failed health check",
    );
    await waitFor(
      () => h.disconnected.length > 0,
      10_000,
      "the manager to give up on the unresponsive server",
    );
    assert(
      h.disconnected[0].includes("idle"),
      "restart reason does not say the server was idle and unresponsive",
    );

    await waitFor(
      () => h.connectedCount() >= 2,
      30_000,
      "the server to be restarted",
    );
    await waitFor(
      () => !isAlive(pid),
      5_000,
      "the frozen process to be reaped",
    );
    const newPid = await h.whoami();
    assert(newPid !== pid, "restart did not produce a new server process");
  } finally {
    await h.cleanup();
  }
});

await test("a server busy with a tool call is not mistaken for a hung one", async () => {
  const h = await createHarness({ healthCheckInterval: 300 });
  try {
    assert((await h.add()).success, "addServer did not succeed");
    await h.whoami();

    const result = await h.manager.executeTool(h.serverId, "block", {
      ms: 2_500,
    });
    assert(textOf(result) === "blocked", "blocking tool did not complete");

    assert(
      h.health.some(
        (entry) =>
          !entry.isHealthy &&
          entry.issues.some((issue) => issue.includes("in flight")),
      ),
      "no health check attributed the missed ping to the in-flight tool call",
    );

    await sleep(1_000);
    assert(h.disconnected.length === 0, "a busy server was restarted");
    assert(
      h.manager.getServer(h.serverId)?.status === "connected",
      "server is not connected after the blocking call",
    );
    assert(
      h.spawnedPids().length === 1,
      "the server was respawned during a blocking call",
    );
    await waitFor(
      () => h.health.length > 0 && h.health[h.health.length - 1].isHealthy,
      5_000,
      "health to recover once the call finished",
    );
  } finally {
    await h.cleanup();
  }
});

await test("an intentional stop is not treated as a crash", async () => {
  const h = await createHarness();
  try {
    assert((await h.add()).success, "addServer did not succeed");
    const pid = await h.whoami();

    const removed = await h.manager.removeServer(h.serverId);
    assert(removed.success, "removeServer did not succeed");

    await waitFor(() => !isAlive(pid), 5_000, "the server process to exit");
    // Long enough for a wrongly scheduled restart (1s backoff) to have fired.
    await sleep(1_500);
    // removeServer emits its own "Manually removed" disconnect by design; the
    // close it performs must not additionally be reported as a crash.
    assert(
      h.disconnected.length === 1 &&
        !h.disconnected[0].includes("process closed"),
      "the removal's own close was reported as a crash",
    );
    assert(h.spawnedPids().length === 1, "removing the server respawned it");
    assert(
      h.manager.getServer(h.serverId) === undefined,
      "removed server is still registered",
    );
  } finally {
    await h.cleanup();
  }
});

await test("a server that dies on boot reports its stderr in the add error", async () => {
  const h = await createHarness();
  try {
    const added = await h.add("die-on-start");
    assert(
      !added.success,
      "addServer succeeded for a server that exited on boot",
    );
    assert(
      (added.error ?? "").includes("fixture boot failure marker"),
      "add error does not carry the server's stderr",
    );
    assert(
      h.manager.getServer(h.serverId) === undefined,
      "a server that failed to boot was left registered",
    );
  } finally {
    await h.cleanup();
  }
});

await test("shutdown leaves no server process behind", async () => {
  const h = await createHarness();
  try {
    assert((await h.add()).success, "addServer did not succeed");
    const pid = await h.whoami();

    await h.manager.shutdown();

    await waitFor(() => !isAlive(pid), 5_000, "the server process to exit");
    assert(
      h.spawnedPids().every((spawned) => !isAlive(spawned)),
      "a spawned server process outlived shutdown",
    );
  } finally {
    await h.cleanup();
  }
});

await runSuite();
