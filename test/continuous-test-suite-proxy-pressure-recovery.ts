#!/usr/bin/env tsx
/**
 * Determinism exception (CLAUDE.md rule 15): control IPC offer/commit ordering,
 * absolute deadlines and candidate failures that cannot safely be induced on
 * an installed service. One source module graph, isolated TCP listeners and
 * fixture subprocesses only; no provider credentials or live proxy traffic.
 */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { connect, createServer as createNetServer, Socket } from "node:net";
import { request } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RollingWorkerSupervisor } from "../src/lib/proxy/rollingWorkerSupervisor.js";
import { startRollingProxyServer } from "../src/lib/proxy/rollingProxyServer.js";
import { spawnProxySocketWorker } from "../src/lib/proxy/rollingWorkerProcess.js";
import {
  PROXY_SOCKET_OFFER_TIMEOUT,
  PROXY_SOCKET_COMMIT_TIMEOUT,
} from "../src/lib/proxy/rollingWorkerProtocol.js";
import type {
  RollingWorkerHandle,
  TransferableProxySocket,
  ProxyWorkerStatusMessage,
} from "../src/lib/types/index.js";

let passed = 0;
async function test(name: string, run: () => Promise<void>) {
  await run();
  console.log(`PASS ${name}`);
  passed++;
}
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean) {
  const deadline = Date.now() + 5_000;
  while (!predicate()) {
    assert.ok(
      Date.now() < deadline,
      "fixture did not reach the requested state",
    );
    await sleep(5);
  }
}
function fixtureWorkers() {
  const offers: Array<{
    generation: number;
    deadlineAt?: number;
    callback: (error?: Error | null) => void;
  }> = [];
  let failCandidates = false;
  let failOffers = false;
  const controls: Array<{ generation: number; type: string }> = [];
  const crashers = new Map<number, () => void>();
  const spawnWorker = (
    generation: number,
    expectedVersion: string,
  ): RollingWorkerHandle => {
    const messages = new Set<(message: ProxyWorkerStatusMessage) => void>();
    const exits = new Set<
      (code: number | null, signal: string | null) => void
    >();
    const pid = 10_000 + generation;
    const emit = (message: ProxyWorkerStatusMessage) => {
      for (const listener of messages) {
        listener(message);
      }
    };
    const terminate = () => {
      queueMicrotask(() => {
        for (const listener of exits) {
          listener(0, null);
        }
      });
    };
    crashers.set(generation, terminate);
    queueMicrotask(() =>
      emit(
        failCandidates && generation > 1
          ? {
              type: "proxy-worker:fatal",
              generation,
              pid,
              message: "recorded startup failure",
            }
          : {
              type: "proxy-worker:ready",
              generation,
              pid,
              version: expectedVersion,
            },
      ),
    );
    return {
      pid,
      sendControl(message) {
        controls.push(message);
        if (message.type === "proxy-worker:activate") {
          queueMicrotask(() =>
            emit({ type: "proxy-worker:activated", generation, pid }),
          );
        }
        if (
          message.type === "proxy-worker:shutdown" ||
          message.type === "proxy-worker:drain"
        ) {
          terminate();
        }
      },
      sendSocket(_generation, _socket, callback, deadlineAt) {
        offers.push({ generation, deadlineAt, callback });
        if (failOffers) {
          callback(
            Object.assign(new Error("recorded stalled commit"), {
              code: PROXY_SOCKET_COMMIT_TIMEOUT,
            }),
          );
        }
      },
      terminate,
      onMessage(listener) {
        messages.add(listener);
        return () => {
          messages.delete(listener);
        };
      },
      onExit(listener) {
        exits.add(listener);
        return () => {
          exits.delete(listener);
        };
      },
    };
  };
  return {
    offers,
    controls,
    spawnWorker,
    crash: (generation: number) => crashers.get(generation)?.(),
    failCandidates: (value: boolean) => {
      failCandidates = value;
    },
    failOffers: () => {
      failOffers = true;
    },
  };
}
function fixtureSocket() {
  let destroyed = 0;
  // An unconnected Socket preserves Node's fluent return types. Override only
  // the operations this fixture counts or intentionally keeps inert.
  const socket: TransferableProxySocket = new (class extends Socket {
    override pause() {
      return this;
    }
    override resume() {
      return this;
    }
    override end() {
      return this;
    }
    override once() {
      return this;
    }
    override destroy() {
      destroyed++;
      return this;
    }
  })();
  return { socket, destroyed: () => destroyed };
}

