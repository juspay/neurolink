import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeInstallFailure,
  getGlobalInstallArgs,
  resolveGlobalInstaller,
  validateInstalledVersion,
} from "../src/lib/proxy/globalInstaller.js";
import {
  beginProxyRequest,
  getProxyActivitySnapshot,
  isProxyActivityQuiet,
  resetProxyActivityForTests,
  trackProxyResponse,
} from "../src/lib/proxy/proxyActivity.js";
import { createClaudeToOpenAIStreamTransform } from "../src/lib/proxy/openaiFormat.js";
import { startUpdaterWorkerSupervisor } from "../src/lib/proxy/updaterSupervisor.js";
import { waitForProxyUpdateWindow } from "../src/lib/proxy/updateCoordinator.js";
import {
  abandonPendingUpdate,
  clearUpdateDeferral,
  loadUpdateState,
  recordUpdateDeferred,
  recordUpdateFailure,
  recordUpdateInstalled,
  reconcileRunningUpdate,
} from "../src/lib/proxy/updateState.js";
import { markProxyReady } from "../src/lib/proxy/proxyHealth.js";
import { __testHooks } from "../src/lib/server/routes/claudeProxyRoutes.js";
import { createProxyStartApp } from "../src/cli/commands/proxy.js";
import {
  getStats,
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
  resetStats,
} from "../src/lib/proxy/usageStats.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetProxyActivityForTests();
  resetStats();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("proxy runtime activity", () => {
  it("never reports quiet while a request is active", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:00:00Z"));
    const finish = beginProxyRequest();

    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(isProxyActivityQuiet(getProxyActivitySnapshot(), 120_000)).toBe(
      false,
    );

    finish();
    expect(getProxyActivitySnapshot().activeRequests).toBe(0);
    expect(isProxyActivityQuiet(getProxyActivitySnapshot(), 120_000)).toBe(
      false,
    );
    vi.advanceTimersByTime(120_000);
    expect(isProxyActivityQuiet(getProxyActivitySnapshot(), 120_000)).toBe(
      true,
    );
  });

  it("holds activity until the response body has settled", async () => {
    const finish = beginProxyRequest();
    const response = trackProxyResponse(new Response("complete"), finish);

    expect(getProxyActivitySnapshot().activeRequests).toBe(1);
    await expect(response.text()).resolves.toBe("complete");
    expect(getProxyActivitySnapshot().activeRequests).toBe(0);
  });
});

