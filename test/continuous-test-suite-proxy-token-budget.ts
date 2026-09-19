#!/usr/bin/env tsx
/**
 * Determinism exception: exact fixed-window resets, missing provider usage,
 * worker loss, dropped IPC replies, exact provider bytes, usage cancellation and
 * pre-dispatch refusals cannot be induced safely through live inference.
 * Source-only graph with temporary HOME and two real isolated IPC child peers;
 * no upstream, global service, shared ports or per-request disk writes.
 */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { Socket } from "node:net";
import { mock } from "node:test";
import { spawnProxySocketWorker } from "../src/lib/proxy/rollingWorkerProcess.js";
import { RollingWorkerSupervisor } from "../src/lib/proxy/rollingWorkerSupervisor.js";
import {
  ProxyTokenBudgetCoordinator,
  getProxyTokenBudgetError,
  handleProxyTokenBudgetMessage,
  parseProxyTokenBudgetPolicy,
  releaseProxyTokenBudgetOwner,
  reserveProxyTokenBudget,
  settleProxyTokenBudget,
  getProxyTokenBudgetSessionKey,
} from "../src/lib/proxy/proxyTokenBudget.js";
import { observeAnthropicBudgetResponse } from "../src/lib/proxy/anthropicBudgetResponse.js";
import type {
  ProxyTokenBudgetLease,
  ProxyTokenBudgetReservation,
  ProxyTokenBudgetRpcResponse,
  ProxyWorkerStatusMessage,
  RollingWorkerHandle,
  RollingWorkerSupervisorEvent,
  RollingWorkerSupervisorSnapshot,
  ServerContext,
} from "../src/lib/types/index.js";
let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function withDisabledBudgetPolicy(run: () => Promise<void>) {
  const previous = process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
  delete process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
    } else {
      process.env.NEUROLINK_PROXY_TOKEN_BUDGET = previous;
    }
  }
}
function input(
  tokens: number,
  overrides: Partial<ProxyTokenBudgetReservation> = {},
): ProxyTokenBudgetReservation {
  return {
    provider: "fake",
    accountKey: "account-a",
    sessionKey: "session-a",
    requestId: randomUUID(),
    reservationTokens: tokens,
    policy: {
      accountWindowTokens: 100,
      maxInFlightTokens: 100,
      sessionWindowTokens: 100,
      windowMs: 100,
    },
    ...overrides,
  };
}
await test("account admissions are atomic and reported usage replaces the estimate once", async () => {
  const c = new ProxyTokenBudgetCoordinator();
  const a = c.reserve(input(60), "one");
  assert.throws(() => c.reserve(input(50), "two"), /budget would be exceeded/);
  c.settle(a.leaseId, "one", 30);
  c.settle(a.leaseId, "one", 0);
  assert.equal(c.reserve(input(70), "two").snapshot.accountChargedTokens, 100);
});
await test("session window is shared across accounts and providers", async () => {
  const c = new ProxyTokenBudgetCoordinator();
  c.reserve(input(60), "one");
  assert.throws(
    () =>
      c.reserve(input(50, { provider: "other", accountKey: "other" }), "two"),
    /budget would be exceeded/,
  );
});
await test("missing usage retains estimate and pre-dispatch cancellation refunds it", async () => {
  const c = new ProxyTokenBudgetCoordinator();
  const a = c.reserve(input(60), "one");
  assert.equal(c.settle(a.leaseId, "one")?.settlement, "estimate_retained");
  assert.throws(() => c.reserve(input(50), "two"), /budget would be exceeded/);
  const b = c.reserve(input(40), "two");
  c.settle(b.leaseId, "two", undefined, true);
  assert.equal(
    c.reserve(input(40), "three").snapshot.accountChargedTokens,
    100,
  );
});
await test("outstanding reservations survive fixed-window rollover", async () => {
  let now = 0;
  const c = new ProxyTokenBudgetCoordinator("supervisor", () => now);
  const a = c.reserve(input(90), "one");
  now = 101;
  assert.throws(() => c.reserve(input(20), "two"), /budget would be exceeded/);
  c.settle(a.leaseId, "one", 40);
  assert.equal(c.reserve(input(60), "two").snapshot.accountChargedTokens, 100);
});
await test("worker exit retains unknown spend but releases outstanding occupancy", async () => {
  const c = new ProxyTokenBudgetCoordinator();
  c.reserve(input(70), "dead-worker");
  c.ownerExited("dead-worker");
  const next = c.reserve(input(30), "new-worker");
  assert.equal(next.snapshot.accountChargedTokens, 100);
  assert.equal(next.snapshot.accountInFlightTokens, 30);
});
await test("leases cannot be settled by another generation", async () => {
  const c = new ProxyTokenBudgetCoordinator();
  const a = c.reserve(input(70), "old");
  assert.throws(() => c.settle(a.leaseId, "new", 0), /another worker/);
  assert.throws(() => c.reserve(input(40), "new"), /budget would be exceeded/);
});
await test("bounded scope and outstanding lease tables fail closed", async () => {
  const keys = new ProxyTokenBudgetCoordinator("supervisor", () => 0, 2, 5);
  keys.reserve(input(1));
  assert.throws(
    () => keys.reserve(input(1, { accountKey: "b" })),
    /scope capacity/,
  );
  const leases = new ProxyTokenBudgetCoordinator("supervisor", () => 0, 10, 1);
  leases.reserve(input(1));
  assert.throws(() => leases.reserve(input(1)), /reservation capacity/);
});
await test("invalid configuration fails closed while absent caps remain disabled", async () => {
  assert.throws(
    () => parseProxyTokenBudgetPolicy('{"maxInFlightTokens":-1}'),
    /positive safe integers/,
  );
  assert.throws(
    () => parseProxyTokenBudgetPolicy('{"typo":100}'),
    /supported names/,
  );
  assert.throws(() => parseProxyTokenBudgetPolicy("invalid"), /valid JSON/);
  await withDisabledBudgetPolicy(async () => {
    assert.equal(
      (await reserveProxyTokenBudget(input(10, { policy: {} }))).snapshot.scope,
      "disabled",
    );
  });
});

