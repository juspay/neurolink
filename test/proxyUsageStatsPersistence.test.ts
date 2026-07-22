import { execFile } from "node:child_process";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { ProxyUsageStatsStore } from "../src/lib/proxy/usageStats.js";
import type {
  ProxyStatsLockOwner,
  ProxyUsageStatsStoreOptions,
} from "../src/lib/types/index.js";

const tempDirs: string[] = [];
const execFileAsync = promisify(execFile);

async function tempStatsPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "neurolink-proxy-stats-"));
  tempDirs.push(dir);
  return join(dir, "proxy-usage-stats.json");
}

function terminalErrorsPath(filePath: string): string {
  return join(dirname(filePath), "proxy-terminal-errors.json");
}

function createStore(
  filePath: string,
  options: Omit<ProxyUsageStatsStoreOptions, "filePath"> = {},
): ProxyUsageStatsStore {
  return new ProxyUsageStatsStore({
    filePath,
    flushIntervalMs: 60_000,
    ...options,
  });
}

async function writeLockFile(
  lockPath: string,
  overrides: Partial<ProxyStatsLockOwner> = {},
): Promise<void> {
  await writeFile(
    lockPath,
    JSON.stringify({
      token: "active-owner",
      pid: process.pid,
      acquiredAt: Date.now(),
      ...overrides,
    } satisfies ProxyStatsLockOwner),
    { mode: 0o600 },
  );
}

