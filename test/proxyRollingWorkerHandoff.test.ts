import { EventEmitter } from "node:events";
import { existsSync, rmSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import {
  createConnection,
  createServer as createNetServer,
  type Socket,
} from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ProxyWorkerControlMessage,
  ProxyWorkerStatusMessage,
  RollingWorkerHandle,
  TransferableProxySocket,
} from "../src/lib/types/index.js";
import { RollingWorkerSupervisor } from "../src/lib/proxy/rollingWorkerSupervisor.js";
import { spawnProxySocketWorker } from "../src/lib/proxy/rollingWorkerProcess.js";
import { startRollingProxyServer } from "../src/lib/proxy/rollingProxyServer.js";
import {
  attachSocketWorkerProcess,
  createSocketWorkerRuntime,
} from "../src/lib/proxy/socketWorkerRuntime.js";

const IPC_HTTP_WORKER = fileURLToPath(
  new URL("./fixtures/proxySocketWorker.cjs", import.meta.url),
);

class FakeSocket extends EventEmitter implements TransferableProxySocket {
  destroyed = false;
  ended = false;
  paused = false;
  resumed = false;

  destroy(): this {
    this.destroyed = true;
    this.emit("close");
    return this;
  }

  end(): this {
    this.ended = true;
    return this;
  }

  pause(): this {
    this.paused = true;
    return this;
  }

  resume(): this {
    this.resumed = true;
    return this;
  }
}

class FakeWorker implements RollingWorkerHandle {
  readonly controls: ProxyWorkerControlMessage[] = [];
  readonly sockets: TransferableProxySocket[] = [];
  readonly terminated: Array<NodeJS.Signals | undefined> = [];
  readonly pendingSocketCallbacks: Array<(error?: Error | null) => void> = [];
  private readonly messages = new Set<
    (message: ProxyWorkerStatusMessage) => void
  >();
  private readonly exits = new Set<
    (code: number | null, signal: string | null) => void
  >();
  controlError: Error | undefined;
  autoActivate = true;
  deferSocketCallbacks = false;

  constructor(readonly pid: number) {}

  sendControl(message: ProxyWorkerControlMessage): void {
    if (this.controlError) {
      throw this.controlError;
    }
    this.controls.push(message);
  }

  sendSocket(
    _generation: number,
    socket: TransferableProxySocket,
    callback: (error?: Error | null) => void,
  ): void {
    this.sockets.push(socket);
    if (this.deferSocketCallbacks) {
      this.pendingSocketCallbacks.push(callback);
    } else {
      callback();
    }
  }

  terminate(signal?: NodeJS.Signals): void {
    this.terminated.push(signal);
  }

  onMessage(listener: (message: ProxyWorkerStatusMessage) => void): () => void {
    this.messages.add(listener);
    return () => this.messages.delete(listener);
  }

  onExit(
    listener: (code: number | null, signal: string | null) => void,
  ): () => void {
    this.exits.add(listener);
    return () => this.exits.delete(listener);
  }

  ready(generation: number, version: string): void {
    for (const listener of this.messages) {
      listener({
        type: "proxy-worker:ready",
        generation,
        pid: this.pid,
        version,
      });
    }
    if (this.autoActivate) {
      this.activated(generation);
    }
  }

  requestReplacement(generation: number): void {
    for (const listener of this.messages) {
      listener({
        type: "proxy-worker:replacement-requested",
        generation,
        pid: this.pid,
        reason: "environment",
      });
    }
  }

  activated(generation: number): void {
    for (const listener of this.messages) {
      listener({ type: "proxy-worker:activated", generation, pid: this.pid });
    }
  }

  exit(code: number | null, signal: string | null): void {
    for (const listener of this.exits) {
      listener(code, signal);
    }
  }

  failPendingSockets(message: string): void {
    for (const callback of this.pendingSocketCallbacks.splice(0)) {
      callback(new Error(message));
    }
  }
}

// Cleanup registry: real worker/server tests must tear down child processes and
// listeners even when an assertion or timeout fails mid-test, otherwise the
// orphans hang subsequent tests and Vitest shutdown.
const cleanups: Array<() => void | Promise<void>> = [];
function trackCleanup(dispose: () => void | Promise<void>): void {
  cleanups.push(dispose);
}

function createTrackedSupervisor(
  options: ConstructorParameters<typeof RollingWorkerSupervisor>[0],
): RollingWorkerSupervisor {
  const supervisor = new RollingWorkerSupervisor(options);
  trackCleanup(() => supervisor.close());
  return supervisor;
}

