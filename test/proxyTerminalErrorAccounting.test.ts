import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleTranslatedJsonRequest,
  handleTranslatedStreamRequest,
} from "../src/lib/proxy/proxyTranslationEngine.js";
import {
  flushRequestLogs,
  initRequestLogger,
} from "../src/lib/proxy/requestLogger.js";
import { createClaudeProxyRoutes } from "../src/lib/server/routes/claudeProxyRoutes.js";
import {
  getStats,
  getTerminalErrors,
  resetUsageStatsForTests,
} from "../src/lib/proxy/usageStats.js";
import type {
  ParsedClaudeRequest,
  ServerContext,
} from "../src/lib/types/index.js";

const tempDirs: string[] = [];

const parsedRequest = {
  prompt: "hello",
  systemPrompt: "",
  conversationMessages: [],
  tools: {},
  images: [],
  stopSequences: [],
} as unknown as ParsedClaudeRequest;

function createContext(
  requestId: string,
  stream: () => Promise<unknown>,
): ServerContext {
  return {
    requestId,
    method: "POST",
    path: "/v1/messages",
    headers: {},
    query: {},
    params: {},
    timestamp: Date.now(),
    metadata: {},
    neurolink: { stream: vi.fn(stream) },
    toolRegistry: {},
  } as unknown as ServerContext;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for translated stream settlement");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function startRequestLogCapture(): Promise<string> {
  const logDir = await mkdtemp(join(tmpdir(), "neurolink-terminal-logs-"));
  tempDirs.push(logDir);
  initRequestLogger(true, logDir);
  return logDir;
}

