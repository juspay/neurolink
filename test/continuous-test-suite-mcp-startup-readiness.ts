#!/usr/bin/env tsx
/** Actual stdio lifecycle/discovery interleavings through one shipped public SDK graph. */
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import {
  ExternalServerManager,
  globalCircuitBreakerManager,
} from "../dist/index.js";
import type { MCPServerInfo } from "../src/lib/types/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
assertDistFresh();
const { test, runSuite } = defineSuite("MCP startup readiness", {
  offline: true,
  perTestTimeoutMs: 15_000,
});
const fixture = fileURLToPath(
  new URL("./fixtures/mcp-startup-server.mjs", import.meta.url),
);
const config = (id: string, mode: string, state?: string): MCPServerInfo => ({
  id,
  name: id,
  description: "Owned inert startup fixture",
  transport: "stdio",
  status: "initializing",
  tools: [],
  command: process.execPath,
  args: [fixture],
  env: {
    FIXTURE_STARTUP_MODE: mode,
    ...(state ? { FIXTURE_STARTUP_STATE: state } : {}),
  },
  timeout: 2000,
  autoRestart: mode === "reconnect",
  minTools: mode === "reconnect" ? 1 : 0,
});
for (const mode of ["close", "reject"] as const) {
  await test(`${mode}: failed discovery never publishes ready with minTools zero`, async () => {
    const manager = new ExternalServerManager({
      enablePerformanceMonitoring: false,
    });
    const id = `owned-${randomUUID()}`;
    let connected = 0;
    manager.on("connected", () => {
      connected++;
    });
    try {
      const result = await manager.addServer(id, config(id, mode));
      assert(
        !result.success,
        "Failed startup discovery was published as ready",
      );
      assert(connected === 0, "A failed startup emitted connected");
      assert(
        manager.getAllTools().length === 0,
        "Failed startup retained tool metadata",
      );
      assert(
        manager.getServer(id) === undefined,
        "Failed add left a live manager entry",
      );
    } finally {
      await manager.shutdown();
    }
  });
}
for (const mode of ["empty", "resources"] as const) {
  await test(`${mode}: a live legitimate zero-tool server remains ready`, async () => {
    const manager = new ExternalServerManager({
      enablePerformanceMonitoring: false,
    });
    const id = `owned-${randomUUID()}`;
    try {
      const result = await manager.addServer(id, config(id, mode));
      assert(result.success, "A legitimate zero-tool server was rejected");
      assert(
        manager.getServer(id)?.status === "connected",
        "Zero-tool server is not connected",
      );
      assert(
        manager.getAllTools().length === 0,
        "Zero-tool server acquired invented tools",
      );
    } finally {
      await manager.shutdown();
    }
  });
}
await test("discovery close during reconnect retries without stale readiness or old tool metadata", async () => {
  const directory = await mkdtemp(join(tmpdir(), "owned-mcp-startup-"));
  const manager = new ExternalServerManager({
    enablePerformanceMonitoring: false,
  });
  const id = `owned-${randomUUID()}`;
  const readyAttempts: number[] = [];
  const failedTools: string[][] = [];
  manager.on("connected", () => {
    readyAttempts.push(manager.getServer(id)?.metrics.totalConnections ?? 0);
  });
  manager.on("failed", () => {
    failedTools.push(manager.getServerTools(id).map((tool) => tool.name));
  });
  try {
    assert(
      (
        await manager.addServer(
          id,
          config(id, "reconnect", join(directory, "attempt")),
        )
      ).success,
      "Initial connection failed",
    );
    assert(
      manager.getServerTools(id)[0]?.name === "owned_attempt_1",
      "Initial tool fixture did not register",
    );
    await manager.getServer(id)?.client?.close();
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const instance = manager.getServer(id);
      if (
        instance?.status === "connected" &&
        instance.metrics.totalConnections >= 3
      ) {
        break;
      }
      await delay(25);
    }
    assert(
      manager.getServer(id)?.metrics.totalConnections === 3 &&
        manager.getServer(id)?.status === "connected",
      "Startup discovery loss was published as ready instead of recovered",
    );
    assert(
      !readyAttempts.includes(2),
      "A dead reconnect client emitted connected",
    );
    assert(
      failedTools.length === 1 && failedTools[0]?.length === 0,
      "Failed reconnect retained the previous client tool metadata",
    );
    assert(
      manager.getServerTools(id).length === 1 &&
        manager.getServerTools(id)[0]?.name === "owned_attempt_3",
      "Recovery did not replace stale tools with its own discovery",
    );
  } finally {
    await manager.shutdown();
    await rm(directory, { recursive: true, force: true });
  }
});
await test("a barrier-held superseded startup cannot invalidate or leak its ready replacement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "owned-mcp-replacement-"));
  const manager = new ExternalServerManager({
    enablePerformanceMonitoring: false,
  });
  const id = `owned-${randomUUID()}`;
  let original: ReturnType<ExternalServerManager["getServer"]>;
  let replacement: ReturnType<ExternalServerManager["getServer"]>;
  const state = join(directory, "started");
  const oldConfig = config(id, "old", state);
  oldConfig.timeout = 10_000;
  oldConfig.env = {
    ...oldConfig.env,
    FIXTURE_INITIALIZE_RELEASE_PATH: state + ".release",
  };
  const pending = manager.addServer(id, oldConfig);
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (await readFile(state, "utf8").catch(() => null)) {
        break;
      }
      await delay(10);
    }
    original = manager.getServer(id);
    assert(
      original?.client === null,
      "The old fixture was not held in factory initialization",
    );
    assert(
      (await manager.removeServer(id)).success,
      "Could not remove the pending slot",
    );
    assert(
      (await manager.addServer(id, config(id, "new"))).success,
      "Replacement did not attach",
    );
    replacement = manager.getServer(id);
    await writeFile(state + ".release", "release");
    assert(
      !(await pending).success,
      "Superseded startup claimed ownership of its replacement",
    );
    // getServer returns snapshots; ownership is the actual client/transport, not wrapper identity.
    const current = manager.getServer(id);
    assert(
      current !== undefined &&
        current.client === replacement?.client &&
        current.transport === replacement?.transport &&
        current.status === "connected",
      "Superseded startup invalidated its ready replacement",
    );
    assert(
      manager.getServerTools(id)[0]?.name === "replacement_new",
      "Superseded discovery overwrote replacement tools",
    );
    const originalPid = Number(await readFile(state + ".pid", "utf8"));
    assert(
      Number.isSafeInteger(originalPid) && originalPid > 0,
      "Owned fixture PID is unreadable",
    );
    let liveOriginal = false;
    try {
      process.kill(originalPid, 0);
      liveOriginal = true;
    } catch (error) {
      assert(
        error !== null &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ESRCH",
        "Owned fixture process state is unknown",
      );
    }
    assert(!liveOriginal, "Superseded startup leaked its owned transport");
  } finally {
    await writeFile(state + ".release", "release");
    await pending;
    await original?.client?.close();
    await replacement?.client?.close();
    await manager.shutdown();
    await rm(directory, { recursive: true, force: true });
  }
});
await test("cancelled discovery cannot publish another tool after its slot is stopped", async () => {
  const manager = new ExternalServerManager({
    enablePerformanceMonitoring: false,
  });
  const id = `owned-${randomUUID()}`;
  let removal: ReturnType<ExternalServerManager["removeServer"]> | undefined;
  const lateTools: string[] = [];
  manager.on("toolDiscovered", (event) => {
    if (event.serverId !== id) {
      return;
    }
    if (removal === undefined) {
      removal = manager.removeServer(id);
    } else {
      lateTools.push(event.toolName);
    }
  });
  try {
    const result = await manager.addServer(id, config(id, "many"));
    await removal;
    assert(
      !result.success && removal !== undefined,
      "Cancelled discovery claimed readiness",
    );
    assert(
      lateTools.length === 0,
      "Cancelled discovery published a late tool after removal",
    );
    assert(
      manager.getServerTools(id).length === 0,
      "Cancelled discovery repopulated cleared metadata",
    );
  } finally {
    await manager.shutdown();
  }
});
for (const reconnect of [false, true]) {
  await test(`an open ordinary discovery breaker does not block ${reconnect ? "reconnect" : "initial startup"}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "owned-mcp-breaker-"));
    const manager = new ExternalServerManager({
      enablePerformanceMonitoring: false,
    });
    const id = `owned-${randomUUID()}`;
    const breakerName = `tool-discovery-${id}`;
    const serverConfig = config(id, "new", join(directory, "attempt"));
    serverConfig.autoRestart = reconnect;
    const breaker = globalCircuitBreakerManager.getBreaker(breakerName, {
      failureThreshold: 2,
      resetTimeout: 60_000,
      operationTimeout: serverConfig.timeout,
    });
    try {
      if (reconnect) {
        assert(
          (await manager.addServer(id, serverConfig)).success,
          "Initial healthy fixture did not attach",
        );
      }
      // Populate the real public breaker through its unchanged ten-call threshold.
      while (breaker.getStats().totalCalls < 8) {
        await breaker.execute(async () => undefined);
      }
      for (let failure = 0; failure < 2; failure++) {
        await breaker
          .execute(async () => {
            throw new Error("Owned ordinary discovery failure");
          })
          .catch(() => undefined);
      }
      const before = breaker.getStats();
      assert(
        before.state === "open" &&
          before.totalCalls === 10 &&
          before.failedCalls === 2,
        "Ordinary discovery breaker precondition was not established",
      );
      if (reconnect) {
        await manager.getServer(id)?.client?.close();
        const deadline = Date.now() + 7000;
        while (Date.now() < deadline) {
          const current = manager.getServer(id);
          if (
            current?.status === "connected" &&
            current.metrics.totalConnections >= 2
          ) {
            break;
          }
          await delay(25);
        }
        const current = manager.getServer(id);
        assert(
          current?.status === "connected" &&
            current.metrics.totalConnections === 2,
          "An ordinary discovery breaker consumed healthy reconnect attempts",
        );
        assert(
          manager.getServerTools(id)[0]?.name === "replacement_new",
          "Recovered connection did not discover its own tools",
        );
      } else {
        assert(
          (await manager.addServer(id, serverConfig)).success,
          "An ordinary discovery breaker blocked healthy initial startup",
        );
      }
      const after = breaker.getStats();
      assert(
        after.state === "open" &&
          after.totalCalls === before.totalCalls &&
          after.failedCalls === before.failedCalls,
        "Startup changed or refreshed the ordinary discovery breaker",
      );
      assert(
        Number(await readFile(join(directory, "attempt"), "utf8")) ===
          (reconnect ? 2 : 1),
        "Readiness required unnecessary transport attempts",
      );
    } finally {
      await manager.shutdown();
      globalCircuitBreakerManager.removeBreaker(breakerName);
      await rm(directory, { recursive: true, force: true });
    }
  });
}
await test("failure cleanup resumed after removal cannot mark its ready replacement failed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "owned-mcp-cleanup-"));
  const state = join(directory, "attempt");
  const manager = new ExternalServerManager({
    enablePerformanceMonitoring: false,
  });
  const id = `owned-${randomUUID()}`;
  let signalClosing!: () => void;
  const closing = new Promise<void>((resolve) => {
    signalClosing = resolve;
  });
  let releaseClosing!: () => void;
  const released = new Promise<void>((resolve) => {
    releaseClosing = resolve;
  });
  const serverConfig = config(id, "cleanup-race", state);
  serverConfig.timeout = 10_000;
  const pending = manager.addServer(id, serverConfig);
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (await readFile(state + ".discovery", "utf8").catch(() => null)) {
        break;
      }
      await delay(10);
    }
    assert(
      (await readFile(state + ".discovery", "utf8")) === "ready",
      "Owned client did not reach the held discovery response",
    );
    const originalClient = manager.getServer(id)?.client;
    if (!originalClient) {
      throw new Error(
        "Owned original client was not attached during held discovery",
      );
    }
    const close = originalClient.close.bind(originalClient);
    let firstClose = true;
    originalClient.close = async () => {
      if (firstClose) {
        firstClose = false;
        signalClosing();
        await released;
      }
      await close();
    };
    await writeFile(state + ".release", "release");
    await closing;
    assert(
      (await manager.removeServer(id)).success,
      "Could not remove the owner held in failure cleanup",
    );
    assert(
      (await manager.addServer(id, config(id, "new"))).success,
      "Replacement did not become ready during old cleanup",
    );
    const replacement = manager.getServer(id)?.client;
    releaseClosing();
    assert(!(await pending).success, "Old failed startup claimed success");
    const current = manager.getServer(id);
    assert(
      current?.client === replacement && current?.status === "connected",
      "Old asynchronous cleanup marked its ready replacement failed",
    );
    assert(
      manager.getServerTools(id)[0]?.name === "replacement_new",
      "Old asynchronous cleanup changed replacement metadata",
    );
    assert(
      manager.getServerStatuses().find((row) => row.serverId === id)
        ?.consecutiveFailures === 0,
      "Old asynchronous cleanup contaminated replacement health",
    );
  } finally {
    releaseClosing();
    await writeFile(state + ".release", "release");
    await pending;
    await manager.shutdown();
    await rm(directory, { recursive: true, force: true });
  }
});
await runSuite();