async function startTrackedRollingServer(
  options: Parameters<typeof startRollingProxyServer>[0],
): Promise<Awaited<ReturnType<typeof startRollingProxyServer>>> {
  const server = await startRollingProxyServer(options);
  trackCleanup(() => server.close());
  return server;
}

function trackRollingServerPromise(
  promise: ReturnType<typeof startRollingProxyServer>,
): ReturnType<typeof startRollingProxyServer> {
  trackCleanup(async () => {
    const resolved = await Promise.race([
      promise.then(
        (server) => server,
        () => null,
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_000)),
    ]);
    if (resolved) {
      await resolved.close();
    }
  });
  return promise;
}

function spawnTrackedWorker(
  options: Parameters<typeof spawnProxySocketWorker>[0],
): ReturnType<typeof spawnProxySocketWorker> {
  const handle = spawnProxySocketWorker(options);
  trackCleanup(() => handle.terminate("SIGKILL"));
  return handle;
}

function trackServer(server: {
  listening?: boolean;
  close: (callback?: (error?: Error) => void) => void;
}): void {
  trackCleanup(
    () =>
      new Promise<void>((resolve) => {
        if (server.listening === false) {
          resolve();
          return;
        }
        server.close(() => resolve());
      }),
  );
}

function trackConnection(socket: { destroy: () => void }): void {
  trackCleanup(() => socket.destroy());
}

afterEach(async () => {
  vi.useRealTimers();
  const pending = cleanups.splice(0).reverse();
  await Promise.allSettled(
    pending.map((dispose) =>
      Promise.race([
        Promise.resolve().then(dispose),
        new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
      ]),
    ),
  );
});