await test("only a never-committed offer retries once on a different ready generation within its original deadline", async () => {
  for (const errorCode of [
    PROXY_SOCKET_OFFER_TIMEOUT,
    PROXY_SOCKET_COMMIT_TIMEOUT,
    "ERR_IPC_CHANNEL_CLOSED",
  ]) {
    const workers = fixtureWorkers();
    const socket = fixtureSocket();
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: workers.spawnWorker,
    });
    try {
      await supervisor.start("1.0.0");
      supervisor.acceptSocket(socket.socket);
      const first = workers.offers[0];
      await supervisor.replace("1.0.0");
      first.callback(
        Object.assign(new Error("recorded transfer stall"), {
          code: errorCode,
          socketNeverTransferred: true,
        }),
      );
      if (errorCode !== PROXY_SOCKET_OFFER_TIMEOUT) {
        assert.equal(workers.offers.length, 1);
        assert.equal(socket.destroyed(), 1);
        continue;
      }
      assert.equal(workers.offers.length, 2);
      assert.equal(workers.offers[1].generation, 2);
      assert.equal(workers.offers[1].deadlineAt, first.deadlineAt);
      assert.equal(socket.destroyed(), 0);
      await supervisor.replace("1.0.0");
      workers.offers[1].callback(
        Object.assign(new Error("second offer stall"), {
          code: PROXY_SOCKET_OFFER_TIMEOUT,
          socketNeverTransferred: true,
        }),
      );
      assert.equal(
        workers.offers.length,
        2,
        "socket was retried more than once",
      );
      assert.equal(socket.destroyed(), 1);
      assert.equal(supervisor.snapshot().pendingTransfers, 0);
    } finally {
      await supervisor.close();
    }
  }
});

await test("offer cancellation never retries the same generation or an expired admission", async () => {
  for (const expired of [false, true]) {
    const workers = fixtureWorkers();
    const socket = fixtureSocket();
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: workers.spawnWorker,
    });
    const realNow = Date.now;
    try {
      await supervisor.start("1.0.0");
      supervisor.acceptSocket(socket.socket);
      if (expired) {
        await supervisor.replace("1.0.0");
        Date.now = () => workers.offers[0].deadlineAt! + 1;
      }
      workers.offers[0].callback(
        Object.assign(new Error("recorded offer stall"), {
          code: PROXY_SOCKET_OFFER_TIMEOUT,
          socketNeverTransferred: true,
        }),
      );
      assert.equal(workers.offers.length, 1);
      assert.equal(socket.destroyed(), 1);
    } finally {
      Date.now = realNow;
      await supervisor.close();
    }
  }
});

await test("failed pressure replacements progressively back off while old generation survives, then stop after recovery", async () => {
  const workers = fixtureWorkers();
  workers.failCandidates(true);
  workers.failOffers();
  const retryDelays: number[] = [];
  const proxy = await startRollingProxyServer({
    host: "127.0.0.1",
    port: 0,
    initialVersion: "1.0.0",
    spawnWorker: workers.spawnWorker,
    stallReplacementDelayMs: 50,
    maxStallReplacementDelayMs: 200,
    log(message) {
      const match =
        /stall replacement retry deferred failures=\d+ delayMs=(\d+)/.exec(
          message,
        );
      if (match) {
        retryDelays.push(Number(match[1]));
      }
    },
  });
  try {
    const socket = connect({ host: "127.0.0.1", port: proxy.address.port });
    socket.on("error", () => undefined);
    await new Promise<void>((resolve) => socket.once("close", resolve));
    await until(() => retryDelays.length === 3);
    assert.deepEqual(retryDelays, [50, 100, 200]);
    assert.equal(proxy.snapshot().active?.generation, 1);
    assert.equal(
      workers.controls.filter(
        (c) => c.generation === 1 && c.type === "proxy-worker:drain",
      ).length,
      0,
    );
    workers.failCandidates(false);
    await until(() => proxy.snapshot().active?.generation === 5);
    await sleep(250);
    assert.equal(
      proxy.snapshot().generation,
      5,
      "recovered worker was replaced again",
    );
  } finally {
    await proxy.close();
  }
});