await test("lost settlement acknowledgement retains conservative evidence without breaking a response", async () => {
  await withDisabledBudgetPolicy(async () => {
    const lease = await reserveProxyTokenBudget(input(10, { policy: {} }));
    assert.equal(lease.snapshot.scope, "disabled");
    lease.settle = async () => {
      throw new Error("lost acknowledgement");
    };
    await settleProxyTokenBudget(lease, 5);
    assert.equal(lease.snapshot.settlement, "unconfirmed");
  });
});
await test("session identity is shared across protocol header aliases and absent clients", async () => {
  assert.equal(
    getProxyTokenBudgetSessionKey(
      new Headers({ "x-neurolink-session-id": "same" }),
    ),
    getProxyTokenBudgetSessionKey(new Headers({ "session-id": "same" })),
  );
  assert.equal(
    getProxyTokenBudgetSessionKey(new Headers()),
    getProxyTokenBudgetSessionKey(new Headers()),
  );
  assert.notEqual(getProxyTokenBudgetSessionKey(new Headers()), "unattributed");
});

for (const [modeIndex, mode] of [
  "sync-error",
  "async-error",
  "disconnected",
  "backpressure",
].entries()) {
  await test(`budget response delivery ${mode} preserves worker and lease ownership`, async () => {
    const generation = 810 + modeIndex;
    const pid = 9100 + modeIndex;
    const signals: NodeJS.Signals[] = [];
    const sent: unknown[] = [];
    const statuses: ProxyWorkerStatusMessage[] = [];
    const child = Object.assign(new EventEmitter(), {
      pid,
      connected: true,
      exitCode: null as number | null,
      signalCode: null as NodeJS.Signals | null,
      send(message: unknown, ...args: unknown[]) {
        sent.push(message);
        const callback = args.at(-1) as (error: Error | null) => void;
        if ((message as { type?: string }).type === "proxy-budget:response") {
          if (mode === "sync-error") {
            throw new Error("recorded synchronous delivery failure");
          }
          queueMicrotask(() =>
            callback(
              mode === "async-error"
                ? new Error("recorded callback delivery failure")
                : null,
            ),
          );
          return mode !== "backpressure";
        }
        queueMicrotask(() => callback(null));
        return true;
      },
      kill(signal: NodeJS.Signals) {
        signals.push(signal);
        // Keep the peer alive until the fixture confirms its actual exit.
        return true;
      },
    });
    const handle = spawnProxySocketWorker({
      command: "unused-isolated-fixture",
      args: [],
      generation,
      expectedVersion: "1.0.0",
      spawn: (() => child as unknown as ChildProcess) as typeof spawn,
    });
    const offStatus = handle.onMessage((message) => statuses.push(message));
    const key = randomUUID();
    const reservation = input(80, {
      accountKey: key,
      sessionKey: key,
      policy: {
        accountWindowTokens: 1000,
        sessionWindowTokens: 1000,
        maxInFlightTokens: 100,
        windowMs: 60_000,
      },
    });
    const probeOwner = { pid: pid + 100, generation: generation + 100 };
    const probe = (action: "reserve" | "cancel", leaseId?: string) => {
      let result: ProxyTokenBudgetRpcResponse | undefined;
      handleProxyTokenBudgetMessage(
        {
          type: "proxy-budget:request",
          rpcId: randomUUID(),
          ...probeOwner,
          action,
          reservation: { ...reservation, reservationTokens: 30 },
          leaseId,
        },
        probeOwner,
        (reply) => {
          result = reply;
        },
      );
      assert.ok(result);
      return result;
    };
    const pendingSocket = new Socket();
    const refusedSocket = new Socket();
    const handoffs: Array<Error | null | undefined> = [];
    mock.timers.enable({ apis: ["setTimeout"] });
    const scheduled = mock.method(globalThis, "setTimeout");
    const cancelled = mock.method(globalThis, "clearTimeout");
    try {
      handle.sendSocket(generation, pendingSocket, (error) =>
        handoffs.push(error),
      );
      if (mode === "disconnected") {
        child.connected = false;
      }
      child.emit("message", {
        type: "proxy-budget:request",
        rpcId: randomUUID(),
        pid,
        generation,
        action: "reserve",
        reservation,
      });
      await Promise.resolve();
      if (mode === "backpressure") {
        assert.deepEqual(statuses, []);
        assert.deepEqual(signals, []);
        assert.equal(probe("reserve").errorCode, "PROXY_TOKEN_BUDGET_EXCEEDED");
        return;
      }
      assert.equal(
        statuses.length,
        1,
        "failed reply did not quarantine worker",
      );
      assert.equal(statuses[0].type, "proxy-worker:fatal");
      assert.ok(signals.includes("SIGTERM"), "failed reply left worker alive");
      assert.equal(
        handoffs.length,
        1,
        "pending socket was left owned by failed worker",
      );
      assert.ok(handoffs[0] instanceof Error);
      assert.throws(
        () => handle.sendControl({ type: "proxy-worker:drain", generation }),
        /budget.*delivery/i,
      );
      const beforeSocket = sent.length;
      let refusal: Error | null | undefined;
      handle.sendSocket(generation, refusedSocket, (error) => {
        refusal = error;
      });
      assert.ok(
        refusal instanceof Error,
        "quarantined worker accepted a new socket",
      );
      assert.equal(sent.length, beforeSocket);
      assert.equal(
        probe("reserve").errorCode,
        "PROXY_TOKEN_BUDGET_EXCEEDED",
        "occupancy released before actual worker exit",
      );
      child.emit("message", {
        type: "proxy-budget:request",
        rpcId: randomUUID(),
        pid,
        generation,
        action: "reserve",
        reservation: { ...reservation, reservationTokens: 1 },
      });
      child.emit("message", {
        type: "proxy-worker:ready",
        generation,
        pid,
        version: "1.0.0",
      });
      assert.equal(
        statuses.length,
        1,
        "stale messages revived a quarantined worker",
      );
      const escalation = scheduled.mock.calls.find(
        (call) => call.arguments[1] === 1000,
      );
      assert.ok(
        escalation,
        "failed delivery did not schedule bounded termination",
      );
      if (mode === "async-error") {
        mock.timers.tick(999);
        assert.ok(
          !signals.includes("SIGKILL"),
          "termination escalated before its deadline",
        );
        mock.timers.tick(1);
        assert.ok(
          signals.includes("SIGKILL"),
          "ignored SIGTERM left budget occupancy stranded",
        );
      }
      child.signalCode = "SIGTERM";
      child.connected = false;
      child.emit("exit", null, "SIGTERM");
      const next = probe("reserve");
      assert.equal(next.ok, true, "worker exit did not release occupancy");
      assert.equal(next.snapshot?.accountInFlightTokens, 30);
      assert.equal(
        next.snapshot?.accountChargedTokens,
        110,
        "ambiguous delivery refunded unknown spend or admitted a stale request",
      );
      probe("cancel", next.leaseId);
      if (mode === "sync-error") {
        const beforeExitWait = signals.length;
        assert.ok(
          cancelled.mock.calls.some(
            (call) => call.arguments[0] === escalation.result,
          ),
          "actual exit did not cancel its escalation timer",
        );
        mock.timers.tick(1000);
        assert.equal(
          signals.length,
          beforeExitWait,
          "termination timer survived actual exit",
        );
      }
    } finally {
      try {
        offStatus();
        if (child.signalCode === null) {
          child.signalCode = "SIGTERM";
          child.connected = false;
          child.emit("exit", null, "SIGTERM");
        }
        releaseProxyTokenBudgetOwner(probeOwner.pid, probeOwner.generation);
        pendingSocket.destroy();
        refusedSocket.destroy();
      } finally {
        mock.restoreAll();
        mock.timers.reset();
      }
    }
  });
}