async function waitUntil(
  predicate: () => boolean,
  timeoutMs: number = 1_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for proxy statistics flush");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("persistent proxy usage statistics", () => {
  it("restores counters and per-account outcomes after process replacement", async () => {
    const filePath = await tempStatsPath();
    const first = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    await first.initialize();
    first.recordAttempt("primary@example.com", "oauth");
    first.recordAttemptError("primary@example.com", "oauth", 429, "transient");
    first.recordAttempt("fallback@example.com", "oauth");
    first.recordAttemptError("fallback@example.com", "oauth", 429, "quota");
    first.recordAttempt("fallback@example.com", "oauth");
    first.recordFinalSuccess("fallback@example.com", "oauth");
    await first.flush();

    const replacement = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    await replacement.initialize();

    expect(replacement.getStats()).toMatchObject({
      totalAttempts: 3,
      totalAttemptErrors: 2,
      totalRequests: 1,
      totalSuccess: 1,
      totalErrors: 0,
      totalRateLimits: 2,
      totalTransientRateLimits: 1,
      totalQuotaRateLimits: 1,
      accounts: {
        "primary@example.com": {
          attemptCount: 1,
          attemptErrorCount: 1,
          rateLimitCount: 1,
          transientRateLimitCount: 1,
        },
        "fallback@example.com": {
          attemptCount: 2,
          attemptErrorCount: 1,
          successCount: 1,
          rateLimitCount: 1,
          quotaRateLimitCount: 1,
        },
      },
    });
  });

  it("merges overlapping worker deltas without losing either worker", async () => {
    const filePath = await tempStatsPath();
    const oldWorker = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    const newWorker = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    await Promise.all([oldWorker.initialize(), newWorker.initialize()]);

    oldWorker.recordAttempt("old@example.com", "oauth");
    oldWorker.recordFinalSuccess("old@example.com", "oauth");
    newWorker.recordAttempt("new@example.com", "oauth");
    newWorker.recordFinalError(502, "new@example.com", "oauth");
    await Promise.all([oldWorker.flush(), newWorker.flush()]);

    const observer = new ProxyUsageStatsStore({ filePath });
    await observer.initialize();
    expect(observer.getStats()).toMatchObject({
      totalAttempts: 2,
      totalRequests: 2,
      totalSuccess: 1,
      totalErrors: 1,
      accounts: {
        "old@example.com": { successCount: 1 },
        "new@example.com": { errorCount: 1 },
      },
    });
    expect(observer.getPersistenceStatus()).toMatchObject({
      enabled: true,
      revision: 2,
      pendingMutations: 0,
      lastError: null,
    });
    expect(observer.getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { upstream_error: 1 },
    });
  });

  it("persists a bounded redacted terminal-error journal separately", async () => {
    const filePath = await tempStatsPath();
    let now = 1_800_000_000_000;
    const store = createStore(filePath, { now: () => now });
    await store.initialize();

    for (let index = 0; index < 25; index += 1) {
      store.recordFinalError(502, "primary@example.com", "oauth", {
        requestId: `request-${index}`,
        errorType: "stream_error",
        errorCode: "UND_ERR_SOCKET",
        terminalOutcome: "stream_error",
        message:
          "x".repeat(490) +
          ` Bearer secret-token-${index}-value ` +
          "y".repeat(1_000),
      });
      now += 1;
    }
    await store.flush();

    const replacement = createStore(filePath, { now: () => now });
    await replacement.initialize();
    const journal = replacement.getTerminalErrors();
    expect(journal).toMatchObject({
      startedAt: 1_800_000_000_000,
      totalErrors: 25,
      counts: { stream_error: 25 },
    });
    expect(journal.recent).toHaveLength(20);
    expect(journal.recent[0].requestId).toBe("request-5");
    expect(journal.recent.at(-1)).toMatchObject({
      requestId: "request-24",
      status: 502,
      category: "stream_error",
      account: "primary@example.com",
      errorType: "stream_error",
      errorCode: "UND_ERR_SOCKET",
    });
    expect(journal.recent.at(-1)?.message).toContain("***");
    expect(journal.recent.at(-1)?.message).not.toContain("secret-token");
    expect(journal.recent.at(-1)?.message).not.toContain("Bearer");
    expect(journal.recent.at(-1)?.message?.length).toBeLessThanOrEqual(500);

    const persistence = replacement.getPersistenceStatus();
    expect(persistence).toMatchObject({
      terminalErrorsFilePath: join(
        dirname(filePath),
        "proxy-terminal-errors.json",
      ),
      terminalErrorsRevision: 1,
      terminalErrorsPending: 0,
      terminalErrorsLastError: null,
    });
    expect(JSON.parse(await readFile(filePath, "utf8"))).not.toHaveProperty(
      "journal",
    );
    expect(
      JSON.parse(
        await readFile(
          join(dirname(filePath), "proxy-terminal-errors.json"),
          "utf8",
        ),
      ),
    ).toHaveProperty("journal.totalErrors", 25);
  });

  it("classifies not-found request failures as invalid requests", () => {
    const store = new ProxyUsageStatsStore();
    store.recordFinalError(404, undefined, "internal", {
      errorType: "not_found_error",
      message: "unsupported model",
    });

    expect(store.getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { invalid_request: 1, other: 0 },
      recent: [
        expect.objectContaining({
          status: 404,
          category: "invalid_request",
          errorType: "not_found_error",
        }),
      ],
    });
  });

  it("classifies stream telemetry failures as proxy errors", () => {
    const store = new ProxyUsageStatsStore();
    store.recordFinalError(500, "primary@example.com", "oauth", {
      errorType: "stream_telemetry_error",
      message: "capture failed",
    });

    expect(store.getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { proxy_error: 1, stream_error: 0 },
      recent: [
        expect.objectContaining({
          category: "proxy_error",
          errorType: "stream_telemetry_error",
        }),
      ],
    });
  });

  it("sanitizes persisted terminal messages for status JSON", () => {
    const store = new ProxyUsageStatsStore();
    store.recordFinalError(502, "primary@example.com", "oauth", {
      errorType: "network_error",
      message:
        "\u001b[31mfailed\nrequest https://user:secret@api.example.com/path?access_token=hidden\u001b[0m Bearer abcdefghijklmnop",
    });

    const message = store.getTerminalErrors().recent[0].message;
    expect(message).toBe("failed request https://api.example.com/path ***");
    expect(message).not.toContain("\u001b");
    expect(message).not.toContain("\n");
    expect(message).not.toContain("hidden");
    expect(message).not.toContain("abcdefghijklmnop");
  });

  it("returns counters and terminal details from one snapshot version", async () => {
    const store = new ProxyUsageStatsStore();
    store.recordFinalError(502, "primary@example.com", "oauth", {
      requestId: "atomic-snapshot",
      errorType: "stream_error",
    });

    const snapshot = await store.reconcileUsageSnapshot();
    expect(snapshot.statsVersion).toBe(snapshot.terminalErrorsVersion);
    expect(snapshot.stats.totalErrors).toBe(1);
    expect(snapshot.terminalErrors).toMatchObject({
      totalErrors: 1,
      recent: [expect.objectContaining({ requestId: "atomic-snapshot" })],
    });
  });

  it("serializes deltas from separate worker processes", async () => {
    const filePath = await tempStatsPath();
    const moduleUrl = new URL("../src/lib/proxy/usageStats.ts", import.meta.url)
      .href;
    const workerCount = 6;
    const requestsPerWorker = 40;
    await Promise.all(
      Array.from({ length: workerCount }, async (_, workerIndex) => {
        const script = `
          import { ProxyUsageStatsStore } from ${JSON.stringify(moduleUrl)};
          const store = new ProxyUsageStatsStore({
            filePath: ${JSON.stringify(filePath)},
            flushIntervalMs: 60_000,
          });
          await store.initialize();
          for (let request = 0; request < ${requestsPerWorker}; request += 1) {
            store.recordAttempt(${JSON.stringify(`worker-${workerIndex}@example.com`)}, "oauth");
            if (request === 0) {
              store.recordFinalError(502, ${JSON.stringify(`worker-${workerIndex}@example.com`)}, "oauth", {
                requestId: ${JSON.stringify(`worker-${workerIndex}-error`)},
                errorType: "stream_error",
                terminalOutcome: "stream_error",
                message: "worker stream interrupted",
              });
            } else {
              store.recordFinalSuccess(${JSON.stringify(`worker-${workerIndex}@example.com`)}, "oauth");
            }
          }
          await store.flush();
        `;
        await execFileAsync(
          process.execPath,
          ["--import", "tsx", "--input-type=module", "--eval", script],
          { cwd: process.cwd() },
        );
      }),
    );

    const observer = new ProxyUsageStatsStore({ filePath });
    await observer.initialize();
    expect(observer.getStats()).toMatchObject({
      totalAttempts: workerCount * requestsPerWorker,
      totalRequests: workerCount * requestsPerWorker,
      totalSuccess: workerCount * (requestsPerWorker - 1),
      totalErrors: workerCount,
    });
    expect(Object.keys(observer.getStats().accounts)).toHaveLength(workerCount);
    expect(observer.getPersistenceStatus()).toMatchObject({
      revision: workerCount,
      pendingMutations: 0,
      lastError: null,
      terminalErrorsRevision: workerCount,
      terminalErrorsPending: 0,
      terminalErrorsLastError: null,
    });
    expect(observer.getTerminalErrors()).toMatchObject({
      totalErrors: workerCount,
      counts: { stream_error: workerCount },
    });
    expect(
      observer
        .getTerminalErrors()
        .recent.map((summary) => summary.requestId)
        .sort(),
    ).toEqual(
      Array.from(
        { length: workerCount },
        (_, workerIndex) => `worker-${workerIndex}-error`,
      ).sort(),
    );
  }, 20_000);

  it("refreshes an active worker from deltas flushed by a draining worker", async () => {
    const filePath = await tempStatsPath();
    const active = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    const draining = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    await Promise.all([active.initialize(), draining.initialize()]);

    active.recordAttempt("active@example.com", "oauth");
    active.recordFinalSuccess("active@example.com", "oauth");
    await active.flush();
    draining.recordAttempt("draining@example.com", "oauth");
    draining.recordFinalSuccess("draining@example.com", "oauth");
    await draining.flush();

    await expect(active.reconcile()).resolves.toMatchObject({
      totalAttempts: 2,
      totalRequests: 2,
      totalSuccess: 2,
    });
  });

  it("reconciles persisted and local deltas without writing from status reads", async () => {
    const filePath = await tempStatsPath();
    const observer = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    const writer = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
    });
    await Promise.all([observer.initialize(), writer.initialize()]);

    writer.recordAttempt("writer@example.com", "oauth");
    writer.recordFinalSuccess("writer@example.com", "oauth");
    await writer.flush();
    observer.recordAttempt("observer@example.com", "oauth");
    observer.recordFinalSuccess("observer@example.com", "oauth");

    await expect(observer.reconcile()).resolves.toMatchObject({
      totalAttempts: 2,
      totalRequests: 2,
      totalSuccess: 2,
    });
    await expect(observer.reconcile()).resolves.toMatchObject({
      totalAttempts: 2,
      totalRequests: 2,
      totalSuccess: 2,
    });
    expect(observer.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 2,
    });
    expect(JSON.parse(await readFile(filePath, "utf8"))).toMatchObject({
      revision: 1,
      stats: { totalAttempts: 1, totalRequests: 1, totalSuccess: 1 },
    });
  });

  it("flushes mutations asynchronously without request-path I/O", async () => {
    const filePath = await tempStatsPath();
    const store = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 10,
    });
    await store.initialize();
    store.recordAttempt("primary@example.com", "oauth");
    store.recordFinalSuccess("primary@example.com", "oauth");

    expect(store.getPersistenceStatus().pendingMutations).toBe(2);
    await waitUntil(() => store.getPersistenceStatus().revision === 1);

    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 0,
      inFlightMutations: 0,
      unpersistedMutations: 0,
      lastError: null,
    });
    expect(JSON.parse(await readFile(filePath, "utf8"))).toMatchObject({
      stats: {
        totalAttempts: 1,
        totalRequests: 1,
        totalSuccess: 1,
      },
    });
  });

  it("quarantines corrupt state and resumes durable accounting", async () => {
    const filePath = await tempStatsPath();
    await writeFile(filePath, "{not-json", { mode: 0o600 });
    const store = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
      lockTimeoutMs: 100,
    });
    await store.initialize();
    store.recordAttempt("primary@example.com", "oauth");
    await store.flush();

    expect(store.getStats().totalAttempts).toBe(1);
    expect(store.getPersistenceStatus()).toMatchObject({
      pendingMutations: 0,
      revision: 1,
      lastError: null,
    });
    expect(store.getPersistenceStatus().lastRecoveryAt).toEqual(
      expect.any(Number),
    );
    expect(JSON.parse(await readFile(filePath, "utf8"))).toMatchObject({
      stats: { totalAttempts: 1 },
    });
    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
    const files = await readdir(dirname(filePath));
    const quarantined = files.find((file) =>
      file.startsWith("proxy-usage-stats.json.corrupt."),
    );
    expect(quarantined).toBeDefined();
    expect(await readFile(join(dirname(filePath), quarantined!), "utf8")).toBe(
      "{not-json",
    );
  });

  it("quarantines corrupt terminal-error state independently", async () => {
    const filePath = await tempStatsPath();
    const terminalFilePath = terminalErrorsPath(filePath);
    await writeFile(terminalFilePath, "{not-json", { mode: 0o600 });
    const store = createStore(filePath, { lockTimeoutMs: 100 });

    await store.initialize();
    store.recordFinalError(502, "primary@example.com", "oauth", {
      requestId: "post-recovery-error",
      errorType: "stream_error",
    });
    await store.flush();

    expect(store.getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { stream_error: 1 },
    });
    expect(store.getPersistenceStatus()).toMatchObject({
      terminalErrorsRevision: 1,
      terminalErrorsPending: 0,
      terminalErrorsLastError: null,
      terminalErrorsLastRecoveryAt: expect.any(Number),
    });
    expect(JSON.parse(await readFile(terminalFilePath, "utf8"))).toMatchObject({
      journal: { totalErrors: 1 },
    });
    expect((await stat(terminalFilePath)).mode & 0o777).toBe(0o600);
    const quarantined = (await readdir(dirname(filePath))).find((file) =>
      file.startsWith("proxy-terminal-errors.json.corrupt."),
    );
    expect(quarantined).toBeDefined();
    expect(await readFile(join(dirname(filePath), quarantined!), "utf8")).toBe(
      "{not-json",
    );
  });

  it("retains only the newest corrupt snapshots", async () => {
    const filePath = await tempStatsPath();
    let now = 1_000;
    const store = new ProxyUsageStatsStore({
      filePath,
      flushIntervalMs: 60_000,
      lockTimeoutMs: 100,
      now: () => now++,
    });

    for (let index = 0; index < 5; index += 1) {
      await writeFile(filePath, `{corrupt-${index}`, { mode: 0o600 });
      await store.initialize();
    }

    const quarantined = (await readdir(dirname(filePath))).filter((file) =>
      file.startsWith("proxy-usage-stats.json.corrupt."),
    );
    expect(quarantined).toHaveLength(3);
    const contents = await Promise.all(
      quarantined.map((file) =>
        readFile(join(dirname(filePath), file), "utf8"),
      ),
    );
    expect(contents.sort()).toEqual(
      ["{corrupt-2", "{corrupt-3", "{corrupt-4"].sort(),
    );
  });

  it("recovers an abandoned malformed lock after the stale threshold", async () => {
    const filePath = await tempStatsPath();
    const lockPath = `${filePath}.lock`;
    await writeFile(lockPath, "invalid-lock", { mode: 0o600 });
    const old = new Date(Date.now() - 60_000);
    await utimes(lockPath, old, old);

    const store = createStore(filePath, {
      staleLockMs: 10,
      lockTimeoutMs: 500,
    });
    await store.initialize();
    store.recordAttempt("primary@example.com", "oauth");
    await store.flush();

    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 0,
      lastError: null,
    });
  });

  it("recovers a stale lock whose PID has been reused", async () => {
    const filePath = await tempStatsPath();
    const lockPath = `${filePath}.lock`;
    await writeLockFile(lockPath, {
      token: "abandoned-owner",
      acquiredAt: Date.now() - 60_000,
    });
    const old = new Date(Date.now() - 60_000);
    await utimes(lockPath, old, old);

    const store = createStore(filePath, {
      staleLockMs: 10,
      lockTimeoutMs: 500,
    });
    await store.initialize();
    store.recordAttempt("primary@example.com", "oauth");
    await store.flush();

    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 0,
      lastError: null,
    });
  });

  it("retains deltas after lock contention and flushes them on retry", async () => {
    const filePath = await tempStatsPath();
    const lockPath = `${filePath}.lock`;
    await writeLockFile(lockPath);
    const store = createStore(filePath, { lockTimeoutMs: 50 });
    await store.initialize();
    store.recordAttempt("primary@example.com", "oauth");
    await store.flush();

    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 0,
      pendingMutations: 1,
    });
    expect(store.getPersistenceStatus().lastError).toContain(
      "Timed out acquiring proxy stats lock",
    );

    await rm(lockPath, { force: true });
    await store.flush();
    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 0,
      lastError: null,
    });
  });

  it("retries terminal metadata without duplicating persisted counters", async () => {
    const filePath = await tempStatsPath();
    const terminalFilePath = terminalErrorsPath(filePath);
    await writeLockFile(`${terminalFilePath}.lock`);
    const store = createStore(filePath, { lockTimeoutMs: 50 });
    await store.initialize();
    store.recordFinalError(502, "primary@example.com", "oauth", {
      requestId: "terminal-lock-contention",
      errorType: "stream_error",
    });

    await store.flush();

    expect(store.getStats()).toMatchObject({
      totalRequests: 1,
      totalErrors: 1,
    });
    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 0,
      terminalErrorsRevision: 0,
      terminalErrorsPending: 1,
    });
    expect(store.getPersistenceStatus().terminalErrorsLastError).toContain(
      "Timed out acquiring proxy stats lock",
    );

    await rm(`${terminalFilePath}.lock`, { force: true });
    await store.flush();

    const observer = createStore(filePath);
    await observer.initialize();
    expect(observer.getStats()).toMatchObject({
      totalRequests: 1,
      totalErrors: 1,
    });
    expect(observer.getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { stream_error: 1 },
    });
    expect(observer.getPersistenceStatus()).toMatchObject({
      revision: 1,
      terminalErrorsRevision: 1,
      terminalErrorsPending: 0,
      terminalErrorsLastError: null,
    });
  });

  it("does not persist terminal metadata ahead of failed counters", async () => {
    const filePath = await tempStatsPath();
    const lockPath = `${filePath}.lock`;
    const terminalFilePath = terminalErrorsPath(filePath);
    await writeLockFile(lockPath);
    const store = createStore(filePath, { lockTimeoutMs: 50 });
    await store.initialize();
    store.recordFinalError(502, "primary@example.com", "oauth", {
      requestId: "counter-lock-contention",
      errorType: "stream_error",
    });

    await store.flush();

    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 0,
      pendingMutations: 1,
      terminalErrorsRevision: 0,
      terminalErrorsPending: 1,
    });
    await expect(readFile(terminalFilePath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });

    await rm(lockPath, { force: true });
    await store.flush();

    const observer = createStore(filePath);
    await observer.initialize();
    expect(observer.getStats()).toMatchObject({
      totalRequests: 1,
      totalErrors: 1,
    });
    expect(observer.getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { stream_error: 1 },
    });
  });

  it("flushes matched terminal batches while new traffic remains pending", async () => {
    const filePath = await tempStatsPath();
    const lockPath = `${filePath}.lock`;
    await writeLockFile(lockPath);
    const store = createStore(filePath, { lockTimeoutMs: 500 });
    await store.initialize();
    store.recordFinalError(502, "primary@example.com", "oauth", {
      requestId: "first-batch",
      errorType: "stream_error",
    });

    const firstFlush = store.flush();
    await waitUntil(() => {
      const status = store.getPersistenceStatus();
      return (
        status.inFlightMutations === 1 && status.terminalErrorsInFlight === 1
      );
    });
    store.recordFinalError(502, "primary@example.com", "oauth", {
      requestId: "second-batch",
      errorType: "stream_error",
    });
    await rm(lockPath, { force: true });
    await firstFlush;

    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 1,
      terminalErrorsRevision: 1,
      terminalErrorsPending: 1,
    });
    const firstObserver = createStore(filePath);
    await firstObserver.initialize();
    expect(firstObserver.getStats().totalErrors).toBe(1);
    expect(firstObserver.getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      recent: [expect.objectContaining({ requestId: "first-batch" })],
    });

    await store.flush();
    const finalObserver = createStore(filePath);
    await finalObserver.initialize();
    expect(finalObserver.getStats().totalErrors).toBe(2);
    expect(finalObserver.getTerminalErrors()).toMatchObject({
      totalErrors: 2,
      recent: [
        expect.objectContaining({ requestId: "first-batch" }),
        expect.objectContaining({ requestId: "second-batch" }),
      ],
    });
  });

  it("does not double-count a failed flush during repeated reconciliation", async () => {
    const filePath = await tempStatsPath();
    const baseline = createStore(filePath);
    await baseline.initialize();
    baseline.recordAttempt("baseline@example.com", "oauth");
    await baseline.flush();

    const store = createStore(filePath, { lockTimeoutMs: 50 });
    await store.initialize();
    store.recordAttempt("pending@example.com", "oauth");
    const lockPath = `${filePath}.lock`;
    await writeLockFile(lockPath);
    await store.flush();

    await expect(store.reconcile()).resolves.toMatchObject({
      totalAttempts: 2,
    });
    await expect(store.reconcile()).resolves.toMatchObject({
      totalAttempts: 2,
    });
    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 1,
    });

    await rm(lockPath, { force: true });
    await store.flush();
    expect(store.getStats().totalAttempts).toBe(2);
  });

  it("waits for an in-flight flush before reporting durability", async () => {
    const filePath = await tempStatsPath();
    const lockPath = `${filePath}.lock`;
    await writeLockFile(lockPath);
    const store = createStore(filePath, { lockTimeoutMs: 500 });
    await store.initialize();
    store.recordAttempt("primary@example.com", "oauth");

    const backgroundFlush = store.flush();
    await waitUntil(() => store.getPersistenceStatus().inFlightMutations === 1);
    let joinedFlushCompleted = false;
    const joinedFlush = store.flush().then(() => {
      joinedFlushCompleted = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(joinedFlushCompleted).toBe(false);

    await rm(lockPath, { force: true });
    await Promise.all([backgroundFlush, joinedFlush]);
    expect(store.getPersistenceStatus()).toMatchObject({
      revision: 1,
      pendingMutations: 0,
      inFlightMutations: 0,
      unpersistedMutations: 0,
      lastError: null,
    });
  });

  it("keeps persistence disabled for isolated in-memory consumers", async () => {
    const store = new ProxyUsageStatsStore();
    store.recordAttempt("memory@example.com", "api_key");
    store.recordFinalError(500, "memory@example.com", "api_key");
    await store.flush();

    expect(store.getStats()).toMatchObject({
      totalAttempts: 1,
      totalRequests: 1,
      totalErrors: 1,
    });
    expect(store.getPersistenceStatus()).toMatchObject({
      enabled: false,
      filePath: null,
    });
  });
});