await test("old worker exit cancels its delayed pressure retry after autonomous recovery", async () => {
  const workers = fixtureWorkers();
  workers.failCandidates(true);
  workers.failOffers();
  let deferred = false;
  const proxy = await startRollingProxyServer({
    host: "127.0.0.1",
    port: 0,
    initialVersion: "1.0.0",
    spawnWorker: workers.spawnWorker,
    recoveryDelayMs: 10,
    maxRecoveryDelayMs: 10,
    stallReplacementDelayMs: 200,
    maxStallReplacementDelayMs: 200,
    log: (message) => {
      if (message.includes("stall replacement retry deferred")) {
        deferred = true;
      }
    },
  });
  try {
    const socket = connect({ host: "127.0.0.1", port: proxy.address.port });
    socket.on("error", () => undefined);
    await within(
      new Promise<void>((resolve) => socket.once("close", resolve)),
      2_000,
      "fixture rejection did not close",
    );
    await until(() => deferred);
    workers.failCandidates(false);
    workers.crash(1);
    await until(() => proxy.snapshot().active?.generation === 3);
    await sleep(300);
    assert.equal(
      proxy.snapshot().generation,
      3,
      "stale stall retry replaced the recovered worker",
    );
  } finally {
    await proxy.close();
  }
});

function within<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

await test("late control-only acceptance refuses descriptor transfer without a minimum commit window", async () => {
  let acceptSocket: ((socket: Socket) => void) | undefined;
  const acceptedSocket = new Promise<Socket>((resolve) => {
    acceptSocket = resolve;
  });
  const listener = createNetServer({ pauseOnConnect: true }, (socket) =>
    acceptSocket?.(socket),
  );
  await new Promise<void>((resolve) =>
    listener.listen(0, "127.0.0.1", resolve),
  );
  const address = listener.address();
  assert.ok(address && typeof address !== "string");
  const client = connect({ host: "127.0.0.1", port: address.port });
  client.on("error", () => undefined);
  const socket = await acceptedSocket;
  const worker = spawnProxySocketWorker({
    generation: 1,
    expectedVersion: "1.0.0",
    command: process.execPath,
    args: [
      "--import",
      import.meta.resolve("tsx"),
      fileURLToPath(
        new URL("./fixtures/proxyControlOfferWorker.mjs", import.meta.url),
      ),
    ],
    socketAckTimeoutMs: 2_000,
    stdout: "ignore",
    stderr: "ignore",
  });
  const messages: ProxyWorkerStatusMessage[] = [];
  const offMessage = worker.onMessage((message) => messages.push(message));
  const exited = new Promise<void>((resolve) => worker.onExit(() => resolve()));
  try {
    await until(() =>
      messages.some((message) => message.type === "proxy-worker:ready"),
    );
    worker.sendControl({ type: "proxy-worker:activate", generation: 1 });
    await until(() =>
      messages.some((message) => message.type === "proxy-worker:activated"),
    );
    const error = await new Promise<Error | null>((resolve) =>
      worker.sendSocket(
        1,
        socket,
        (failure) => resolve(failure ?? null),
        Date.now() + 900,
      ),
    );
    assert.ok(
      messages.some(
        (message) => message.type === "proxy-worker:socket-accepted",
      ),
      "fixture did not accept the control-only offer",
    );
    assert.equal(
      (error as NodeJS.ErrnoException | null)?.code,
      PROXY_SOCKET_OFFER_TIMEOUT,
    );
    assert.equal(
      (error as Error & { socketNeverTransferred?: boolean })
        ?.socketNeverTransferred,
      true,
    );
  } finally {
    offMessage();
    socket.destroy();
    client.destroy();
    worker.terminate("SIGTERM");
    await Promise.race([exited, sleep(2_000)]);
    await new Promise<void>((resolve) => listener.close(() => resolve()));
  }
});