await test("budget response draining-generation fatal retains cause and exit ownership", async () => {
  const events: RollingWorkerSupervisorEvent[] = [];
  const states: RollingWorkerSupervisorSnapshot[] = [];
  const workers = new Map<
    number,
    { fatal: (message: string) => void; exit: () => void }
  >();
  const supervisor = new RollingWorkerSupervisor({
    onEvent: (event) => events.push(event),
    onStateChange: (state) => states.push(state),
    spawnWorker(generation, expectedVersion) {
      const bus = new EventEmitter();
      const pid = 12_000 + generation;
      const exit = () => bus.emit("exit", null, "SIGTERM");
      const handle: RollingWorkerHandle = {
        pid,
        sendControl(message) {
          if (message.type === "proxy-worker:activate") {
            queueMicrotask(() =>
              bus.emit("message", {
                type: "proxy-worker:activated",
                generation,
                pid,
              }),
            );
          } else if (message.type === "proxy-worker:shutdown") {
            queueMicrotask(exit);
          }
        },
        sendSocket(_generation, _socket, callback) {
          callback();
        },
        terminate() {
          queueMicrotask(exit);
        },
        onMessage(listener) {
          bus.on("message", listener);
          return () => {
            bus.off("message", listener);
          };
        },
        onExit(listener) {
          bus.on("exit", listener);
          return () => {
            bus.off("exit", listener);
          };
        },
      };
      workers.set(generation, {
        exit,
        fatal: (message) =>
          bus.emit("message", {
            type: "proxy-worker:fatal",
            generation,
            pid,
            message,
          }),
      });
      queueMicrotask(() =>
        bus.emit("message", {
          type: "proxy-worker:ready",
          generation,
          pid,
          version: expectedVersion,
          processInstanceId: `worker-${generation}`,
        }),
      );
      return handle;
    },
  });
  try {
    await supervisor.start("1.0.0");
    await supervisor.replace("1.0.1");
    assert.equal(supervisor.snapshot().active?.generation, 2);
    assert.deepEqual(
      supervisor.snapshot().draining.map((worker) => worker.generation),
      [1],
    );
    const beforeStates = states.length;
    const reason = "token budget response delivery failed";
    workers.get(1)!.fatal(reason);
    const failures = events.filter((event) => event.type === "failure");
    assert.equal(
      failures.length,
      1,
      "draining worker fatal cause disappeared from incident events",
    );
    assert.equal(failures[0].generation, 1);
    assert.equal(failures[0].version, "1.0.0");
    assert.equal(failures[0].workerPid, 12_001);
    assert.equal(failures[0].phase, "runtime");
    assert.equal(failures[0].reason, reason);
    assert.equal(
      states.length,
      beforeStates + 1,
      "fatal failure did not publish supervisor state",
    );
    assert.equal(states.at(-1)?.lastFailure?.message, reason);
    assert.equal(states.at(-1)?.lastFailure?.generation, 1);
    assert.equal(supervisor.snapshot().active?.generation, 2);
    assert.equal(
      supervisor.snapshot().draining.length,
      1,
      "fatal removed draining ownership before actual exit",
    );
    assert.equal(
      events.filter((event) => event.type === "worker_exit").length,
      0,
    );
    workers.get(1)!.exit();
    const exits = events.filter((event) => event.type === "worker_exit");
    assert.equal(exits.length, 1);
    assert.equal(exits[0].generation, 1);
    assert.equal(exits[0].workerPid, 12_001);
    assert.equal(exits[0].workerProcessInstanceId, "worker-1");
    assert.equal(supervisor.snapshot().draining.length, 0);
    assert.equal(supervisor.snapshot().active?.generation, 2);
    assert.equal(supervisor.snapshot().lastFailure?.message, reason);
  } finally {
    await supervisor.close();
  }
});

