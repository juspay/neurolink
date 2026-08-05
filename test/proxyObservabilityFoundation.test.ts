import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProxyStartApp } from "../src/cli/commands/proxy.js";
import {
  beginProxyRequest,
  resetProxyActivityForTests,
  trackProxyResponse,
} from "../src/lib/proxy/proxyActivity.js";
import {
  configureProxyLifecycleLogger,
  __proxyLifecycleTestHooks,
  flushProxyLifecycleEvents,
  getProxyLifecycleLoggerSnapshot,
  hashProxyLifecycleSessionId,
  logProxyLifecycleEvent,
  resetProxyLifecycleLoggerForTests,
} from "../src/lib/proxy/proxyLifecycle.js";
import {
  __requestLoggerTestHooks,
  cleanupLogs,
  flushRequestLogs,
  initRequestLogger,
  logBodyCapture,
  logRequestAttempt,
} from "../src/lib/proxy/requestLogger.js";
import type { ProxyResponseTerminalOutcome } from "../src/lib/types/index.js";
import compatibilityFixture from "./fixtures/proxy-compatibility-v9.88.12.json";

const gunzipAsync = promisify(gunzip);
const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "neurolink-proxy-contract-"));
  tempDirs.push(directory);
  return directory;
}

async function readJsonLines(path: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(path, "utf8");
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function findLifecycleLogPath(logDir: string): Promise<string> {
  const files = (await readdir(logDir)).filter(
    (file) => file.startsWith("proxy-lifecycle-") && file.endsWith(".jsonl"),
  );
  if (files.length !== 1 || !files[0]) {
    throw new Error(`Expected one lifecycle log, found ${files.length}`);
  }
  return join(logDir, files[0]);
}

function permissionBits(mode: number): string {
  return (mode & 0o777).toString(8).padStart(3, "0");
}

afterEach(async () => {
  vi.useRealTimers();
  await flushProxyLifecycleEvents();
  initRequestLogger(false);
  resetProxyLifecycleLoggerForTests();
  resetProxyActivityForTests();
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("proxy 9.88.12 compatibility contract", () => {
  it("preserves four-phase redacted, truncated, compressed body captures", async () => {
    const logDir = await makeTempDir();
    initRequestLogger(true, logDir);
    const timestamp = "2026-07-17T01:02:03.000Z";
    const requestId = "compatibility-request";
    const secret = "must-not-survive-redaction";
    const largeBody = JSON.stringify({
      api_key: secret,
      content: "x".repeat(
        compatibilityFixture.bodyCapture.maxCapturedBodyBytes + 256,
      ),
    });

    for (const phase of compatibilityFixture.bodyCapture.phases) {
      await logBodyCapture({
        timestamp,
        requestId,
        phase,
        model: "claude-sonnet-5",
        stream: true,
        headers: {
          authorization: "Bearer should-be-redacted",
          "content-type": "application/json",
        },
        body: largeBody,
        bodySize: Buffer.byteLength(largeBody),
        contentType: "application/json",
        responseStatus: 200,
        durationMs: 123,
        account: "fixture@example.com",
        accountType: "oauth",
        attempt: 1,
        traceId: "a".repeat(32),
        spanId: "b".repeat(16),
        metadata: { fixture: true },
      });
    }

    const indexPath = join(logDir, "proxy-debug-2026-07-17.jsonl");
    const entries = await readJsonLines(indexPath);
    expect(entries.map((entry) => entry.phase)).toEqual(
      compatibilityFixture.bodyCapture.phases,
    );
    expect(permissionBits((await stat(logDir)).mode)).toBe(
      compatibilityFixture.bodyCapture.directoryMode,
    );

    for (const entry of entries) {
      expect(entry.type).toBe(compatibilityFixture.bodyCapture.indexType);
      expect(Object.keys(entry).sort()).toEqual(
        [...compatibilityFixture.bodyCapture.indexFields].sort(),
      );
      expect(entry.headers).toMatchObject({
        authorization: "[REDACTED]",
      });
      expect(entry.bodyTruncated).toBe(true);
      expect(entry.redactedBodyBytes).toBe(
        compatibilityFixture.bodyCapture.maxCapturedBodyBytes,
      );

      const bodyPath = String(entry.bodyPath);
      expect(
        bodyPath.endsWith(
          `${String(entry.phase)}-attempt-1${compatibilityFixture.bodyCapture.artifactExtension}`,
        ),
      ).toBe(true);
      expect(permissionBits((await stat(bodyPath)).mode)).toBe(
        compatibilityFixture.bodyCapture.fileMode,
      );
      expect(permissionBits((await stat(join(bodyPath, ".."))).mode)).toBe(
        compatibilityFixture.bodyCapture.directoryMode,
      );

      const artifact = JSON.parse(
        (await gunzipAsync(await readFile(bodyPath))).toString("utf8"),
      ) as Record<string, unknown>;
      expect(Object.keys(artifact).sort()).toEqual(
        [...compatibilityFixture.bodyCapture.artifactFields].sort(),
      );
      expect(artifact.body).not.toContain(secret);
      expect(artifact.body).toContain('"api_key":"[REDACTED]"');
      expect(
        String(artifact.body).endsWith(
          compatibilityFixture.bodyCapture.truncationMarker,
        ),
      ).toBe(true);
    }
  });

  it("preserves current-day metadata while evicting older logs and body artifacts", async () => {
    const logDir = await makeTempDir();
    initRequestLogger(true, logDir);
    const now = Date.now();
    const currentDate = new Date(now).toISOString().split("T")[0];
    const previousDate = new Date(now - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const currentMetadata = [
      `proxy-${currentDate}.jsonl`,
      `proxy-attempts-${currentDate}.jsonl`,
      `proxy-debug-${currentDate}.jsonl`,
      `proxy-lifecycle-${currentDate}.jsonl`,
    ].map((name) => join(logDir, name));
    const previousLog = join(logDir, `proxy-${previousDate}.jsonl`);
    const previousLifecycleLog = join(
      logDir,
      `proxy-lifecycle-${previousDate}.jsonl`,
    );
    const bodyDir = join(logDir, "bodies", currentDate, "request-1");
    const bodyArtifact = join(bodyDir, "response.json.gz");

    await mkdir(bodyDir, { recursive: true });
    await Promise.all([
      ...currentMetadata.map((path) => writeFile(path, "x".repeat(4096))),
      writeFile(previousLog, "x".repeat(4096)),
      writeFile(previousLifecycleLog, "x".repeat(4096)),
      writeFile(bodyArtifact, "x".repeat(4096)),
    ]);
    const older = new Date(now - 60_000);
    await Promise.all([
      utimes(previousLog, older, older),
      utimes(previousLifecycleLog, older, older),
      utimes(bodyArtifact, older, older),
    ]);

    cleanupLogs(7, 0.001);

    await Promise.all(
      currentMetadata.map((path) => expect(stat(path)).resolves.toBeDefined()),
    );
    await expect(stat(previousLog)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(previousLifecycleLog)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(stat(bodyArtifact)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("flushes admitted attempt writes before a rolling worker exits", async () => {
    const logDir = await makeTempDir();
    initRequestLogger(true, logDir);
    const timestamp = new Date().toISOString();

    void logRequestAttempt({
      timestamp,
      requestId: "draining-attempt",
      attempt: 1,
      method: "POST",
      path: "/v1/messages",
      model: "claude-sonnet-5",
      stream: true,
      toolCount: 0,
      account: "primary@example.com",
      accountType: "oauth",
      responseStatus: 200,
      responseTimeMs: 25,
      attemptDurationMs: 20,
    });
    await flushRequestLogs();

    const date = timestamp.split("T")[0];
    await expect(
      readJsonLines(join(logDir, `proxy-attempts-${date}.jsonl`)),
    ).resolves.toEqual([
      expect.objectContaining({
        requestId: "draining-attempt",
        responseStatus: 200,
      }),
    ]);
  });

  it("bounds request-log flushing when an admitted operation never settles", async () => {
    const neverSettles = new Promise<void>(() => undefined);
    void __requestLoggerTestHooks.trackLogOperation(neverSettles);

    await expect(flushRequestLogs(10)).rejects.toThrow(
      "Timed out flushing 1 proxy request log operation(s)",
    );
    await expect(flushRequestLogs(10)).resolves.toBeUndefined();
  });

  it("retains operations admitted while a flush batch reaches its deadline", async () => {
    vi.useFakeTimers();
    let resolveLateOperation: (() => void) | undefined;
    const lateOperation = new Promise<void>((resolve) => {
      resolveLateOperation = resolve;
    });
    const firstOperation = new Promise<void>((resolve) =>
      setTimeout(resolve, 10),
    ).then(() => {
      void __requestLoggerTestHooks.trackLogOperation(lateOperation);
    });
    void __requestLoggerTestHooks.trackLogOperation(firstOperation);

    const flushing = flushRequestLogs(10);
    const flushExpectation = expect(flushing).rejects.toThrow(
      "Timed out flushing 1 proxy request log operation(s)",
    );
    await vi.advanceTimersByTimeAsync(10);
    await flushExpectation;
    expect(__requestLoggerTestHooks.pendingOperationCount()).toBe(1);

    resolveLateOperation?.();
    await Promise.resolve();
    await expect(flushRequestLogs(10)).resolves.toBeUndefined();
  });
});

describe("bounded proxy lifecycle metadata", () => {
  it("keeps session hashes stable across process-style logger resets", async () => {
    const logDir = await makeTempDir();
    const previousSecret = process.env.NEUROLINK_PROXY_SESSION_SECRET;
    delete process.env.NEUROLINK_PROXY_SESSION_SECRET;
    try {
      configureProxyLifecycleLogger({ enabled: true, logDir });
      const firstHash = hashProxyLifecycleSessionId("private-session-id");

      resetProxyLifecycleLoggerForTests();
      configureProxyLifecycleLogger({ enabled: true, logDir });
      const secondHash = hashProxyLifecycleSessionId("private-session-id");

      expect(secondHash).toBe(firstHash);
      expect(secondHash).not.toContain("private-session-id");
      expect(
        permissionBits(
          (await stat(join(logDir, ".proxy-lifecycle-session-key"))).mode,
        ),
      ).toBe("600");
    } finally {
      if (previousSecret === undefined) {
        delete process.env.NEUROLINK_PROXY_SESSION_SECRET;
      } else {
        process.env.NEUROLINK_PROXY_SESSION_SECRET = previousSecret;
      }
    }
  });

  it("drains queued events to their original directory across reconfiguration", async () => {
    const firstLogDir = await makeTempDir();
    const secondLogDir = await makeTempDir();
    const timestampMs = Date.parse("2026-07-17T02:15:00.000Z");
    configureProxyLifecycleLogger({
      enabled: true,
      logDir: firstLogDir,
      flushIntervalMs: 60_000,
    });
    logProxyLifecycleEvent({
      event: "request_accepted",
      requestId: "before-reconfigure",
      method: "POST",
      path: "/v1/messages",
      timestampMs,
    });

    configureProxyLifecycleLogger({
      enabled: true,
      logDir: secondLogDir,
      flushIntervalMs: 60_000,
    });
    logProxyLifecycleEvent({
      event: "request_accepted",
      requestId: "after-reconfigure",
      method: "POST",
      path: "/v1/messages",
      timestampMs,
    });
    await flushProxyLifecycleEvents();

    await expect(
      readJsonLines(join(firstLogDir, "proxy-lifecycle-2026-07-17.jsonl")),
    ).resolves.toMatchObject([{ requestId: "before-reconfigure" }]);
    await expect(
      readJsonLines(join(secondLogDir, "proxy-lifecycle-2026-07-17.jsonl")),
    ).resolves.toMatchObject([{ requestId: "after-reconfigure" }]);
    expect(getProxyLifecycleLoggerSnapshot()).toMatchObject({
      attempted: 2,
      written: 2,
      dropped: 0,
      pending: 0,
      inFlight: 0,
    });
  });

  it("writes ordered, content-free events with stable session hashes", async () => {
    const logDir = await makeTempDir();
    configureProxyLifecycleLogger({
      enabled: true,
      logDir,
      flushIntervalMs: 60_000,
    });
    const common = {
      requestId: "request-1",
      method: "POST",
      path: "/v1/messages",
      model: "claude-sonnet-5",
      stream: true,
      toolCount: 80,
      sessionHash: hashProxyLifecycleSessionId("private-session-id"),
      timestampMs: Date.parse("2026-07-17T02:00:00.000Z"),
    };

    logProxyLifecycleEvent({
      ...common,
      event: "request_accepted",
      requestBytes: 9_850_000,
      elapsedMs: 0,
    });
    logProxyLifecycleEvent({
      ...common,
      event: "response_headers",
      responseStatus: 200,
      elapsedMs: 125.5,
    });
    logProxyLifecycleEvent({
      ...common,
      event: "request_terminal",
      responseStatus: 200,
      observedBodyBytes: 4096,
      responseChunks: 8,
      elapsedMs: 450.25,
      terminalOutcome: "completed",
    });
    await flushProxyLifecycleEvents();

    const events = await readJsonLines(
      join(logDir, "proxy-lifecycle-2026-07-17.jsonl"),
    );
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.event)).toEqual([
      "request_accepted",
      "response_headers",
      "request_terminal",
    ]);
    expect(new Set(events.map((event) => event.processInstanceId)).size).toBe(
      1,
    );
    expect(new Set(events.map((event) => event.sessionHash)).size).toBe(1);
    expect(JSON.stringify(events)).not.toContain("private-session-id");
    expect(events.every((event) => event.schemaVersion === 1)).toBe(true);
    const snapshot = getProxyLifecycleLoggerSnapshot();
    expect(snapshot).toMatchObject({
      enabled: true,
      attempted: 3,
      enqueued: 3,
      written: 3,
      dropped: 0,
      queueDrops: 0,
      invalidDrops: 0,
      writeDrops: 0,
      pending: 0,
      inFlight: 0,
    });
    expect(snapshot.attempted).toBe(
      snapshot.enqueued + snapshot.queueDrops + snapshot.invalidDrops,
    );
    expect(snapshot.enqueued).toBe(
      snapshot.written +
        snapshot.writeDrops +
        snapshot.pending +
        snapshot.inFlight,
    );
  });

  it("makes bounded-queue loss explicit through counters and sequence gaps", async () => {
    const logDir = await makeTempDir();
    const timestampMs = Date.parse("2026-07-17T02:30:00.000Z");
    configureProxyLifecycleLogger({
      enabled: true,
      logDir,
      queueCapacity: 2,
      flushIntervalMs: 60_000,
    });
    const enqueue = (requestId: string) =>
      logProxyLifecycleEvent({
        event: "request_accepted",
        requestId,
        method: "POST",
        path: "/v1/messages",
        timestampMs,
      });

    enqueue("request-1");
    enqueue("request-2");
    enqueue("request-dropped");
    await flushProxyLifecycleEvents();
    enqueue("request-4");
    await flushProxyLifecycleEvents();

    const events = await readJsonLines(
      join(logDir, "proxy-lifecycle-2026-07-17.jsonl"),
    );
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 4]);
    expect(events.map((event) => event.requestId)).not.toContain(
      "request-dropped",
    );
    const snapshot = getProxyLifecycleLoggerSnapshot();
    expect(snapshot).toMatchObject({
      attempted: 4,
      enqueued: 3,
      written: 3,
      dropped: 1,
      queueDrops: 1,
      invalidDrops: 0,
      writeDrops: 0,
      nextSequence: 5,
    });
    expect(snapshot.attempted).toBe(
      snapshot.enqueued + snapshot.queueDrops + snapshot.invalidDrops,
    );
    expect(snapshot.enqueued).toBe(
      snapshot.written +
        snapshot.writeDrops +
        snapshot.pending +
        snapshot.inFlight,
    );
  });

  it("creates the lifecycle log directory before accepting events", async () => {
    const parentDir = await makeTempDir();
    const logDir = join(parentDir, "nested", "lifecycle");
    configureProxyLifecycleLogger({
      enabled: true,
      logDir,
      flushIntervalMs: 60_000,
    });
    logProxyLifecycleEvent({
      event: "request_terminal",
      requestId: "created-directory",
      method: "POST",
      path: "/v1/messages",
      responseStatus: 200,
      terminalOutcome: "completed",
      timestampMs: Date.parse("2026-07-17T03:00:00.000Z"),
    });

    await expect(flushProxyLifecycleEvents()).resolves.toBeUndefined();
    expect(permissionBits((await stat(logDir)).mode)).toBe("700");
    await expect(
      readJsonLines(join(logDir, "proxy-lifecycle-2026-07-17.jsonl")),
    ).resolves.toHaveLength(1);
    expect(getProxyLifecycleLoggerSnapshot()).toMatchObject({
      enabled: true,
      attempted: 1,
      written: 1,
      dropped: 0,
    });
  });

  it("contains write failures and accounts for every unwritten event", async () => {
    const logDir = await makeTempDir();
    configureProxyLifecycleLogger({
      enabled: true,
      logDir,
      flushIntervalMs: 60_000,
      maxWriteRetries: 1,
    });
    await rm(logDir, { recursive: true, force: true });
    logProxyLifecycleEvent({
      event: "request_terminal",
      requestId: "write-failure",
      method: "POST",
      path: "/v1/messages",
      responseStatus: 200,
      terminalOutcome: "completed",
    });

    await expect(flushProxyLifecycleEvents()).resolves.toBeUndefined();
    const snapshot = getProxyLifecycleLoggerSnapshot();
    expect(snapshot).toMatchObject({
      attempted: 1,
      enqueued: 1,
      written: 0,
      dropped: 1,
      queueDrops: 0,
      invalidDrops: 0,
      writeDrops: 1,
      writeFailures: 2,
      writeRetries: 1,
      pending: 0,
      inFlight: 0,
    });
    expect(snapshot.enqueued).toBe(
      snapshot.written +
        snapshot.writeDrops +
        snapshot.pending +
        snapshot.inFlight,
    );
  });

  it("recovers lifecycle metadata after one transient append failure", async () => {
    const logDir = await makeTempDir();
    let appendCalls = 0;
    __proxyLifecycleTestHooks.setAppendFileForTests(
      async (path, data, options) => {
        appendCalls += 1;
        if (appendCalls === 1) {
          throw new Error("transient lifecycle storage failure");
        }
        await appendFile(path, data, options);
      },
    );
    configureProxyLifecycleLogger({
      enabled: true,
      logDir,
      flushIntervalMs: 60_000,
      maxWriteRetries: 2,
    });
    logProxyLifecycleEvent({
      event: "request_terminal",
      requestId: "retry-after-transient-failure",
      method: "POST",
      path: "/v1/messages",
      responseStatus: 200,
      terminalOutcome: "completed",
      timestampMs: Date.parse("2026-07-17T03:30:00.000Z"),
    });

    await flushProxyLifecycleEvents();

    expect(appendCalls).toBe(2);
    await expect(
      readJsonLines(join(logDir, "proxy-lifecycle-2026-07-17.jsonl")),
    ).resolves.toMatchObject([
      { requestId: "retry-after-transient-failure", sequence: 1 },
    ]);
    expect(getProxyLifecycleLoggerSnapshot()).toMatchObject({
      attempted: 1,
      enqueued: 1,
      written: 1,
      dropped: 0,
      writeDrops: 0,
      writeFailures: 1,
      writeRetries: 1,
      pending: 0,
      inFlight: 0,
    });
  });

  it("disables lifecycle logging when its directory cannot be created", async () => {
    const parentDir = await makeTempDir();
    const filePath = join(parentDir, "not-a-directory");
    await writeFile(filePath, "occupied");

    expect(() =>
      configureProxyLifecycleLogger({
        enabled: true,
        logDir: join(filePath, "lifecycle"),
      }),
    ).not.toThrow();
    logProxyLifecycleEvent({
      event: "request_accepted",
      requestId: "disabled-logger",
      method: "POST",
      path: "/v1/messages",
    });

    expect(getProxyLifecycleLoggerSnapshot()).toMatchObject({
      enabled: false,
      attempted: 0,
      enqueued: 0,
      written: 0,
    });
  });

  it("contains invalid runtime metadata without throwing on the hot path", async () => {
    const logDir = await makeTempDir();
    configureProxyLifecycleLogger({
      enabled: true,
      logDir,
      flushIntervalMs: 60_000,
    });

    expect(() =>
      logProxyLifecycleEvent({
        event: "request_accepted",
        requestId: "invalid-clock",
        method: "POST",
        path: "/v1/messages",
        timestampMs: Number.NaN,
        monotonicMs: Number.POSITIVE_INFINITY,
      }),
    ).not.toThrow();
    const invalidInput = {
      event: "request_accepted",
      requestId: "throwing-input",
      method: "POST",
      path: "/v1/messages",
      get timestampMs() {
        throw new Error("invalid timestamp getter");
      },
    };
    expect(() => logProxyLifecycleEvent(invalidInput as never)).not.toThrow();
    await flushProxyLifecycleEvents();

    const [event] = await readJsonLines(await findLifecycleLogPath(logDir));
    expect(Number.isFinite(Date.parse(String(event?.timestamp)))).toBe(true);
    expect(Number.isFinite(event?.monotonicMs)).toBe(true);
    expect(getProxyLifecycleLoggerSnapshot()).toMatchObject({
      attempted: 2,
      enqueued: 1,
      written: 1,
      dropped: 1,
      invalidDrops: 1,
    });
  });
});

describe("response compatibility and lifecycle settlement", () => {
  it("preserves response bytes and reports first chunk plus one terminal outcome", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'event: message_start\ndata: {"type":"message_start"}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ];
    const expectedBody = chunks.join("");
    const outcomes: Array<{
      outcome: ProxyResponseTerminalOutcome;
      observedBodyBytes: number;
      responseChunks: number;
    }> = [];
    const firstChunks: Array<{
      observedBodyBytes: number;
      responseChunks: 1;
    }> = [];
    const finish = beginProxyRequest();
    const response = trackProxyResponse(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            "x-compatibility": "preserved",
          },
        },
      ),
      finish,
      {
        onFirstChunk: (details) => firstChunks.push(details),
        onTerminal: (details) => outcomes.push(details),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("x-compatibility")).toBe("preserved");
    await expect(response.text()).resolves.toBe(expectedBody);
    expect(firstChunks).toEqual([
      {
        observedBodyBytes: Buffer.byteLength(chunks[0] ?? ""),
        responseChunks: 1,
      },
    ]);
    expect(outcomes).toEqual([
      {
        outcome: "completed",
        observedBodyBytes: Buffer.byteLength(expectedBody),
        responseChunks: 2,
      },
    ]);
  });

  it("records client cancellation once without consuming response content", async () => {
    const outcomes: ProxyResponseTerminalOutcome[] = [];
    const response = trackProxyResponse(
      new Response(
        new ReadableStream<Uint8Array>({
          pull() {
            // Stay open until the client cancels.
          },
        }),
      ),
      beginProxyRequest(),
      {
        onTerminal: ({ outcome }) => outcomes.push(outcome),
      },
    );

    await response.body?.cancel("test cancellation");
    expect(outcomes).toEqual(["client_cancelled"]);
  });

  it("settles client cancellation before upstream cleanup completes", async () => {
    const outcomes: ProxyResponseTerminalOutcome[] = [];
    let finishCleanup: (() => void) | undefined;
    const cleanup = new Promise<void>((resolve) => {
      finishCleanup = resolve;
    });
    const response = trackProxyResponse(
      new Response(
        new ReadableStream<Uint8Array>({
          cancel: () => cleanup,
        }),
      ),
      beginProxyRequest(),
      {
        onTerminal: ({ outcome }) => outcomes.push(outcome),
      },
    );

    const cancellation = response.body?.cancel("test cancellation");
    await Promise.resolve();
    expect(outcomes).toEqual(["client_cancelled"]);
    finishCleanup?.();
    await expect(cancellation).resolves.toBeUndefined();
  });

  it("does not let observer failures interrupt response delivery", async () => {
    const response = trackProxyResponse(
      new Response("response remains intact"),
      beginProxyRequest(),
      {
        onFirstChunk: () => {
          throw new Error("observer first-chunk failure");
        },
        onTerminal: () => {
          throw new Error("observer terminal failure");
        },
      },
    );

    await expect(response.text()).resolves.toBe("response remains intact");
  });

  it("correlates handler failures through one terminal lifecycle event", async () => {
    const logDir = await makeTempDir();
    initRequestLogger(true, logDir);
    const { app } = await createProxyStartApp({
      neurolink: { getToolRegistry: () => ({}) } as never,
      modelRouter: undefined,
      strategy: "fill-first",
      passthrough: false,
      port: 55125,
      host: "127.0.0.1",
      proxyConfig: null,
      primaryAccountKey: undefined,
      accountAllowlist: undefined,
    });
    app.get("/v1/test-handler-error", () => {
      throw Object.assign(new TypeError("fetch failed"), {
        cause: { code: "EADDRNOTAVAIL" },
      });
    });

    const response = await app.request("/v1/test-handler-error");
    expect(response.status).toBe(502);
    await response.text();
    await flushProxyLifecycleEvents();

    const lifecycleEvents = await readJsonLines(
      await findLifecycleLogPath(logDir),
    );
    expect(lifecycleEvents.map((event) => event.event)).toEqual([
      "request_accepted",
      "response_headers",
      "response_first_chunk",
      "request_terminal",
    ]);
    expect(lifecycleEvents[3]).toMatchObject({
      requestId: lifecycleEvents[0]?.requestId,
      responseStatus: 502,
      terminalOutcome: "completed",
      errorType: "unhandled_proxy_error",
      errorCode: "EADDRNOTAVAIL",
    });

    const requestLogFile = (await readdir(logDir)).find((file) =>
      /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/.test(file),
    );
    if (!requestLogFile) {
      throw new Error("Expected a final request log");
    }
    const [finalRequest] = await readJsonLines(join(logDir, requestLogFile));
    expect(finalRequest).toMatchObject({
      requestId: lifecycleEvents[0]?.requestId,
      responseStatus: 502,
      errorType: "unhandled_proxy_error",
      errorCode: "EADDRNOTAVAIL",
    });

    const status = await app.request("/status");
    expect(await status.json()).toMatchObject({
      activity: { activeRequests: 0 },
    });
  });

  it("emits a complete adapter lifecycle without changing a local response", async () => {
    const logDir = await makeTempDir();
    initRequestLogger(true, logDir);
    const { app } = await createProxyStartApp({
      neurolink: { getToolRegistry: () => ({}) } as never,
      modelRouter: undefined,
      strategy: "fill-first",
      passthrough: false,
      port: 55124,
      host: "127.0.0.1",
      proxyConfig: null,
      primaryAccountKey: undefined,
      accountAllowlist: undefined,
    });

    const response = await app.request("/v1/models", {
      headers: { "x-neurolink-session-id": "adapter-session" },
    });
    expect(response.status).toBe(200);
    const responseText = await response.text();
    expect(JSON.parse(responseText)).toMatchObject({
      data: expect.any(Array),
      has_more: false,
    });
    await flushProxyLifecycleEvents();

    const events = await readJsonLines(await findLifecycleLogPath(logDir));
    expect(events.map((event) => event.event)).toEqual([
      "request_accepted",
      "response_headers",
      "response_first_chunk",
      "request_terminal",
    ]);
    expect(events[0]).not.toHaveProperty("model");
    expect(events[0]).not.toHaveProperty("stream");
    expect(events[0]).not.toHaveProperty("toolCount");
    expect(events.at(-1)).toMatchObject({
      responseStatus: 200,
      observedBodyBytes: Buffer.byteLength(responseText),
      terminalOutcome: "completed",
    });

    const status = await app.request("/status");
    expect(await status.json()).toMatchObject({
      observability: {
        lifecycle: {
          enabled: true,
          attempted: 4,
          enqueued: 4,
          written: 4,
          dropped: 0,
        },
      },
    });
  });
});
