import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeInstallFailure,
  getGlobalInstallArgs,
  resolveGlobalInstaller,
} from "../src/lib/proxy/globalInstaller.js";
import {
  beginProxyRequest,
  getProxyActivitySnapshot,
  isProxyActivityQuiet,
  resetProxyActivityForTests,
  trackProxyResponse,
} from "../src/lib/proxy/proxyActivity.js";
import { createClaudeToOpenAIStreamTransform } from "../src/lib/proxy/openaiFormat.js";
import { __testHooks } from "../src/lib/server/routes/claudeProxyRoutes.js";
import { createProxyStartApp } from "../src/cli/commands/proxy.js";
import { getStats, resetStats } from "../src/lib/proxy/usageStats.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
  const createApp = async (getToolRegistry: () => unknown) =>
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