const fixture = fileURLToPath(
  new URL("./fixtures/proxyTokenBudgetWorker.mts", import.meta.url),
);
const children: ChildProcess[] = [];
async function worker(generation: number, drop = false) {
  const child = spawn(process.execPath, ["--import", "tsx", fixture], {
    env: {
      ...process.env,
      NEUROLINK_PROXY_SOCKET_WORKER: "1",
      NEUROLINK_PROXY_WORKER_GENERATION: String(generation),
    },
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  children.push(child);
  assert.ok(child.pid);
  const pid = child.pid;
  child.on("message", (message) => {
    if (!drop) {
      handleProxyTokenBudgetMessage(message, { pid, generation }, (reply) => {
        if (child.connected) {
          child.send(reply);
        }
      });
    }
  });
  child.once("exit", () => releaseProxyTokenBudgetOwner(pid, generation));
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("child readiness timeout")),
      5_000,
    );
    child.on("message", (value: { type?: string }) => {
      if (value.type === "test:ready") {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once("error", reject);
  });
  return async (type: string, values: Record<string, unknown> = {}) => {
    const id = randomUUID();
    return new Promise<{
      ok: boolean;
      snapshot?: { scope: string; accountChargedTokens: number };
      error?: { code: string };
      id: string;
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.off("message", onMessage);
        reject(new Error("test RPC timeout"));
      }, 4_000);
      function onMessage(value: {
        id?: string;
        type?: string;
        ok: boolean;
        snapshot?: { scope: string; accountChargedTokens: number };
        error?: { code: string };
      }) {
        if (value.type === "test:result" && value.id === id) {
          clearTimeout(timeout);
          child.off("message", onMessage);
          resolve({ ...value, id });
        }
      }
      child.on("message", onMessage);
      child.send({ type: `test:${type}`, id, ...values });
    });
  };
}
try {
  await test("two real IPC generations share one supervisor budget and cannot overspend concurrently", async () => {
    const oldWorker = await worker(701);
    const newWorker = await worker(702);
    const sessionKey = randomUUID();
    const base = input(60, {
      sessionKey,
      accountKey: sessionKey,
      policy: { accountWindowTokens: 100, windowMs: 60_000 },
    });
    const outcomes = await Promise.all([
      oldWorker("reserve", { reservation: base }),
      newWorker("reserve", { reservation: base }),
    ]);
    assert.equal(outcomes.filter((value) => value.ok).length, 1);
    assert.equal(
      outcomes.find((value) => !value.ok)?.error?.code,
      "PROXY_TOKEN_BUDGET_EXCEEDED",
    );
    const winner = outcomes[0].ok ? oldWorker : newWorker;
    const result = outcomes.find((value) => value.ok)!;
    assert.equal(result.snapshot?.scope, "supervisor");
    await winner("settle", { key: result.id, actual: 20 });
    const next = await newWorker("reserve", { reservation: base });
    assert.equal(next.ok, true);
    assert.equal(next.snapshot?.accountChargedTokens, 80);
  });
  await test("missing supervisor acknowledgement refuses dispatch without a per-worker fallback", async () => {
    const silent = await worker(703, true);
    const result = await silent("reserve", { reservation: input(10) });
    assert.equal(result.ok, false);
    assert.equal(result.error?.code, "PROXY_TOKEN_BUDGET_UNAVAILABLE");
  });
} finally {
  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolve();
            return;
          }
          child.once("exit", () => resolve());
          child.kill("SIGTERM");
        }),
    ),
  );
}
assert.equal(
  getProxyTokenBudgetError(
    Object.assign(new Error("cap"), { code: "PROXY_TOKEN_BUDGET_EXCEEDED" }),
  )?.retryable,
  false,
);
function accountingLease() {
  const coordinator = new ProxyTokenBudgetCoordinator("process");
  const reservation = coordinator.reserve({
    provider: "anthropic",
    accountKey: "test",
    sessionKey: "s",
    requestId: "r",
    reservationTokens: 1000,
    policy: { accountWindowTokens: 10000 },
  });
  const calls: Array<number | undefined> = [];
  const result: ProxyTokenBudgetLease = {
    ...reservation,
    async settle(actual) {
      calls.push(actual);
      result.snapshot = coordinator.settle(result.leaseId, "local", actual)!;
    },
    async cancelBeforeDispatch() {
      result.snapshot = coordinator.settle(
        result.leaseId,
        "local",
        undefined,
        true,
      )!;
    },
  };
  return { result, calls };
}
const frame = (data: object) => `data: ${JSON.stringify(data)}\n\n`;
await test("preserves backpressure and reconciles disjoint cache usage only once", async () => {
  const { result, calls } = accountingLease();
  let pulls = 0;
  const chunks = [
    frame({
      type: "message_start",
      message: {
        usage: {
          input_tokens: 10,
          output_tokens: 0,
          cache_read_input_tokens: 20,
          cache_creation_input_tokens: 5,
        },
      },
    }),
    frame({ type: "message_delta", usage: { output_tokens: 7 } }) +
      frame({ type: "message_stop" }),
  ];
  const source = new ReadableStream<Uint8Array>(
    {
      pull(c) {
        pulls++;
        const next = chunks.shift();
        if (next) {
          c.enqueue(new TextEncoder().encode(next));
        } else {
          c.close();
        }
      },
    },
    { highWaterMark: 0 },
  );
  const response = observeAnthropicBudgetResponse(
    new Response(source, {
      headers: { "content-type": "text/event-stream" },
    }),
    result,
    () => undefined,
  );
  await Promise.resolve();
  assert.equal(pulls, 0);
  assert.deepEqual(calls, []);
  await response.text();
  assert.deepEqual(calls, [42]);
  assert.equal(result.snapshot.settlement, "provider_reported");
});
await test("reconciles buffered JSON and does not double count reasoning", async () => {
  const { result, calls } = accountingLease();
  const response = observeAnthropicBudgetResponse(
    new Response(
      JSON.stringify({
        usage: { input_tokens: 10, output_tokens: 7, reasoning_tokens: 5 },
      }),
    ),
    result,
    () => undefined,
  );
  await response.text();
  assert.deepEqual(calls, [17]);
});
await test("retains estimate after abort or incomplete usage", async () => {
  const { result, calls } = accountingLease();
  const abort = new AbortController();
  const response = observeAnthropicBudgetResponse(
    new Response(
      frame({
        type: "message_start",
        message: { usage: { input_tokens: 1 } },
      }),
      { headers: { "content-type": "text/event-stream" } },
    ),
    result,
    () => undefined,
    abort.signal,
  );
  abort.abort();
  await response.text();
  assert.deepEqual(calls, [undefined]);
  assert.equal(result.snapshot.settlement, "estimate_retained");
});
await test("does not retain oversized SSE content while still finding later usage", async () => {
  const { result, calls } = accountingLease();
  const response = observeAnthropicBudgetResponse(
    new Response(
      frame({
        type: "content_block_delta",
        delta: { text: "a".repeat(200000) },
      }) +
        frame({
          type: "message_delta",
          usage: { input_tokens: 2, output_tokens: 3 },
        }) +
        frame({ type: "message_stop" }),
      { headers: { "content-type": "text/event-stream" } },
    ),
    result,
    () => undefined,
  );
  await response.text();
  assert.deepEqual(calls, [5]);
});
await test("retains reservation for a truncated SSE with initial zero output usage", async () => {
  const { result, calls } = accountingLease();
  const response = observeAnthropicBudgetResponse(
    new Response(
      frame({
        type: "message_start",
        message: { usage: { input_tokens: 10, output_tokens: 0 } },
      }),
      { headers: { "content-type": "text/event-stream" } },
    ),
    result,
    () => undefined,
  );
  await response.text();
  assert.deepEqual(calls, [undefined]);
});
await test("keeps a successful body readable when settlement acknowledgement is lost", async () => {
  const { result } = accountingLease();
  result.settle = async () => {
    throw new Error("IPC unavailable");
  };
  const response = observeAnthropicBudgetResponse(
    new Response(
      JSON.stringify({ usage: { input_tokens: 10, output_tokens: 2 } }),
    ),
    result,
    () => undefined,
  );
  assert.equal((await response.json()).usage.output_tokens, 2);
  assert.equal(result.snapshot.settlement, "unconfirmed");
});