async function readRequestRecords(
  logDir: string,
): Promise<Array<Record<string, unknown>>> {
  await flushRequestLogs();
  const requestLog = (await readdir(logDir)).find((file) =>
    /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/.test(file),
  );
  if (!requestLog) {
    return [];
  }
  return (await readFile(join(logDir, requestLog), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await flushRequestLogs().catch(() => {
    // The test assertion should remain the primary failure.
  });
  initRequestLogger(false);
  await resetUsageStatsForTests();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("translated terminal accounting", () => {
  it("attributes pre-routing validation failures to the proxy", async () => {
    const logDir = await startRequestLogCapture();
    const ctx = createContext(
      "proxy-validation-error",
      async () => undefined,
    ) as ServerContext & { body: Record<string, unknown> };
    ctx.body = { model: "claude-test" };
    const messagesRoute = createClaudeProxyRoutes().routes.find(
      (route) => route.method === "POST" && route.path === "/v1/messages",
    );
    if (!messagesRoute) {
      throw new Error("messages route not found");
    }

    await expect(messagesRoute.handler(ctx)).resolves.toMatchObject({
      type: "error",
    });

    expect(getStats().accounts["proxy/internal"]).toMatchObject({
      label: "proxy/internal",
      type: "internal",
      errorCount: 1,
    });
    expect(getTerminalErrors().recent).toContainEqual(
      expect.objectContaining({
        requestId: "proxy-validation-error",
        account: "proxy/internal",
        accountType: "internal",
        errorType: "invalid_request_error",
      }),
    );
    expect(await readRequestRecords(logDir)).toContainEqual(
      expect.objectContaining({
        requestId: "proxy-validation-error",
        account: "proxy/internal",
        accountType: "internal",
        responseStatus: 400,
      }),
    );
  });

  it("records an upstream interruption after output as one terminal error", async () => {
    const logDir = await startRequestLogCapture();
    const ctx = createContext("translated-stream-error", async () => ({
      stream: (async function* () {
        yield { text: "partial output" };
        throw new Error("upstream socket reset");
      })(),
      toolCalls: [],
      usage: { inputTokens: 4, outputTokens: 2 },
      model: "translated-model",
    }));

    const response = await handleTranslatedStreamRequest({
      ctx,
      format: "claude",
      requestModel: "claude-test",
      parsed: parsedRequest,
      attempts: [
        { label: "translated-account", provider: "openai", model: "test" },
      ],
      requestStartTime: Date.now(),
    });
    const body = await response.text();

    expect(body).toContain("partial output");
    expect(body).toContain("Upstream stream interrupted");
    expect(getStats()).toMatchObject({
      totalAttempts: 1,
      totalAttemptErrors: 1,
      totalRequests: 1,
      totalSuccess: 0,
      totalErrors: 1,
    });
    expect(getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { stream_error: 1 },
      recent: [
        expect.objectContaining({
          requestId: "translated-stream-error",
          status: 502,
          errorType: "stream_error",
          terminalOutcome: "stream_error",
        }),
      ],
    });
    expect(await readRequestRecords(logDir)).toContainEqual(
      expect.objectContaining({
        requestId: "translated-stream-error",
        responseStatus: 502,
        errorType: "stream_error",
      }),
    );
  });

  it("records empty translated output as a failed attempt and request", async () => {
    const logDir = await startRequestLogCapture();
    const ctx = createContext("translated-empty-output", async () => ({
      stream: (async function* () {
        yield* [];
      })(),
      toolCalls: [],
      usage: {},
      model: "translated-model",
    }));

    await expect(
      handleTranslatedJsonRequest({
        ctx,
        format: "claude",
        requestModel: "claude-test",
        parsed: parsedRequest,
        attempts: [
          {
            label: "translated-account",
            provider: "openai",
            model: "test",
          },
        ],
        requestStartTime: Date.now(),
      }),
    ).rejects.toThrow("returned no content or tool calls");

    expect(getStats()).toMatchObject({
      totalAttempts: 1,
      totalAttemptErrors: 1,
      totalRequests: 1,
      totalSuccess: 0,
      totalErrors: 1,
    });
    expect(getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { upstream_error: 1 },
      recent: [
        expect.objectContaining({
          requestId: "translated-empty-output",
          status: 500,
          errorType: "generation_error",
        }),
      ],
    });
    expect(await readRequestRecords(logDir)).toContainEqual(
      expect.objectContaining({
        requestId: "translated-empty-output",
        responseStatus: 500,
        errorType: "generation_error",
      }),
    );
  });

  it("does not finalize translated exhaustion twice at the Claude route", async () => {
    const logDir = await startRequestLogCapture();
    const ctx = createContext("translated-route-exhaustion", async () => ({
      stream: (async function* () {
        yield* [];
      })(),
      toolCalls: [],
      usage: {},
      model: "translated-model",
    })) as ServerContext & { body: Record<string, unknown> };
    ctx.body = {
      model: "claude-routed-model",
      messages: [{ role: "user", content: "hello" }],
    };
    const modelRouter = {
      resolve: () => ({ provider: "openai", model: "translated-model" }),
      getFallbackChain: () => [],
      // Auto-fallback became opt-in in "fix(proxy): bound account admission and
      // fallback routing" (33bdd141). This test is about the SECOND attempt not
      // finalizing the terminal error a second time, so it has to opt in — a
      // router without this reports one attempt and never reaches the path
      // under test. Default-off behaviour is pinned by the test below.
      isAutoFallbackEnabled: () => true,
    };
    const messagesRoute = createClaudeProxyRoutes(
      modelRouter as never,
    ).routes.find(
      (route) => route.method === "POST" && route.path === "/v1/messages",
    );
    if (!messagesRoute) {
      throw new Error("messages route not found");
    }

    await expect(messagesRoute.handler(ctx)).resolves.toMatchObject({
      type: "error",
    });

    // Two attempts, but the terminal error is finalized once.
    expect(getStats()).toMatchObject({
      totalAttempts: 2,
      totalAttemptErrors: 2,
      totalRequests: 1,
      totalErrors: 1,
    });
    expect(getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      recent: [expect.objectContaining({ status: 502 })],
    });
    const records = (await readRequestRecords(logDir)).filter(
      (record) => record.requestId === "translated-route-exhaustion",
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      responseStatus: 502,
      errorType: "generation_error",
    });
  });

  it("makes no second attempt when auto-fallback is left disabled", async () => {
    // The default since 33bdd141: without an explicit opt-in, the translation
    // layer must not pick a fallback provider on its own. This is the behaviour
    // that silently changed the test above from passing to failing while the
    // file was orphaned, so it gets pinned rather than left implicit.
    await startRequestLogCapture();
    const ctx = createContext("translated-route-no-autofallback", async () => ({
      stream: (async function* () {
        yield* [];
      })(),
      toolCalls: [],
      usage: {},
      model: "translated-model",
    })) as ServerContext & { body: Record<string, unknown> };
    ctx.body = {
      model: "claude-routed-model",
      messages: [{ role: "user", content: "hello" }],
    };
    const modelRouter = {
      resolve: () => ({ provider: "openai", model: "translated-model" }),
      getFallbackChain: () => [],
      isAutoFallbackEnabled: () => false,
    };
    const messagesRoute = createClaudeProxyRoutes(
      modelRouter as never,
    ).routes.find(
      (route) => route.method === "POST" && route.path === "/v1/messages",
    );
    if (!messagesRoute) {
      throw new Error("messages route not found");
    }

    await expect(messagesRoute.handler(ctx)).resolves.toMatchObject({
      type: "error",
    });

    // One attempt, not two — and still exactly one finalized terminal error.
    expect(getStats()).toMatchObject({
      totalAttempts: 1,
      totalAttemptErrors: 1,
      totalRequests: 1,
      totalErrors: 1,
    });
  });

  it("records client cancellation once without marking the stream successful", async () => {
    const logDir = await startRequestLogCapture();
    let resolvePendingRead!: (value: IteratorResult<unknown>) => void;
    let markReadStarted!: () => void;
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = resolve;
    });
    const iterator: AsyncIterator<unknown> = {
      next: () => {
        markReadStarted();
        return new Promise((resolve) => {
          resolvePendingRead = resolve;
        });
      },
      return: async () => {
        resolvePendingRead({ done: true, value: undefined });
        return { done: true, value: undefined };
      },
    };
    const ctx = createContext("translated-client-cancel", async () => ({
      stream: { [Symbol.asyncIterator]: () => iterator },
      toolCalls: [],
      usage: {},
      model: "translated-model",
    }));

    const response = await handleTranslatedStreamRequest({
      ctx,
      format: "claude",
      requestModel: "claude-test",
      parsed: parsedRequest,
      attempts: [{ label: "translated-account" }],
      requestStartTime: Date.now(),
    });
    const reader = response.body!.getReader();
    await reader.read();
    await readStarted;
    await reader.cancel("client disconnected");
    await waitUntil(() => getStats().totalRequests === 1);

    expect(getStats()).toMatchObject({
      totalAttempts: 1,
      totalAttemptErrors: 0,
      totalRequests: 1,
      totalSuccess: 0,
      totalErrors: 1,
    });
    expect(getTerminalErrors()).toMatchObject({
      totalErrors: 1,
      counts: { client_cancelled: 1 },
      recent: [
        expect.objectContaining({
          requestId: "translated-client-cancel",
          status: 499,
          errorType: "client_cancelled",
          terminalOutcome: "client_cancelled",
        }),
      ],
    });
    expect(await readRequestRecords(logDir)).toContainEqual(
      expect.objectContaining({
        requestId: "translated-client-cancel",
        responseStatus: 499,
        errorType: "client_cancelled",
      }),
    );
  });
});