describe("rolling proxy worker supervisor", () => {
  it("queues sockets until the initial worker is ready", async () => {
    const workers: FakeWorker[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => {
        const worker = new FakeWorker(100 + workers.length);
        workers.push(worker);
        return worker;
      },
    });
    const socket = new FakeSocket();
    const started = supervisor.start("9.93.1");
    supervisor.acceptSocket(socket);

    expect(supervisor.snapshot()).toMatchObject({
      active: null,
      queuedSockets: 1,
    });
    expect(socket.paused).toBe(true);

    workers[0].ready(1, "9.93.1");
    await expect(started).resolves.toMatchObject({
      active: { pid: 100, version: "9.93.1", generation: 1 },
      queuedSockets: 0,
    });
    expect(workers[0].controls).toEqual([
      { type: "proxy-worker:activate", generation: 1 },
    ]);
    expect(workers[0].sockets).toEqual([socket]);
    void supervisor.close();
  });

  it("keeps the old worker active until an exact-version candidate is ready", async () => {
    const workers: FakeWorker[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => {
        const worker = new FakeWorker(200 + workers.length);
        workers.push(worker);
        return worker;
      },
    });
    const initial = supervisor.start("9.93.1");
    workers[0].ready(1, "9.93.1");
    await initial;

    const replacement = supervisor.replace("9.94.0");
    const beforeSwitch = new FakeSocket();
    supervisor.acceptSocket(beforeSwitch);
    expect(workers[0].sockets).toContain(beforeSwitch);
    expect(workers[0].controls).toEqual([
      { type: "proxy-worker:activate", generation: 1 },
    ]);

    workers[1].ready(2, "9.94.0");
    await replacement;
    expect(workers[0].controls).toEqual([
      { type: "proxy-worker:activate", generation: 1 },
      { type: "proxy-worker:drain", generation: 1 },
    ]);
    expect(workers[1].controls).toEqual([
      { type: "proxy-worker:activate", generation: 2 },
    ]);
    expect(supervisor.snapshot()).toMatchObject({
      active: { pid: 201, version: "9.94.0", generation: 2 },
      draining: [{ pid: 200, version: "9.93.1", generation: 1 }],
    });

    const afterSwitch = new FakeSocket();
    supervisor.acceptSocket(afterSwitch);
    expect(workers[1].sockets).toContain(afterSwitch);
    expect(workers[0].sockets).not.toContain(afterSwitch);
    supervisor.close();
  });

  it("does not commit a ready candidate before activation is acknowledged", async () => {
    const workers: FakeWorker[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => {
        const worker = new FakeWorker(250 + workers.length);
        if (workers.length === 1) {
          worker.autoActivate = false;
        }
        workers.push(worker);
        return worker;
      },
    });
    const initial = supervisor.start("9.93.1");
    workers[0].ready(1, "9.93.1");
    await initial;

    const replacement = supervisor.replace("9.94.0");
    workers[1].ready(2, "9.94.0");

    expect(supervisor.snapshot()).toMatchObject({
      active: { pid: 250, version: "9.93.1" },
      candidate: { pid: 251, expectedVersion: "9.94.0" },
    });
    expect(workers[0].controls).not.toContainEqual({
      type: "proxy-worker:drain",
      generation: 1,
    });

    workers[1].activated(2);
    await replacement;
    expect(supervisor.snapshot().active).toMatchObject({
      pid: 251,
      version: "9.94.0",
    });
    void supervisor.close();
  });

  it("rolls back a mismatched or failed candidate without draining active work", async () => {
    const workers: FakeWorker[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => {
        const worker = new FakeWorker(300 + workers.length);
        workers.push(worker);
        return worker;
      },
    });
    const initial = supervisor.start("9.93.1");
    workers[0].ready(1, "9.93.1");
    await initial;

    const mismatch = supervisor.replace("9.94.0");
    workers[1].ready(2, "9.93.1");
    await expect(mismatch).rejects.toThrow("expected v9.94.0");
    expect(workers[1].terminated).toEqual(["SIGTERM"]);
    expect(workers[0].controls).toEqual([
      { type: "proxy-worker:activate", generation: 1 },
    ]);
    expect(supervisor.snapshot().active).toMatchObject({ pid: 300 });
    expect(supervisor.snapshot().lastFailure).toMatchObject({
      version: "9.94.0",
      phase: "startup",
    });

    const failed = supervisor.replace("9.94.0");
    workers[2].exit(1, null);
    await expect(failed).rejects.toThrow("exited before readiness");
    expect(workers[0].controls).toEqual([
      { type: "proxy-worker:activate", generation: 1 },
    ]);
    expect(supervisor.snapshot().active).toMatchObject({ pid: 300 });
    supervisor.close();
  });

  it("keeps the active worker when candidate activation cannot be delivered", async () => {
    const workers: FakeWorker[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => {
        const worker = new FakeWorker(325 + workers.length);
        workers.push(worker);
        return worker;
      },
    });
    const initial = supervisor.start("9.93.1");
    workers[0].ready(1, "9.93.1");
    await initial;

    const replacement = supervisor.replace("9.94.0");
    workers[1].controlError = new Error("IPC closed");
    workers[1].ready(2, "9.94.0");

    await expect(replacement).rejects.toThrow("IPC closed");
    expect(supervisor.snapshot().active).toMatchObject({ pid: 325 });
    expect(workers[0].controls).toEqual([
      { type: "proxy-worker:activate", generation: 1 },
    ]);
    expect(workers[1].terminated).toEqual(["SIGTERM"]);
    void supervisor.close();
  });

  it("does not conflate concurrent replacements for different versions", async () => {
    const workers: FakeWorker[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => {
        const worker = new FakeWorker(350 + workers.length);
        workers.push(worker);
        return worker;
      },
    });
    const initial = supervisor.start("9.93.1");
    workers[0].ready(1, "9.93.1");
    await initial;

    const first = supervisor.replace("9.94.0");
    await expect(supervisor.replace("9.95.0")).rejects.toThrow(
      "v9.94.0 is already in progress",
    );
    workers[1].ready(2, "9.94.0");
    await first;
    supervisor.close();
  });

  it("keeps serving when persisted supervisor state cannot be written", async () => {
    const worker = new FakeWorker(375);
    const logs: string[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => worker,
      onStateChange: () => {
        throw new Error("state directory is read-only");
      },
      log: (message) => logs.push(message),
    });

    const starting = supervisor.start("9.93.1");
    worker.ready(1, "9.93.1");
    await expect(starting).resolves.toMatchObject({
      active: { pid: 375, version: "9.93.1" },
    });
    expect(logs).toContainEqual(
      expect.stringContaining("state directory is read-only"),
    );
    const closing = supervisor.close();
    worker.exit(0, null);
    await closing;
  });

  it("bounds and expires sockets queued while no worker is ready", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker(400);
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => worker,
      socketQueueLimit: 1,
      socketQueueTimeoutMs: 50,
      readyTimeoutMs: 100,
    });
    void supervisor.start("9.93.1").catch(() => undefined);
    const queued = new FakeSocket();
    const rejected = new FakeSocket();
    supervisor.acceptSocket(queued);
    supervisor.acceptSocket(rejected);

    expect(rejected.destroyed).toBe(true);
    await vi.advanceTimersByTimeAsync(50);
    expect(queued.destroyed).toBe(true);
    expect(supervisor.snapshot()).toMatchObject({
      queuedSockets: 0,
      rejectedSockets: 2,
    });
    supervisor.close();
  });

  it("waits for the active worker to drain during supervisor shutdown", async () => {
    const worker = new FakeWorker(450);
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => worker,
      shutdownTimeoutMs: 1_000,
    });
    const initial = supervisor.start("9.93.1");
    worker.ready(1, "9.93.1");
    await initial;

    let closed = false;
    const closing = supervisor.close().then(() => {
      closed = true;
    });
    await Promise.resolve();
    expect(closed).toBe(false);
    expect(worker.controls).toContainEqual({
      type: "proxy-worker:shutdown",
      generation: 1,
    });

    worker.exit(0, null);
    await closing;
    expect(closed).toBe(true);
  });

  it("fails every uncommitted socket without replaying after a worker transfer failure", async () => {
    const workers: FakeWorker[] = [];
    const logs: string[] = [];
    const supervisor = new RollingWorkerSupervisor({
      spawnWorker: () => {
        const worker = new FakeWorker(475 + workers.length);
        workers.push(worker);
        return worker;
      },
      log: (message) => logs.push(message),
    });
    const initial = supervisor.start("9.93.1");
    workers[0].ready(1, "9.93.1");
    await initial;
    workers[0].deferSocketCallbacks = true;
    const sockets = [new FakeSocket(), new FakeSocket(), new FakeSocket()];
    for (const socket of sockets) {
      supervisor.acceptSocket(socket);
    }

    workers[0].failPendingSockets("worker IPC failed");
    expect(supervisor.snapshot()).toMatchObject({
      active: null,
      draining: [{ pid: 475 }],
      queuedSockets: 0,
      failedTransfers: 3,
      rejectedSockets: 3,
      lastFailure: {
        phase: "transfer",
        message: expect.stringContaining("worker IPC failed"),
      },
    });
    expect(workers[0].terminated).toContain("SIGKILL");
    expect(sockets.every((socket) => socket.destroyed)).toBe(true);
    expect(logs).toContainEqual(expect.stringContaining("worker IPC failed"));

    workers[0].exit(null, "SIGKILL");
    const replacement = supervisor.replace("9.93.1");
    workers[1].ready(2, "9.93.1");
    await replacement;
    expect(supervisor.snapshot()).toMatchObject({
      active: { pid: 476 },
      queuedSockets: 0,
      rejectedSockets: 3,
      lastFailure: {
        phase: "transfer",
        message: expect.stringContaining("worker IPC failed"),
      },
    });
    void supervisor.close();
  });
});