describe("proxy runtime error finalization", () => {
  const createApp = async (
    getToolRegistry: () => unknown,
    updateControlToken?: string,
  ) =>
    createProxyStartApp({
      neurolink: { getToolRegistry } as never,
      modelRouter: undefined,
      strategy: "fill-first",
      passthrough: false,
      port: 55123,
      host: "127.0.0.1",
      proxyConfig: null,
      primaryAccountKey: undefined,
      accountAllowlist: undefined,
      updateControlToken,
    });

  it("records invalid JSON as one completed error", async () => {
    const { app } = await createApp(() => ({}));
    const response = await app.request("/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });

    expect(response.status).toBe(400);
    await response.text();
    expect(getStats()).toMatchObject({ totalRequests: 1, totalErrors: 1 });
    expect(getProxyActivitySnapshot().activeRequests).toBe(0);
  });

  it("records uncaught adapter failures and returns a generic 502", async () => {
    const { app } = await createApp(() => {
      throw new Error("adapter exploded at /private/internal/path");
    });
    const response = await app.request("/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        messages: [{ role: "user", content: "hello" }],
      }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      type: "error",
      error: { type: "api_error", message: "Proxy internal error" },
    });
    expect(getStats()).toMatchObject({ totalRequests: 1, totalErrors: 1 });
    expect(getProxyActivitySnapshot().activeRequests).toBe(0);
  });

  it("reports final account outcomes separately from failed attempts", async () => {
    const { app } = await createApp(() => ({}));
    recordAttempt("primary@example.com", "oauth");
    recordAttemptError("primary@example.com", "oauth", 429, "transient");
    recordAttempt("fallback@example.com", "oauth");
    recordFinalSuccess("fallback@example.com", "oauth");
    recordAttempt("primary@example.com", "oauth");
    recordFinalError(502, "primary@example.com", "oauth");

    const response = await app.request("/status");
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.stats).toMatchObject({
      totalAttempts: 3,
      totalAttemptErrors: 1,
      totalRequests: 2,
      totalSuccess: 1,
      totalErrors: 1,
      totalRateLimits: 1,
      totalTransientRateLimits: 1,
      totalQuotaRateLimits: 0,
    });
    expect(body.stats.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "primary@example.com",
          attempts: 2,
          requests: 1,
          success: 0,
          errors: 1,
          attemptErrors: 1,
          rateLimits: 1,
          transientRateLimits: 1,
          quotaRateLimits: 0,
        }),
        expect.objectContaining({
          label: "fallback@example.com",
          attempts: 1,
          requests: 1,
          success: 1,
          errors: 0,
          attemptErrors: 0,
        }),
      ]),
    );
  });

  it("omits raw updater failure diagnostics from the status endpoint", async () => {
    const root = await mkdtemp(join(tmpdir(), "neurolink-status-home-"));
    tempDirs.push(root);
    const stateDir = join(root, ".neurolink");
    const statePath = join(stateDir, "update-state.json");
    await mkdir(stateDir, { recursive: true });
    recordUpdateFailure(
      "9.88.9",
      "install",
      "registry failed at /private/internal/path",
      statePath,
    );
    vi.stubEnv("HOME", root);

    const { app } = await createApp(() => ({}));
    const response = await app.request("/status");
    const body = await response.json();

    expect(body.autoUpdate.lastFailure).toEqual({
      at: expect.any(String),
      version: "9.88.9",
      stage: "install",
    });
    expect(JSON.stringify(body.autoUpdate)).not.toContain("/private/internal");
  });

  it("drains and resumes inference routes through authenticated control", async () => {
    const { app, readiness } = await createApp(() => ({}), "test-token");
    markProxyReady(readiness);

    const unauthorized = await app.request("/internal/update-control", {
      method: "POST",
      body: JSON.stringify({ action: "drain" }),
    });
    expect(unauthorized.status).toBe(404);

    const drain = await app.request("/internal/update-control", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-update-token": "test-token",
      },
      body: JSON.stringify({ action: "drain" }),
    });
    expect(await drain.json()).toMatchObject({
      draining: true,
      acceptingConnections: false,
    });
    await expect((await app.request("/health")).json()).resolves.toMatchObject({
      status: "ok",
      ready: true,
      acceptingConnections: false,
      drainingForUpdate: true,
    });

    const rejected = await app.request("/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(rejected.status).toBe(503);
    expect(rejected.headers.get("retry-after")).toBe("2");
    expect(getProxyActivitySnapshot().activeRequests).toBe(0);
    await rejected.text();

    const resume = await app.request("/internal/update-control", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-update-token": "test-token",
      },
      body: JSON.stringify({ action: "resume" }),
    });
    expect(await resume.json()).toMatchObject({
      draining: false,
      acceptingConnections: true,
    });
  });
});