async function withRealProxy(
  mode: "control" | "legacy" | "legacy-timeout",
  run: (
    proxy: Awaited<ReturnType<typeof startRollingProxyServer>>,
    prepareReplacement: () => Promise<() => Promise<void>>,
  ) => Promise<void>,
) {
  const children: ReturnType<typeof spawn>[] = [];
  const logs: string[] = [];
  let releaseActivation: (() => void) | undefined;
  let proxy: Awaited<ReturnType<typeof startRollingProxyServer>> | undefined;
  try {
    proxy = await startRollingProxyServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "1.0.0",
      socketQueueTimeoutMs: 4_000,
      readyTimeoutMs: 5_000,
      log: (message) => logs.push(message),
      shutdownTimeoutMs: 1_000,
      spawnWorker: (generation, expectedVersion) => {
        const worker = spawnProxySocketWorker({
          generation,
          expectedVersion,
          command: process.execPath,
          args: [
            "--import",
            import.meta.resolve("tsx"),
            fileURLToPath(
              new URL(
                "./fixtures/proxyControlOfferWorker.mjs",
                import.meta.url,
              ),
            ),
          ],
          socketAckTimeoutMs: 3_000,
          env: {
            NEUROLINK_FIXTURE_OFFER_DELAY_MS:
              generation === 1 && mode !== "legacy" ? "6000" : "0",
            NEUROLINK_FIXTURE_LEGACY_OFFERS: mode.startsWith("legacy")
              ? "1"
              : "0",
          },
          stdout: "ignore",
          stderr: "inherit",
          spawn: ((...args: Parameters<typeof spawn>) => {
            const child = spawn(...args);
            children.push(child);
            return child;
          }) as typeof spawn,
        });
        if (generation !== 2) {
          return worker;
        }
        return {
          ...worker,
          onMessage: (listener) =>
            worker.onMessage((message) => {
              if (message.type === "proxy-worker:activated") {
                // Warm the candidate before starting the old worker's offer
                // deadline, then release its activation at the precise race.
                releaseActivation = () => listener(message);
              } else {
                listener(message);
              }
            }),
        };
      },
    });
    assert.ok(proxy.snapshot().active, "fixture worker did not become ready");
    await within(
      run(proxy, async () => {
        const replacement = proxy!.replace("1.0.1");
        void replacement.catch(() => undefined);
        await until(() => releaseActivation !== undefined);
        return async () => {
          releaseActivation!();
          await replacement;
        };
      }),
      12_000,
      "real socket fixture exceeded its total test budget",
    );
  } catch (error) {
    console.error(JSON.stringify({ mode, logs, snapshot: proxy?.snapshot() }));
    throw error;
  } finally {
    try {
      if (proxy) {
        await within(
          proxy.close(),
          2_000,
          "fixture proxy cleanup did not settle",
        );
      }
    } finally {
      // Only children created by this test are eligible for hard cleanup. This
      // also runs when initial readiness fails before the test body starts.
      await Promise.all(
        children.map((child) => {
          if (
            !child.pid ||
            child.exitCode !== null ||
            child.signalCode !== null
          ) {
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            child.once("exit", () => resolve());
            child.kill("SIGKILL");
          });
        }),
      );
    }
  }
}
function sendRequest(port: number) {
  return new Promise<{
    body: string;
    served: string | string[] | undefined;
    bytes: string | string[] | undefined;
  }>((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path: "/fixture",
        method: "POST",
        agent: false,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.once("end", () => {
          clearTimeout(timer);
          resolve({
            body,
            served: res.headers["x-worker-served-requests"],
            bytes: res.headers["x-request-bytes"],
          });
        });
        res.once("error", reject);
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error("fixture response deadline expired")),
      8_000,
    );
    req.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    req.end(Buffer.alloc(128 * 1024, 65));
  });
}
await test("real socket retries once after control-only offer timeout, preserving every POST byte", async () => {
  await withRealProxy("control", async (proxy, prepareReplacement) => {
    const activate = await prepareReplacement();
    const response = sendRequest(proxy.address.port);
    void response.catch(() => undefined);
    await until(() => proxy.snapshot().pendingTransfers === 1);
    await activate();
    const result = await response;
    assert.equal(result.body, "worker-1.0.1");
    assert.equal(result.served, "1");
    assert.equal(result.bytes, String(128 * 1024));
    assert.equal(proxy.snapshot().failedTransfers, 1);
    assert.equal(proxy.snapshot().rejectedSockets, 0);
  });
});
await test("mixed-version descriptor-first handoff remains compatible with new worker runtime", async () => {
  await withRealProxy("legacy", async (proxy) => {
    const result = await sendRequest(proxy.address.port);
    assert.equal(result.body, "worker-1.0.0");
    assert.equal(result.bytes, String(128 * 1024));
    assert.equal(proxy.snapshot().failedTransfers, 0);
  });
});
await test("legacy offer timeout rejects even with a ready alternate generation", async () => {
  await withRealProxy("legacy-timeout", async (proxy, prepareReplacement) => {
    const activate = await prepareReplacement();
    const response = sendRequest(proxy.address.port);
    void response.catch(() => undefined);
    await until(() => proxy.snapshot().pendingTransfers === 1);
    await activate();
    await assert.rejects(response);
    assert.equal(proxy.snapshot().failedTransfers, 1);
    assert.equal(proxy.snapshot().rejectedSockets, 1);
    const next = await sendRequest(proxy.address.port);
    assert.equal(
      next.served,
      "1",
      "legacy descriptor was incorrectly replayed",
    );
  });
});
console.log(`Passed: ${passed}, Failed: 0`);