// Import the source route graph only after the isolated IPC peers have exited.
const { createClaudeProxyRoutes, __testHooks } =
  await import("../src/lib/server/routes/claudeProxyRoutes.js");
const { getUsageSnapshot, resetUsageStatsForTests } =
  await import("../src/lib/proxy/usageStats.js");
const { tokenStore } = await import("../src/lib/auth/tokenStore.js");
let nativeSequence = 0;
let nativeCalls = 0;
let nativeWire: Record<string, unknown> = {};
let nativeContext: ServerContext;
async function nativeTest(name: string, check: () => Promise<void>) {
  await test(name, async () => {
    const previousFetch = globalThis.fetch;
    const previousContextPolicy = process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
    const previousBudgetPolicy = process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
    const key = `anthropic:native-spending-${++nativeSequence}@example.test`;
    try {
      delete process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
      delete process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
      await resetUsageStatsForTests();
      await tokenStore.saveTokens(key, {
        accessToken: "isolated-fixture",
        tokenType: "Bearer",
        expiresAt: Date.now() + 3_600_000,
      });
      nativeCalls = 0;
      nativeWire = {};
      globalThis.fetch = async (input, init) => {
        if (!String(input).includes("/v1/messages")) {
          return new Response("{}");
        }
        nativeCalls++;
        nativeWire = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "fixture",
            type: "message",
            role: "assistant",
            model: "claude-sonnet-5",
            content: [{ type: "text", text: "pong" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 3 },
          }),
          { headers: { "content-type": "application/json" } },
        );
      };
      nativeContext = {
        requestId: `native-${nativeSequence}`,
        method: "POST",
        path: "/v1/messages",
        headers: {
          "content-type": "application/json",
          "x-neurolink-session-id": `spending-${nativeSequence}`,
        },
        query: {},
        params: {},
        body: {
          model: "claude-sonnet-5",
          max_tokens: 32,
          messages: [{ role: "user", content: "ping" }],
        },
        metadata: {},
        responseHeaders: {},
        timestamp: Date.now(),
        neurolink: {},
        toolRegistry: {},
      } as unknown as ServerContext;
      await check();
    } finally {
      globalThis.fetch = previousFetch;
      if (previousContextPolicy === undefined) {
        delete process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
      } else {
        process.env.NEUROLINK_PROXY_CONTEXT_POLICY = previousContextPolicy;
      }
      if (previousBudgetPolicy === undefined) {
        delete process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
      } else {
        process.env.NEUROLINK_PROXY_TOKEN_BUDGET = previousBudgetPolicy;
      }
      await tokenStore.clearTokens(key);
      __testHooks.clearProviderTransportCoordinatorForTests();
    }
  });
}
async function callNativeRoute() {
  const route = createClaudeProxyRoutes().routes.find(
    (route) => route.path.endsWith("/v1/messages") && route.method === "POST",
  );
  assert.ok(route, "native messages route is missing");
  const response = await route.handler(nativeContext);
  if (response instanceof Response) {
    return { status: response.status, body: await response.json() };
  }
  return { status: undefined, body: response };
}
await nativeTest(
  "native context overflow refuses dispatch and records no attempt",
  async () => {
    process.env.NEUROLINK_PROXY_CONTEXT_POLICY = JSON.stringify({
      maxInputTokens: 1,
    });
    const result = await callNativeRoute();
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "proxy_input_budget_exceeded");
    assert.equal(result.body.error.retryable, false);
    assert.equal(nativeCalls, 0);
    assert.equal(getUsageSnapshot().stats.totalAttempts, 0);
  },
);
await nativeTest(
  "native spending overflow refuses dispatch and records no attempt",
  async () => {
    process.env.NEUROLINK_PROXY_TOKEN_BUDGET = JSON.stringify({
      accountWindowTokens: 1,
    });
    const result = await callNativeRoute();
    assert.equal(result.status, 429);
    assert.equal(result.body.error.code, "PROXY_TOKEN_BUDGET_EXCEEDED");
    assert.equal(result.body.error.retryable, false);
    assert.equal(nativeCalls, 0);
    assert.equal(getUsageSnapshot().stats.totalAttempts, 0);
  },
);
await nativeTest(
  "native usage is reconciled and explicitly selected tools reach upstream",
  async () => {
    process.env.NEUROLINK_PROXY_CONTEXT_POLICY = JSON.stringify({
      toolAllowlist: ["keep"],
    });
    process.env.NEUROLINK_PROXY_TOKEN_BUDGET = JSON.stringify({
      accountWindowTokens: 10000,
    });
    Object.assign(nativeContext.body as object, {
      tools: [
        { name: "keep", input_schema: { type: "object", properties: {} } },
        { name: "drop", input_schema: { type: "object", properties: {} } },
      ],
    });
    const result = await callNativeRoute();
    assert.equal(result.body.type, "message");
    assert.equal(nativeCalls, 1);
    assert.deepEqual(
      (nativeWire.tools as Array<{ name: string }>).map((tool) => tool.name),
      ["keep"],
    );
    const preflight = nativeContext.metadata.contextPreflight as Record<
      string,
      unknown
    >;
    assert.equal(preflight.originalToolCount, 2);
    assert.equal(preflight.retainedToolCount, 1);
    assert.equal(preflight.historyModified, false);
    const budget = nativeContext.metadata.tokenBudget as Record<
      string,
      unknown
    >;
    assert.equal(budget.settlement, "provider_reported");
    assert.equal(budget.accountChargedTokens, 13);
    assert.equal(budget.accountInFlightTokens, 0);
  },
);

console.log(`${passed} tests passed`);