describe("socket worker runtime", () => {
  it("destroys malformed or mismatched transferred handles", () => {
    const httpServer = createHttpServer();
    const runtime = attachSocketWorkerProcess(httpServer, {
      generation: 77,
      version: "9.93.1",
    });
    const wrongGeneration = { destroy: vi.fn() };
    const invalidSocket = { destroy: vi.fn(), pause: vi.fn() };
    const unexpectedHandle = { destroy: vi.fn() };

    process.emit(
      "message",
      { type: "proxy-worker:socket", generation: 76, socketId: "wrong" },
      wrongGeneration,
    );
    process.emit(
      "message",
      { type: "proxy-worker:socket", generation: 77, socketId: "invalid" },
      invalidSocket,
    );
    process.emit(
      "message",
      { type: "proxy-worker:activate", generation: 77 },
      unexpectedHandle,
    );

    expect(wrongGeneration.destroy).toHaveBeenCalledOnce();
    expect(invalidSocket.destroy).toHaveBeenCalledOnce();
    expect(unexpectedHandle.destroy).toHaveBeenCalledOnce();
    runtime.close();
  });

  it("serves transferred sockets without a second listener", async () => {
    const httpServer = createHttpServer((_request, response) => {
      response.end("worker-response");
    });
    const runtime = createSocketWorkerRuntime(httpServer);
    const broker = createNetServer({ pauseOnConnect: true }, (socket) => {
      runtime.acceptSocket(socket);
    });
    trackServer(broker);
    await new Promise<void>((resolve) =>
      broker.listen(0, "127.0.0.1", resolve),
    );
    const address = broker.address();
    if (!address || typeof address === "string") {
      throw new Error("broker did not expose a port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(await response.text()).toBe("worker-response");
    expect(runtime.snapshot().activeRequests).toBe(0);

    runtime.drain();
    await vi.waitFor(() => expect(runtime.snapshot().drained).toBe(true));
    await new Promise<void>((resolve, reject) =>
      broker.close((error) => (error ? reject(error) : resolve())),
    );
    runtime.close();
  });

  it("lets an active stream finish before reporting the worker drained", async () => {
    let finishStream: (() => void) | undefined;
    const httpServer = createHttpServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      response.write("first-");
      finishStream = () => response.end("last");
    });
    let drained = false;
    const runtime = createSocketWorkerRuntime(httpServer, {
      onDrained: () => {
        drained = true;
      },
    });
    const broker = createNetServer(
      { pauseOnConnect: true },
      (socket: Socket) => {
        runtime.acceptSocket(socket);
      },
    );
    trackServer(broker);
    await new Promise<void>((resolve) =>
      broker.listen(0, "127.0.0.1", resolve),
    );
    const address = broker.address();
    if (!address || typeof address === "string") {
      throw new Error("broker did not expose a port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/stream`);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    const first = await reader!.read();
    expect(new TextDecoder().decode(first.value)).toBe("first-");

    runtime.drain();
    expect(drained).toBe(false);
    expect(runtime.snapshot().activeRequests).toBe(1);
    finishStream?.();
    const final = await reader!.read();
    expect(new TextDecoder().decode(final.value)).toBe("last");
    await reader!.read();
    await vi.waitFor(() => expect(drained).toBe(true));

    await new Promise<void>((resolve, reject) =>
      broker.close((error) => (error ? reject(error) : resolve())),
    );
    runtime.close();
  });

  it("preserves an accepted-but-uncommitted socket when a graceful drain arrives", () => {
    const httpServer = createHttpServer((_request, response) => {
      response.end("served");
    });
    const runtime = attachSocketWorkerProcess(httpServer, {
      generation: 91,
      version: "9.93.1",
    });
    trackCleanup(() => runtime.close());

    // Simulate an established IPC channel so offered sockets are acknowledged
    // and tracked rather than immediately rejected.
    const originalSend = process.send;
    const originalConnected = Object.getOwnPropertyDescriptor(
      process,
      "connected",
    );
    const sent: Array<{ type?: string }> = [];
    (process as { send?: unknown }).send = (
      message: unknown,
      handleOrCallback?: unknown,
      _options?: unknown,
      maybeCallback?: unknown,
    ): boolean => {
      sent.push(message as { type?: string });
      const ack =
        typeof handleOrCallback === "function"
          ? handleOrCallback
          : maybeCallback;
      if (typeof ack === "function") {
        (ack as (error: Error | null) => void)(null);
      }
      return true;
    };
    Object.defineProperty(process, "connected", {
      value: true,
      configurable: true,
    });

    try {
      process.emit("message", {
        type: "proxy-worker:activate",
        generation: 91,
      });
      const socket = new FakeSocket();
      process.emit(
        "message",
        { type: "proxy-worker:socket", generation: 91, socketId: "s1" },
        socket,
      );
      expect(sent.some((m) => m?.type === "proxy-worker:socket-accepted")).toBe(
        true,
      );
      const pendingErrorListeners = socket.listeners("error");
      const pendingCloseListeners = socket.listeners("close");

      // Drain arrives before the commit: the acknowledged socket must survive.
      process.emit("message", { type: "proxy-worker:drain", generation: 91 });
      expect(socket.destroyed).toBe(false);
      expect(runtime.snapshot().drained).toBe(false);

      // The delayed commit is honored — the connection is served, not dropped.
      process.emit("message", {
        type: "proxy-worker:socket-commit",
        generation: 91,
        socketId: "s1",
      });
      expect(socket.destroyed).toBe(false);
      expect(socket.resumed).toBe(true);
      for (const listener of pendingErrorListeners) {
        expect(socket.listeners("error")).not.toContain(listener);
      }
      for (const listener of pendingCloseListeners) {
        expect(socket.listeners("close")).not.toContain(listener);
      }
    } finally {
      if (originalConnected) {
        Object.defineProperty(process, "connected", originalConnected);
      } else {
        delete (process as { connected?: boolean }).connected;
      }
      if (originalSend) {
        process.send = originalSend;
      } else {
        delete (process as { send?: unknown }).send;
      }
    }
  });

  it("survives a client reset while a transferred socket awaits commit", () => {
    const httpServer = createHttpServer();
    const runtime = attachSocketWorkerProcess(httpServer, {
      generation: 92,
      version: "9.93.1",
    });
    trackCleanup(() => runtime.close());

    const originalSend = process.send;
    const originalConnected = Object.getOwnPropertyDescriptor(
      process,
      "connected",
    );
    (process as { send?: unknown }).send = (
      _message: unknown,
      handleOrCallback?: unknown,
      _options?: unknown,
      maybeCallback?: unknown,
    ): boolean => {
      const ack =
        typeof handleOrCallback === "function"
          ? handleOrCallback
          : maybeCallback;
      if (typeof ack === "function") {
        (ack as (error: Error | null) => void)(null);
      }
      return true;
    };
    Object.defineProperty(process, "connected", {
      value: true,
      configurable: true,
    });

    try {
      process.emit("message", {
        type: "proxy-worker:activate",
        generation: 92,
      });
      const socket = new FakeSocket();
      process.emit(
        "message",
        { type: "proxy-worker:socket", generation: 92, socketId: "reset" },
        socket,
      );

      expect(() =>
        socket.emit(
          "error",
          Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" }),
        ),
      ).not.toThrow();
      expect(socket.destroyed).toBe(true);

      process.emit("message", {
        type: "proxy-worker:socket-commit",
        generation: 92,
        socketId: "reset",
      });
      expect(socket.resumed).toBe(false);
    } finally {
      if (originalConnected) {
        Object.defineProperty(process, "connected", originalConnected);
      } else {
        delete (process as { connected?: boolean }).connected;
      }
      if (originalSend) {
        process.send = originalSend;
      } else {
        delete (process as { send?: unknown }).send;
      }
    }
  });
});

describe("cross-process socket handoff", () => {
  it("replays readiness emitted before a supervisor subscribes", async () => {
    const readySignal = join(
      tmpdir(),
      `proxy-worker-ready-${process.pid}-${Date.now()}`,
    );
    trackCleanup(() => rmSync(readySignal, { force: true }));
    const handle = spawnTrackedWorker({
      generation: 1,
      expectedVersion: "9.93.1",
      command: process.execPath,
      args: [IPC_HTTP_WORKER],
      stdout: "ignore",
      stderr: "ignore",
      env: { NEUROLINK_PROXY_WORKER_READY_SIGNAL: readySignal },
    });
    // Await the worker's explicit confirmation that readiness was emitted before
    // subscribing, so this deterministically exercises buffered replay rather
    // than degrading into a live-delivery test on slow machines. The generous
    // timeout keeps more slow-start tolerance than the fixed sleep it replaced.
    await vi.waitFor(
      () => {
        if (!existsSync(readySignal)) {
          throw new Error("worker has not signalled readiness yet");
        }
      },
      { timeout: 5_000, interval: 20 },
    );

    const ready = await new Promise<ProxyWorkerStatusMessage>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("buffered readiness was not replayed")),
          2_000,
        );
        handle.onMessage((message) => {
          if (message.type === "proxy-worker:ready") {
            clearTimeout(timeout);
            resolve(message);
          }
        });
      },
    );
    expect(ready).toMatchObject({
      type: "proxy-worker:ready",
      generation: 1,
      version: "9.93.1",
    });
    const exited = new Promise<void>((resolve) => {
      handle.onExit(() => resolve());
    });
    handle.terminate("SIGKILL");
    await exited;
  });

  it("binds the public listener before the initial worker is ready", async () => {
    const reservation = createNetServer();
    await new Promise<void>((resolve) =>
      reservation.listen(0, "127.0.0.1", resolve),
    );
    const reservedAddress = reservation.address();
    if (!reservedAddress || typeof reservedAddress === "string") {
      throw new Error("port reservation failed");
    }
    const port = reservedAddress.port;
    await new Promise<void>((resolve, reject) =>
      reservation.close((error) => (error ? reject(error) : resolve())),
    );

    const worker = new FakeWorker(490);
    let spawned = false;
    const starting = trackRollingServerPromise(
      startRollingProxyServer({
        host: "127.0.0.1",
        port,
        initialVersion: "9.93.1",
        spawnWorker: () => {
          spawned = true;
          return worker;
        },
      }),
    );
    await vi.waitFor(() => expect(spawned).toBe(true));
    const client = createConnection({ host: "127.0.0.1", port });
    trackConnection(client);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve);
      client.once("error", reject);
    });

    worker.ready(1, "9.93.1");
    const rollingServer = await starting;
    await vi.waitFor(() => expect(worker.sockets).toHaveLength(1));
    worker.sockets[0].destroy();
    client.destroy();
    const closing = rollingServer.close();
    worker.exit(0, null);
    await closing;
  });

  it("keeps the worker alive when a client resets before socket commit", async () => {
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      spawnWorker: (generation, expectedVersion) =>
        spawnProxySocketWorker({
          generation,
          expectedVersion,
          command: process.execPath,
          args: [IPC_HTTP_WORKER],
          stdout: "ignore",
          stderr: "ignore",
          env: { NEUROLINK_PROXY_WORKER_SOCKET_ACCEPT_DELAY_MS: "100" },
        }),
    });
    const initialWorker = rollingServer.snapshot().active;
    expect(initialWorker).not.toBeNull();

    const client = createConnection({
      host: "127.0.0.1",
      port: rollingServer.address.port,
    });
    trackConnection(client);
    await new Promise<void>((resolve, reject) => {
      client.once("connect", resolve);
      client.once("error", reject);
    });
    client.resetAndDestroy();
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    expect(rollingServer.snapshot()).toMatchObject({
      active: initialWorker,
      failedTransfers: 0,
    });
    const response = await fetch(
      `http://127.0.0.1:${rollingServer.address.port}/health`,
      { headers: { connection: "close" } },
    );
    expect(await response.text()).toBe("worker-9.93.1");
    await rollingServer.close();
  });

  it("keeps the listener alive and recovers after initial worker startup fails", async () => {
    let spawnCount = 0;
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      recoveryDelayMs: 10,
      maxRecoveryDelayMs: 20,
      spawnWorker: (generation, expectedVersion) => {
        spawnCount += 1;
        if (spawnCount === 1) {
          throw new Error("fixture startup failed");
        }
        return spawnProxySocketWorker({
          generation,
          expectedVersion,
          command: process.execPath,
          args: [IPC_HTTP_WORKER],
          stdout: "ignore",
          stderr: "ignore",
        });
      },
    });

    const response = await fetch(
      `http://127.0.0.1:${rollingServer.address.port}/health`,
      { headers: { connection: "close" } },
    );
    expect(await response.text()).toBe("worker-9.93.1");
    expect(spawnCount).toBe(2);
    expect(rollingServer.snapshot()).toMatchObject({
      active: { version: "9.93.1", generation: 2 },
      rejectedSockets: 0,
    });
    await rollingServer.close();
  });

  it("rolls to a same-version worker when the active worker reports an environment change", async () => {
    const workers: FakeWorker[] = [];
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      spawnWorker: (generation, expectedVersion) => {
        const worker = new FakeWorker(500 + generation);
        workers.push(worker);
        queueMicrotask(() => worker.ready(generation, expectedVersion));
        return worker;
      },
    });

    workers[0].requestReplacement(1);

    await vi.waitFor(() =>
      expect(rollingServer.snapshot().active).toMatchObject({
        generation: 2,
        version: "9.93.1",
      }),
    );
    expect(workers).toHaveLength(2);
    expect(workers[0].controls).toContainEqual({
      type: "proxy-worker:drain",
      generation: 1,
    });
    const closing = rollingServer.close();
    workers[0].exit(0, null);
    workers[1].exit(0, null);
    await closing;
  });

  it("serializes an explicit replacement behind an environment replacement", async () => {
    const workers: FakeWorker[] = [];
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      spawnWorker: (generation, expectedVersion) => {
        const worker = new FakeWorker(520 + generation);
        workers.push(worker);
        if (generation !== 2) {
          queueMicrotask(() => worker.ready(generation, expectedVersion));
        }
        return worker;
      },
    });

    workers[0].requestReplacement(1);
    await vi.waitFor(() => expect(workers).toHaveLength(2));

    const explicitReplacement = rollingServer.replace("9.94.0");
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(workers).toHaveLength(2);

    workers[1].ready(2, "9.93.1");
    await explicitReplacement;

    expect(workers).toHaveLength(3);
    expect(rollingServer.snapshot().active).toMatchObject({
      generation: 3,
      version: "9.94.0",
    });
    const closing = rollingServer.close();
    for (const worker of workers) {
      worker.exit(0, null);
    }
    await closing;
  });

  it("preserves an environment replacement when the active worker exits during debounce", async () => {
    const workers: FakeWorker[] = [];
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      recoveryDelayMs: 100,
      maxRecoveryDelayMs: 100,
      spawnWorker: (generation, expectedVersion) => {
        const worker = new FakeWorker(540 + generation);
        workers.push(worker);
        queueMicrotask(() => worker.ready(generation, expectedVersion));
        return worker;
      },
    });

    workers[0].requestReplacement(1);
    workers[0].exit(1, null);

    await vi.waitFor(
      () =>
        expect(rollingServer.snapshot().active).toMatchObject({
          generation: 3,
          version: "9.93.1",
        }),
      { timeout: 1_000 },
    );
    expect(workers).toHaveLength(3);
    expect(workers[1].controls).toContainEqual({
      type: "proxy-worker:drain",
      generation: 2,
    });
    const closing = rollingServer.close();
    for (const worker of workers) {
      worker.exit(0, null);
    }
    await closing;
  });

  it("atomically routes new TCP connections to a replacement process", async () => {
    const supervisor = createTrackedSupervisor({
      spawnWorker: (generation, expectedVersion) =>
        spawnProxySocketWorker({
          generation,
          expectedVersion,
          command: process.execPath,
          args: [IPC_HTTP_WORKER],
          stdout: "ignore",
          stderr: "ignore",
        }),
    });
    await supervisor.start("9.93.1");
    const broker = createNetServer({ pauseOnConnect: true }, (socket) => {
      supervisor.acceptSocket(socket);
    });
    trackServer(broker);
    await new Promise<void>((resolve) =>
      broker.listen(0, "127.0.0.1", resolve),
    );
    const address = broker.address();
    if (!address || typeof address === "string") {
      throw new Error("broker did not expose a port");
    }
    const request = async () => {
      const response = await fetch(`http://127.0.0.1:${address.port}/health`, {
        headers: { connection: "close" },
      });
      return {
        version: response.headers.get("x-worker-version"),
        body: await response.text(),
      };
    };

    await expect(request()).resolves.toEqual({
      version: "9.93.1",
      body: "worker-9.93.1",
    });
    await supervisor.replace("9.94.0");
    await expect(request()).resolves.toEqual({
      version: "9.94.0",
      body: "worker-9.94.0",
    });
    expect(supervisor.snapshot()).toMatchObject({
      active: { version: "9.94.0", generation: 2 },
      rejectedSockets: 0,
      failedTransfers: 0,
    });

    await Promise.all([
      supervisor.close(),
      new Promise<void>((resolve, reject) =>
        broker.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
  });

  it("stops admission and drains an active stream during server shutdown", async () => {
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      spawnWorker: (generation, expectedVersion) =>
        spawnProxySocketWorker({
          generation,
          expectedVersion,
          command: process.execPath,
          args: [IPC_HTTP_WORKER],
          stdout: "ignore",
          stderr: "ignore",
        }),
    });
    const response = await fetch(
      `http://127.0.0.1:${rollingServer.address.port}/stream`,
      { headers: { connection: "close" } },
    );

    const closing = rollingServer.close();
    expect((await response.arrayBuffer()).byteLength).toBe(20 * 256);
    await closing;
    await expect(
      fetch(`http://127.0.0.1:${rollingServer.address.port}/health`),
    ).rejects.toThrow();
  });

  it("recovers the listener after a detected active-worker crash", async () => {
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      recoveryDelayMs: 50,
      maxRecoveryDelayMs: 100,
      spawnWorker: (generation, expectedVersion) =>
        spawnProxySocketWorker({
          generation,
          expectedVersion,
          command: process.execPath,
          args: [IPC_HTTP_WORKER],
          stdout: "ignore",
          stderr: "ignore",
        }),
    });
    const initialPid = rollingServer.snapshot().active?.pid;
    expect(initialPid).toBeTypeOf("number");
    process.kill(initialPid!, "SIGKILL");
    await vi.waitFor(() => expect(rollingServer.snapshot().active).toBeNull());

    const responsePromise = fetch(
      `http://127.0.0.1:${rollingServer.address.port}/health`,
      { headers: { connection: "close" } },
    );
    const response = await responsePromise;
    expect(response.headers.get("x-worker-version")).toBe("9.93.1");
    expect(await response.text()).toBe("worker-9.93.1");
    expect(rollingServer.snapshot().active?.pid).not.toBe(initialPid);
    expect(rollingServer.snapshot()).toMatchObject({
      queuedSockets: 0,
      rejectedSockets: 0,
    });
    await rollingServer.close();
  });

  it("re-schedules recovery when an explicit replace fails while recovery is pending", async () => {
    // A long recovery delay keeps the recovery timer pending across the failed
    // replace, so this deterministically exercises the case where replace()
    // cancels the pending timer and rejects.
    const rollingServer = await startTrackedRollingServer({
      host: "127.0.0.1",
      port: 0,
      initialVersion: "9.93.1",
      recoveryDelayMs: 400,
      maxRecoveryDelayMs: 400,
      spawnWorker: (generation, expectedVersion) =>
        spawnProxySocketWorker({
          generation,
          expectedVersion,
          command: process.execPath,
          args: [IPC_HTTP_WORKER],
          stdout: "ignore",
          stderr: "ignore",
        }),
    });
    const initialPid = rollingServer.snapshot().active?.pid;
    expect(initialPid).toBeTypeOf("number");

    // Crash the worker so a recovery timer is armed, then reject an explicit
    // replace while that timer is still pending. Recovery must NOT be disabled.
    process.kill(initialPid!, "SIGKILL");
    await vi.waitFor(() => expect(rollingServer.snapshot().active).toBeNull());
    await expect(rollingServer.replace("not-a-version")).rejects.toBeTruthy();

    const response = await fetch(
      `http://127.0.0.1:${rollingServer.address.port}/health`,
      { headers: { connection: "close" } },
    );
    expect(response.headers.get("x-worker-version")).toBe("9.93.1");
    expect(rollingServer.snapshot().active?.pid).not.toBe(initialPid);
    await rollingServer.close();
  });
});