describe("proxy updater safe-window coordination", () => {
  it("uses an already quiet window without draining", async () => {
    const setDraining = vi.fn(async () => true);
    const result = await waitForProxyUpdateWindow({
      quietThresholdMs: 100,
      quietWaitMs: 1_000,
      drainWaitMs: 1_000,
      pollIntervalMs: 10,
      getActivity: async () => ({ activeRequests: 0, lastActivityAt: null }),
      setDraining,
      isStopping: () => false,
      isParentAlive: () => true,
    });

    expect(result).toEqual({ ready: true, draining: false });
    expect(setDraining).not.toHaveBeenCalled();
  });

  it("drains sustained traffic and waits for active requests to settle", async () => {
    let now = 0;
    let draining = false;
    let drainPolls = 0;
    const result = await waitForProxyUpdateWindow({
      quietThresholdMs: 100,
      quietWaitMs: 20,
      drainWaitMs: 100,
      pollIntervalMs: 10,
      getActivity: async () => ({
        activeRequests: draining && drainPolls++ > 0 ? 0 : 2,
        lastActivityAt: new Date(now).toISOString(),
      }),
      setDraining: async (value) => {
        draining = value;
        return true;
      },
      isStopping: () => false,
      isParentAlive: () => true,
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    expect(result).toEqual({ ready: true, draining: true });
    expect(draining).toBe(true);
  });

  it("bounds a drain when an active stream never settles", async () => {
    let now = 0;
    const phases: string[] = [];
    const result = await waitForProxyUpdateWindow({
      quietThresholdMs: 100,
      quietWaitMs: 10,
      drainWaitMs: 20,
      pollIntervalMs: 10,
      getActivity: async () => ({ activeRequests: 1, lastActivityAt: null }),
      setDraining: async () => true,
      isStopping: () => false,
      isParentAlive: () => true,
      onPhase: (phase) => phases.push(phase),
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    expect(result).toEqual({
      ready: false,
      draining: true,
      reason: "drain_timeout",
    });
    expect(phases).toContain("drain_timeout");
  });

  it("pessimistically requests resume when drain acknowledgement is lost", async () => {
    let now = 0;
    const result = await waitForProxyUpdateWindow({
      quietThresholdMs: 100,
      quietWaitMs: 10,
      drainWaitMs: 20,
      pollIntervalMs: 10,
      getActivity: async () => ({ activeRequests: 1, lastActivityAt: null }),
      setDraining: async () => false,
      isStopping: () => false,
      isParentAlive: () => true,
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    expect(result).toEqual({
      ready: false,
      draining: true,
      reason: "drain_failed",
    });
  });
});

describe("global installer resolution", () => {
  it("rejects pnpm without a global bin and selects npm owning the running install", async () => {
    const root = await mkdtemp(join(tmpdir(), "neurolink-installer-"));
    tempDirs.push(root);
    const npmPrefix = join(root, "npm-prefix");
    const npmRoot = join(npmPrefix, "lib", "node_modules");
    await mkdir(npmRoot, { recursive: true });
    await mkdir(join(npmPrefix, "bin"), { recursive: true });
    const pnpmRoot = join(root, "pnpm-root");
    await mkdir(pnpmRoot, { recursive: true });

    const fakeExec = vi.fn((bin: string, args: string[]) => {
      const key = `${bin} ${args.join(" ")}`;
      const outputs: Record<string, string> = {
        "which pnpm": "/fake/pnpm",
        "which npm": "/fake/npm",
        "/fake/pnpm --version": "10.0.0",
        "/fake/pnpm root -g": pnpmRoot,
        "/fake/pnpm bin -g": "",
        "/fake/npm --version": "11.0.0",
        "/fake/npm root -g": npmRoot,
        "/fake/npm prefix -g": npmPrefix,
      };
      if (!(key in outputs)) {
        throw new Error(`unavailable: ${key}`);
      }
      return outputs[key];
    });

    const result = resolveGlobalInstaller({
      entryScript: join(npmRoot, "@juspay", "neurolink", "dist", "cli.js"),
      env: {},
      homeDir: root,
      execFileSync: fakeExec as never,
    });

    expect(result.installer).toMatchObject({
      kind: "npm",
      bin: "/fake/npm",
      installable: true,
      matchesCurrentInstall: true,
    });
    expect(
      result.tried.find((candidate) => candidate.bin === "/fake/pnpm"),
    ).toMatchObject({ installable: false });
    expect(getGlobalInstallArgs("npm", "@juspay/neurolink@9.87.3")).toEqual([
      "install",
      "--global",
      "--no-audit",
      "--no-fund",
      "@juspay/neurolink@9.87.3",
    ]);

    const unrelated = resolveGlobalInstaller({
      entryScript: join(root, "another-install", "dist", "cli.js"),
      env: {},
      homeDir: root,
      execFileSync: fakeExec as never,
    });
    expect(unrelated.installer).toBeUndefined();
    expect(unrelated.tried.some((candidate) => candidate.installable)).toBe(
      true,
    );
  });

  it("includes stdout and stderr in install failures", () => {
    const error = Object.assign(new Error("command failed"), {
      stdout: "ERR_PNPM_NO_GLOBAL_BIN_DIR",
      stderr: "secondary detail",
    });
    expect(describeInstallFailure(error)).toContain(
      "stdout: ERR_PNPM_NO_GLOBAL_BIN_DIR",
    );
    expect(describeInstallFailure(error)).toContain("stderr: secondary detail");
  });

  it("retries transient post-install trampoline failures", async () => {
    const execFileSync = vi
      .fn()
      .mockImplementationOnce(() => {
        throw Object.assign(new Error("probe timed out"), {
          stderr: "cold start exceeded timeout",
        });
      })
      .mockReturnValue("9.88.9\n");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      validateInstalledVersion({
        binPath: "/fake/neurolink-proxy",
        expectedVersion: "9.88.9",
        maxAttempts: 5,
        delayMs: 10,
        execFileSync: execFileSync as never,
        sleep,
      }),
    ).resolves.toEqual({ version: "9.88.9", attempts: 2 });
    expect(execFileSync).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("reports a persistent installed-version mismatch after bounded retries", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await validateInstalledVersion({
      binPath: "/fake/neurolink-proxy",
      expectedVersion: "9.88.9",
      maxAttempts: 3,
      delayMs: 10,
      execFileSync: vi.fn().mockReturnValue("9.88.0\n") as never,
      sleep,
    });

    expect(result).toEqual({
      version: "9.88.0",
      attempts: 3,
      failure: "resolved to v9.88.0; expected v9.88.9",
    });
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("rejects relative executable paths without invoking them", async () => {
    const execFileSync = vi.fn();

    await expect(
      validateInstalledVersion({
        binPath: "neurolink-proxy",
        expectedVersion: "9.88.9",
        execFileSync: execFileSync as never,
      }),
    ).resolves.toEqual({
      attempts: 0,
      failure: "binPath must be absolute: neurolink-proxy",
    });
    expect(execFileSync).not.toHaveBeenCalled();
  });
});

describe("updater worker recovery", () => {
  it("replaces a dead worker and publishes the new pid", async () => {
    vi.useFakeTimers();
    const running = new Set<number>();
    const spawned = [101, 202];
    const onPidChange = vi.fn();
    const stopWorker = vi.fn((pid: number) => running.delete(pid));
    const supervisor = startUpdaterWorkerSupervisor({
      spawnWorker: () => {
        const pid = spawned.shift();
        if (pid !== undefined) {
          running.add(pid);
        }
        return pid;
      },
      isProcessRunning: (pid) => running.has(pid),
      stopWorker,
      onPidChange,
      intervalMs: 30_000,
    });

    expect(supervisor.currentPid()).toBe(101);
    running.delete(101);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(supervisor.currentPid()).toBe(202);
    expect(onPidChange).toHaveBeenNthCalledWith(1, 101);
    expect(onPidChange).toHaveBeenNthCalledWith(2, 202);
    supervisor.stop();
    expect(stopWorker).toHaveBeenCalledWith(202);
    expect(onPidChange).toHaveBeenLastCalledWith(undefined);
    expect(supervisor.currentPid()).toBeUndefined();
  });

  it("contains worker spawn exceptions and retries on the next interval", async () => {
    vi.useFakeTimers();
    const log = vi.fn();
    const spawnWorker = vi
      .fn<() => number>()
      .mockImplementationOnce(() => {
        throw new Error("spawn unavailable");
      })
      .mockReturnValue(303);
    const supervisor = startUpdaterWorkerSupervisor({
      spawnWorker,
      isProcessRunning: (pid) => pid === 303,
      stopWorker: vi.fn(),
      log,
      intervalMs: 30_000,
    });

    expect(supervisor.currentPid()).toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      "[proxy] updater worker spawn failed: spawn unavailable",
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(supervisor.currentPid()).toBe(303);
    supervisor.stop();
  });

  it("persists pending installs and reconciles them after restart", async () => {
    const root = await mkdtemp(join(tmpdir(), "neurolink-update-state-"));
    tempDirs.push(root);
    const statePath = join(root, "update-state.json");

    recordUpdateInstalled("9.88.9", statePath);
    recordUpdateFailure(
      "9.88.9",
      "validation",
      "temporary probe failure",
      statePath,
    );
    expect(loadUpdateState(statePath)).toMatchObject({
      pendingRestartVersion: "9.88.9",
      lastFailure: { stage: "validation" },
    });

    expect(reconcileRunningUpdate("9.88.9", statePath)).toBe(true);
    expect(loadUpdateState(statePath)).toMatchObject({
      pendingRestartVersion: null,
      lastUpdateVersion: "9.88.9",
      lastFailure: null,
    });
  });

  it("persists and clears actionable update deferral state", async () => {
    const root = await mkdtemp(join(tmpdir(), "neurolink-update-state-"));
    tempDirs.push(root);
    const statePath = join(root, "update-state.json");

    recordUpdateDeferred("9.93.1", "draining", 3, statePath);
    const first = loadUpdateState(statePath)?.deferredUpdate;
    expect(first).toMatchObject({
      version: "9.93.1",
      reason: "draining",
      activeRequests: 3,
    });

    recordUpdateDeferred("9.93.1", "drain_timeout", 1, statePath);
    expect(loadUpdateState(statePath)?.deferredUpdate).toMatchObject({
      since: first?.since,
      reason: "drain_timeout",
      activeRequests: 1,
    });
    expect(clearUpdateDeferral("9.93.1", statePath)).toBe(true);
    expect(loadUpdateState(statePath)?.deferredUpdate).toBeNull();
  });

  it("abandons invalid pending installs without dropping failure details", async () => {
    const root = await mkdtemp(join(tmpdir(), "neurolink-update-state-"));
    tempDirs.push(root);
    const statePath = join(root, "update-state.json");

    recordUpdateInstalled("9.88.9", statePath);
    recordUpdateFailure("9.88.9", "validation", "wrong version", statePath);
    expect(abandonPendingUpdate("9.88.9", statePath)).toBe(true);
    expect(loadUpdateState(statePath)).toMatchObject({
      pendingRestartVersion: null,
      lastFailure: { stage: "validation", message: "wrong version" },
    });
    expect(reconcileRunningUpdate("9.88.9", statePath)).toBe(false);
  });

  it("discards malformed persisted updater failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "neurolink-update-state-"));
    tempDirs.push(root);
    const statePath = join(root, "update-state.json");
    await writeFile(
      statePath,
      JSON.stringify({
        lastCheckAt: new Date().toISOString(),
        suppressedVersions: {},
        lastFailure: { stage: "unknown" },
      }),
    );

    expect(loadUpdateState(statePath)?.lastFailure).toBeNull();
  });
});

describe("request and attempt accounting", () => {
  it("keeps recovered attempt failures out of final account errors", () => {
    recordAttempt("hello@neurolink.ink", "oauth");
    recordAttemptError("hello@neurolink.ink", "oauth", 429, "transient");
    recordAttempt("hello@neurolink.ink", "oauth");
    recordAttemptError("hello@neurolink.ink", "oauth", 429, "transient");
    recordAttempt("fallback@example.com", "oauth");
    recordFinalSuccess("fallback@example.com", "oauth");
    recordAttempt("hello@neurolink.ink", "oauth");
    recordFinalError(502, "hello@neurolink.ink", "oauth");

    expect(getStats()).toMatchObject({
      totalAttempts: 4,
      totalAttemptErrors: 2,
      totalRequests: 2,
      totalSuccess: 1,
      totalErrors: 1,
      totalRateLimits: 2,
      totalTransientRateLimits: 2,
      totalQuotaRateLimits: 0,
      accounts: {
        "hello@neurolink.ink": {
          attemptCount: 3,
          attemptErrorCount: 2,
          successCount: 0,
          errorCount: 1,
          rateLimitCount: 2,
          transientRateLimitCount: 2,
          quotaRateLimitCount: 0,
        },
        "fallback@example.com": {
          attemptCount: 1,
          attemptErrorCount: 0,
          successCount: 1,
          errorCount: 0,
        },
      },
    });
  });
});

describe("fallback transport handling", () => {
  it("retries a fallback fetch failure before succeeding", async () => {
    vi.useFakeTimers();
    const stream = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new TypeError("fetch failed"), {
          cause: { code: "UND_ERR_CONNECT_TIMEOUT" },
        }),
      )
      .mockResolvedValueOnce({
        stream: (async function* () {
          yield { content: "fallback response" };
        })(),
        toolCalls: [],
        finishReason: "end_turn",
        model: "fallback-model",
        usage: { input: 1, output: 2, total: 3 },
      });
    const promise = __testHooks.executeClaudeFallbackWithRetry({
      ctx: { neurolink: { stream } } as never,
      body: {
        model: "claude-sonnet-5",
        messages: [],
        stream: false,
      },
      requestStartTime: Date.now(),
      logProxyBody: vi.fn(),
      logFinalRequest: vi.fn(),
      options: {} as never,
      providerLabel: "auto-provider",
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toMatchObject({
      type: "message",
      model: "fallback-model",
    });
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it("preserves fallback exhaustion in the terminal structured error", () => {
    const buildLoggedClaudeError = vi.fn(
      (status: number, message: string, errorType?: string) => ({
        status,
        message,
        errorType,
      }),
    );
    const result = __testHooks.buildClaudeAnthropicFailureResponse({
      requestStartTime: Date.now(),
      authFailureMessage: null,
      authCooldownMessage: null,
      invalidRequestFailure: null,
      sawNetworkError: true,
      sawTransientFailure: false,
      sawRateLimit: false,
      lastError: new Error("Anthropic connect timeout"),
      fallbackFailureMessage: "[openai/gpt] fetch failed",
      orderedAccounts: [],
      buildLoggedClaudeError,
      logProxyBody: vi.fn(),
      logFinalRequest: vi.fn(),
    });

    expect(result).toMatchObject({
      status: 502,
      errorType: "fallback_exhausted",
    });
    expect(result.message).toContain(
      "Fallback also failed: [openai/gpt] fetch failed",
    );
  });

  it("times out and retries a fallback stream that never yields", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn().mockResolvedValue(undefined);
    const abortSignals: AbortSignal[] = [];
    const stream = vi.fn().mockImplementation((options) => {
      abortSignals.push(options.abortSignal);
      return Promise.resolve({
        stream: {
          [Symbol.asyncIterator]: () => ({
            next: () => new Promise(() => undefined),
            return: cancel,
          }),
        },
        toolCalls: [],
        model: "fallback-model",
      });
    });
    const promise = __testHooks.executeClaudeFallbackWithRetry({
      ctx: { neurolink: { stream } } as never,
      body: {
        model: "claude-sonnet-5",
        messages: [],
        stream: false,
      },
      requestStartTime: Date.now(),
      logProxyBody: vi.fn(),
      logFinalRequest: vi.fn(),
      options: {} as never,
      providerLabel: "auto-provider",
    });
    const rejection = expect(promise).rejects.toThrow(
      "Fallback auto-provider stream timed out",
    );

    await vi.runAllTimersAsync();
    await rejection;
    expect(stream).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(abortSignals).toHaveLength(2);
    expect(abortSignals.every((signal) => signal.aborted)).toBe(true);
  });
});

describe("Anthropic to OpenAI stream bridge", () => {
  const transform = async (
    input: string,
    onError = vi.fn(),
  ): Promise<{ output: string; onError: ReturnType<typeof vi.fn> }> => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(input));
        controller.close();
      },
    });
    const output = await new Response(
      source.pipeThrough(
        createClaudeToOpenAIStreamTransform("claude-sonnet-5", { onError }),
      ),
    ).text();
    return { output, onError };
  };

  it("propagates Anthropic SSE errors instead of emitting success", async () => {
    const message = "Upstream stream interrupted: terminated";
    const result = await transform(
      `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message } })}\n\n`,
    );

    expect(result.onError).toHaveBeenCalledWith(message);
    expect(result.output).toContain('"type":"server_error"');
    expect(result.output).toContain(message);
    expect(result.output).not.toContain("[DONE]");
  });

  it("treats a close without message_stop as an interruption", async () => {
    const result = await transform(
      `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: {} })}\n\n`,
    );

    expect(result.onError).toHaveBeenCalledWith(
      "Anthropic stream ended before message_stop",
    );
    expect(result.output).toContain('"type":"server_error"');
    expect(result.output).not.toContain("[DONE]");
  });

  it("ignores frames received after a terminal Anthropic error", async () => {
    const result = await transform(
      [
        `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: {} })}\n\n`,
        `event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "text" } })}\n\n`,
        `event: error\ndata: ${JSON.stringify({ type: "error", error: { message: "stream failed" } })}\n\n`,
        `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "late output" } })}\n\n`,
        `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
      ].join(""),
    );

    expect(result.onError).toHaveBeenCalledTimes(1);
    expect(result.output).toContain('"type":"server_error"');
    expect(result.output).not.toContain("late output");
    expect(result.output).not.toContain("[DONE]");
  });
});
