/**
 * Determinism exception (Rule 15): exact Codex stream terminal outcomes,
 * provider-qualified persistence, synthetic 429s, and transport failures
 * cannot be induced reliably or safely through a live provider call. Vitest
 * setup redirects HOME to a temporary directory and blocks provider/local
 * proxy network access before this module imports any proxy code.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleList } from "../src/cli/commands/auth.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import { AIProviderName } from "../src/lib/constants/enums.js";
import {
  clearAccountCooldown,
  loadAccountCooldowns,
} from "../src/lib/proxy/accountCooldown.js";
import {
  resetProxyActivityForTests,
  observeProxyFinalLog,
  takeProxyResponseObservers,
  trackProxyResponse,
} from "../src/lib/proxy/proxyActivity.js";
import { resolveProxyStatusAccountIdentity } from "../src/lib/proxy/codexAccountUsage.js";
import {
  flushRequestLogs,
  initRequestLogger,
  logRequest,
} from "../src/lib/proxy/requestLogger.js";
import {
  getStats,
  getTerminalErrors,
  ProxyUsageStatsStore,
  resetUsageStatsForTests,
} from "../src/lib/proxy/usageStats.js";
import {
  handleCodexResponsesRequest,
  createCodexProxyRoutes,
} from "../src/lib/server/routes/codexProxyRoutes.js";
import {
  clearRuntimeContextWindows,
  clearRuntimeOutputCeilings,
  getRuntimeContextWindow,
  getRuntimeOutputCeiling,
} from "../src/lib/constants/contextWindows.js";
import type { AuthCommandArgs, ServerContext } from "../src/lib/types/index.js";
import { logger } from "../src/lib/utils/logger.js";

const isolatedFetch = globalThis.fetch;
const encoder = new TextEncoder();
let sequence = 0;
let logDir = "";
const savedAccountKeys = new Set<string>();
const proxyStateFile = join(
  process.env.HOME ?? "",
  ".neurolink",
  "proxy-state.json",
);

function nextAccount(): { key: string; label: string } {
  sequence += 1;
  const label = `codex-observability-${sequence}@example.test`;
  return { key: `codex:${label}`, label };
}

async function saveCodexAccount(): Promise<{ key: string; label: string }> {
  const account = nextAccount();
  savedAccountKeys.add(account.key);
  await tokenStore.saveTokens(account.key, {
    accessToken: `access-${sequence}`,
    refreshToken: `refresh-${sequence}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
    tokenType: "Bearer",
  });
  return account;
}

function requestContext(
  requestId: string,
  metadata: Record<string, unknown> = {},
): ServerContext {
  return {
    requestId,
    method: "POST",
    path: "/backend-api/codex/responses",
    headers: {},
    query: {},
    params: {},
    body: { model: "gpt-5-codex", input: "test", stream: true },
    metadata,
    responseHeaders: {},
    timestamp: Date.now(),
    neurolink: {},
    toolRegistry: {},
  } as ServerContext;
}

async function logEntries(prefix: string): Promise<Record<string, unknown>[]> {
  const files = await readdir(logDir);
  const file = files.find(
    (candidate) =>
      candidate.startsWith(prefix) &&
      candidate.endsWith(".jsonl") &&
      // Body-capture indexes also start with proxy-. They are evidence of an
      // upstream attempt, not a duplicate client-final request.
      (prefix !== "proxy-" ||
        /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/.test(candidate)),
  );
  if (!file) {
    return [];
  }
  return (await readFile(join(logDir, file), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function settleTerminalObservers(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await flushRequestLogs();
}

describe.sequential("Codex quota observability", () => {
  beforeEach(async () => {
    await resetUsageStatsForTests();
    resetProxyActivityForTests();
    logDir = await mkdtemp(join(tmpdir(), "neurolink-codex-observability-"));
    initRequestLogger(true, logDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    clearRuntimeContextWindows();
    clearRuntimeOutputCeilings();
    globalThis.fetch = isolatedFetch;
    await flushRequestLogs().catch(() => undefined);
    initRequestLogger(false);
    await rm(logDir, { recursive: true, force: true });
    await Promise.all(
      [...savedAccountKeys].map(async (key) => {
        await clearAccountCooldown(key).catch(() => undefined);
        await tokenStore.clearTokens(key).catch(() => undefined);
      }),
    );
    savedAccountKeys.clear();
    await rm(proxyStateFile, { force: true }).catch(() => undefined);
    await resetUsageStatsForTests();
    resetProxyActivityForTests();
  });

  it("keeps same-label Anthropic and Codex stats in separate provider keys", () => {
    const store = new ProxyUsageStatsStore();
    const label = "shared@example.test";

    store.recordAttempt(label, "oauth");
    store.recordAttempt(label, "codex-oauth");

    const stats = store.getStats();
    expect(Object.keys(stats.accounts).sort()).toEqual([
      "anthropic:shared@example.test",
      "codex:shared@example.test",
    ]);
    expect(store.getAccountStats(label)).toBeUndefined();
    expect(store.getAccountStats(label, "oauth")?.key).toBe(
      "anthropic:shared@example.test",
    );
    expect(store.getAccountStats(label, "codex-oauth")?.key).toBe(
      "codex:shared@example.test",
    );
  });

  it("reports every configured CLI provider namespace with an explicit refresh state", async () => {
    const providers = [
      ...new Set([
        ...Object.values(AIProviderName).filter(
          (provider) => provider !== AIProviderName.AUTO,
        ),
        "codex",
      ]),
    ];
    const accounts = await Promise.all(
      providers.map(async (provider) => {
        sequence += 1;
        const label = `generic-provider-${sequence}@example.test`;
        const key = `${provider}:${label}`;
        savedAccountKeys.add(key);
        await tokenStore.saveTokens(key, {
          accessToken: `access-${sequence}`,
          refreshToken: `refresh-${sequence}`,
          expiresAt: Date.now() + 60 * 60 * 1000,
          // API-key accounts prove that recognized provider namespaces also
          // render deterministically without making a provider network call.
          tokenType: "ApiKey",
        });
        return { key, provider };
      }),
    );

    const output: string[] = [];
    vi.spyOn(logger, "always").mockImplementation((...args) => {
      output.push(args.map(String).join(" "));
    });

    await handleList({ format: "json", refresh: true } as AuthCommandArgs);

    const rendered = output.find((entry) => entry.includes('"accounts"'));
    expect(rendered).toBeDefined();
    const result = JSON.parse(rendered ?? "{}") as {
      refresh: {
        accounts: Record<
          string,
          { provider: string; status: string; error?: string }
        >;
      };
      accounts: Array<{
        key: string;
        refresh: { provider: string; status: string; error?: string } | null;
      }>;
    };

    for (const { key, provider } of accounts) {
      expect(result.refresh.accounts[key]).toEqual({
        provider,
        status: "not_supported",
      });
      expect(
        result.accounts.find((account) => account.key === key)?.refresh,
      ).toEqual(result.refresh.accounts[key]);
    }
  });

  it("honors an empty proxy result for a proxy-capable provider without direct fallback", async () => {
    sequence += 1;
    const label = `proxy-authoritative-${sequence}@example.test`;
    const key = `anthropic:${label}`;
    savedAccountKeys.add(key);
    await tokenStore.saveTokens(key, {
      accessToken: `access-${sequence}`,
      refreshToken: `refresh-${sequence}`,
      expiresAt: Date.now() + 60 * 60 * 1000,
      tokenType: "Bearer",
    });
    await mkdir(join(process.env.HOME ?? "", ".neurolink"), {
      recursive: true,
    });
    await writeFile(
      proxyStateFile,
      JSON.stringify({ pid: process.pid, host: "127.0.0.1", port: 43123 }),
    );

    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      requestedUrls.push(url);
      if (url !== "http://127.0.0.1:43123/limits") {
        throw new Error(`unexpected direct provider request: ${url}`);
      }
      return new Response(
        JSON.stringify({ fetchedAt: Date.now(), snapshot: false, results: [] }),
      );
    }) as typeof globalThis.fetch;

    const output: string[] = [];
    vi.spyOn(logger, "always").mockImplementation((...args) => {
      output.push(args.map(String).join(" "));
    });
    await handleList({ format: "json", refresh: true } as AuthCommandArgs);

    const rendered = output.find((entry) => entry.includes('"accounts"'));
    const result = JSON.parse(rendered ?? "{}") as {
      refresh: {
        via: string;
        accounts: Record<string, { provider: string; status: string }>;
      };
    };
    expect(requestedUrls).toEqual(["http://127.0.0.1:43123/limits"]);
    expect(result.refresh.via).toBe("proxy");
    expect(result.refresh.accounts[key]).toEqual({
      provider: "anthropic",
      status: "not_supported",
    });
  });

  it("normalizes persisted Anthropic status keys before inventory lookups", () => {
    expect(
      resolveProxyStatusAccountIdentity(
        "shared@example.test",
        "oauth",
        "Anthropic:Shared@Example.Test",
      ),
    ).toEqual({
      provider: "anthropic",
      key: "anthropic:shared@example.test",
    });
  });

  it("does not misclassify adapter cleanup after a completed stream as cancellation", async () => {
    const completed: string[] = [];
    const closedSource = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode("done"));
        queueMicrotask(() => controller.close());
      },
    });
    const completedResponse = trackProxyResponse(
      new Response(closedSource),
      () => undefined,
      { onTerminal: ({ outcome }) => completed.push(outcome) },
    );
    const completedReader = completedResponse.body?.getReader();
    expect(completedReader).toBeDefined();
    await completedReader?.read();
    await completedReader?.cancel();
    expect(completed).toEqual(["completed"]);

    const cancelled: string[] = [];
    const openSource = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("open"));
      },
    });
    const cancelledResponse = trackProxyResponse(
      new Response(openSource),
      () => undefined,
      { onTerminal: ({ outcome }) => cancelled.push(outcome) },
    );
    const cancelledReader = cancelledResponse.body?.getReader();
    expect(cancelledReader).toBeDefined();
    await cancelledReader?.read();
    await cancelledReader?.cancel();
    expect(cancelled).toEqual(["client_cancelled"]);
  });

  it("records a Codex transport failure against its account with provider identity", async () => {
    const account = await saveCodexAccount();
    globalThis.fetch = (async () => {
      throw Object.assign(new Error("socket reset"), { code: "ECONNRESET" });
    }) as typeof globalThis.fetch;

    const response = await handleCodexResponsesRequest(
      requestContext("codex-network-error"),
    );
    expect(response.status).toBe(502);
    await settleTerminalObservers();

    const stats = getStats();
    const accountStats = stats.accounts[account.key];
    expect(accountStats).toMatchObject({
      key: account.key,
      attemptCount: 1,
      attemptErrorCount: 1,
      errorCount: 1,
    });
    expect(getTerminalErrors().recent.at(-1)).toMatchObject({
      accountKey: account.key,
      // Not the `all_accounts_failed` default: a transport failure overwrites
      // lastFailure with the specific cause and its code.
      errorType: "network_error",
      errorCode: "ECONNRESET",
    });

    const attempts = await logEntries("proxy-attempts-");
    expect(attempts).toContainEqual(
      expect.objectContaining({
        requestId: "codex-network-error",
        accountKey: account.key,
        provider: "openai",
        responseStatus: 502,
        errorType: "network_error",
        errorCode: "ECONNRESET",
        transportScope: "connection_transport",
      }),
    );
    const final = await logEntries("proxy-");
    expect(final).toContainEqual(
      expect.objectContaining({
        requestId: "codex-network-error",
        accountKey: account.key,
        provider: "openai",
        responseStatus: 502,
      }),
    );
  });

  it("records a 429 as a quota cooldown rather than an anonymous final failure", async () => {
    const account = await saveCodexAccount();
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "limit" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "x-codex-ratelimit": JSON.stringify({
            primary: { used_percent: 100, resets_in_seconds: 600 },
          }),
        },
      })) as typeof globalThis.fetch;

    const response = await handleCodexResponsesRequest(
      requestContext("codex-rate-limit"),
    );
    expect(response.status).toBe(429);
    await settleTerminalObservers();

    const cooldown = (await loadAccountCooldowns())[account.key];
    expect(cooldown?.reason).toBe("session");
    expect(cooldown?.coolingUntil).toBeGreaterThan(Date.now());
    expect(getStats().accounts[account.key]).toMatchObject({
      attemptCount: 1,
      attemptErrorCount: 1,
      rateLimitCount: 1,
      quotaRateLimitCount: 1,
      transientRateLimitCount: 0,
    });
    const attempts = await logEntries("proxy-attempts-");
    expect(attempts).toContainEqual(
      expect.objectContaining({
        requestId: "codex-rate-limit",
        accountKey: account.key,
        provider: "openai",
        responseStatus: 429,
        errorType: "rate_limit_error",
        rateLimitKind: "quota",
        cooldownReason: "session",
      }),
    );
  });

  it("delays a direct Codex final result until the stream completes and retains usage", async () => {
    const account = await saveCodexAccount();
    const sse = [
      "event: response.completed",
      `data: ${JSON.stringify({
        type: "response.completed",
        response: {
          usage: {
            input_tokens: 13,
            output_tokens: 5,
            input_tokens_details: { cached_tokens: 3, cache_write_tokens: 2 },
          },
        },
      })}`,
      "",
      "",
    ].join("\n");
    globalThis.fetch = (async () =>
      new Response(sse, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      })) as typeof globalThis.fetch;

    const ctx = requestContext("codex-stream-success");
    const response = await handleCodexResponsesRequest(ctx);
    expect(getStats().totalRequests).toBe(0);
    const observers = takeProxyResponseObservers(ctx.metadata);
    expect(observers).toHaveLength(1);
    const trackedResponse = trackProxyResponse(response, () => undefined, {
      onTerminal: (details) => {
        for (const observer of observers) {
          observer.onTerminal?.(details);
        }
      },
    });
    expect(await trackedResponse.text()).toContain("response.completed");
    await settleTerminalObservers();

    expect(getStats().accounts[account.key]).toMatchObject({
      attemptCount: 1,
      successCount: 1,
      errorCount: 0,
    });
    const final = await logEntries("proxy-");
    expect(final).toContainEqual(
      expect.objectContaining({
        requestId: "codex-stream-success",
        accountKey: account.key,
        provider: "openai",
        responseStatus: 200,
        terminalOutcome: "completed",
        inputTokens: 13,
        outputTokens: 5,
        cacheReadTokens: 3,
        cacheCreationTokens: 2,
      }),
    );
  });

  it("retains a fallback attempt without emitting a second final Codex result", async () => {
    const account = await saveCodexAccount();
    globalThis.fetch = (async () =>
      new Response("event: response.completed\\ndata: {}\\n\\n", {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      })) as typeof globalThis.fetch;

    const response = await handleCodexResponsesRequest(
      requestContext("codex-fallback-child", {
        "neurolink.codexFallback": true,
      }),
    );
    await response.text();
    await settleTerminalObservers();

    expect(getStats().accounts[account.key]).toMatchObject({
      attemptCount: 1,
      successCount: 0,
      errorCount: 0,
    });
    expect(getStats().totalRequests).toBe(0);
    expect(await logEntries("proxy-")).toEqual([]);
    expect(await logEntries("proxy-attempts-")).toContainEqual(
      expect.objectContaining({
        requestId: "codex-fallback-child",
        accountKey: account.key,
        provider: "openai",
        responseStatus: 200,
      }),
    );
  });
  it("rejects an over-budget native Codex context before any upstream dispatch", async () => {
    await saveCodexAccount();
    vi.stubEnv(
      "NEUROLINK_PROXY_CONTEXT_POLICY",
      JSON.stringify({ maxInputTokens: 20 }),
    );
    const upstream = vi.fn(async () => new Response("unexpected"));
    globalThis.fetch = upstream;
    const ctx = requestContext("native-context-denial");
    ctx.body = {
      model: "gpt-native-context-fixture",
      input: "long context ".repeat(100),
    };
    const response = await handleCodexResponsesRequest(ctx);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "proxy_input_budget_exceeded", retryable: false },
    });
    expect(upstream).not.toHaveBeenCalled();
    await settleTerminalObservers();
    expect(await logEntries("proxy-")).toContainEqual(
      expect.objectContaining({
        requestId: ctx.requestId,
        contextPreflight: expect.objectContaining({
          tokenCountSource: "estimated",
          historyModified: false,
        }),
        errorCode: "proxy_input_budget_exceeded",
      }),
    );
  });

  it("registers only validated limits from relayed successful Codex model discovery", async () => {
    await saveCodexAccount();
    const payload = JSON.stringify({
      models: [
        {
          slug: "gpt-native-context-fixture",
          context_window: 100,
          max_output_tokens: 32,
        },
        { slug: "bad-fixture", context_window: -1, max_output_tokens: "100" },
      ],
    });
    globalThis.fetch = vi.fn(
      async () =>
        new Response(payload, {
          headers: { "content-type": "application/json" },
        }),
    );
    const handler = createCodexProxyRoutes().routes.find(
      (route) => route.method === "GET",
    )!.handler;
    const ctx = {
      ...requestContext("discovery-context"),
      method: "GET",
      path: "/backend-api/codex/models",
      query: { client_version: "fixture" },
    };
    const result = await handler(ctx);
    expect(result).toBeInstanceOf(Response);
    expect(await (result as Response).text()).toBe(payload);
    expect(getRuntimeContextWindow("codex", "gpt-native-context-fixture")).toBe(
      100,
    );
    expect(getRuntimeOutputCeiling("codex", "gpt-native-context-fixture")).toBe(
      32,
    );
    expect(getRuntimeContextWindow("codex", "bad-fixture")).toBeUndefined();
    expect(getRuntimeOutputCeiling("codex", "bad-fixture")).toBeUndefined();
    const upstream = vi.fn(async () => new Response("unexpected"));
    globalThis.fetch = upstream;
    const request = requestContext("discovered-limit-denial");
    request.body = {
      model: "gpt-native-context-fixture",
      input: "x".repeat(600),
    };
    const denied = await handleCodexResponsesRequest(request);
    expect(denied.status).toBe(400);
    expect(await denied.json()).toMatchObject({
      error: { code: "proxy_context_window_exceeded" },
    });
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([32768, 65536, 65537])(
    "keeps native Codex requests usable after discovery with output ceiling %i",
    async (output) => {
      await saveCodexAccount();
      const model = "gpt-discovery-ceiling-fixture";
      globalThis.fetch = vi.fn(async () =>
        Response.json({
          models: [
            { slug: model, context_window: 65536, max_output_tokens: output },
          ],
        }),
      );
      const discovery = createCodexProxyRoutes().routes.find(
        (route) => route.method === "GET",
      )!.handler;
      const result = await discovery({
        ...requestContext("ceiling-discovery"),
        method: "GET",
        path: "/backend-api/codex/models",
        query: { client_version: "fixture" },
      });
      expect((result as Response).status).toBe(200);
      const upstream = vi.fn(
        async () =>
          new Response(
            'event: response.completed\ndata: {"type":"response.completed","response":{"status":"completed"}}\n\n',
            { headers: { "content-type": "text/event-stream" } },
          ),
      );
      globalThis.fetch = upstream;
      const ctx = requestContext("ceiling-native-request");
      ctx.body = { model, input: "hello", stream: true };
      const response = await handleCodexResponsesRequest(ctx);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("response.completed");
      expect(upstream).toHaveBeenCalledTimes(1);
      expect(getRuntimeContextWindow("codex", model)).toBe(65536);
      expect(getRuntimeOutputCeiling("codex", model)).toBe(
        output < 65536 ? output : undefined,
      );
      await settleTerminalObservers();
    },
  );

  it.each([65536, undefined, 32768])(
    "refreshes a stale Codex ceiling after context changes to 65536 with output %s",
    async (output) => {
      await saveCodexAccount();
      const model = "gpt-rediscovery-ceiling-fixture";
      const discovery = createCodexProxyRoutes().routes.find(
        (route) => route.method === "GET",
      )!.handler;
      for (const limits of [
        { context_window: 131072, max_output_tokens: 65536 },
        { context_window: 65536, max_output_tokens: output },
      ]) {
        globalThis.fetch = vi.fn(async () =>
          Response.json({ models: [{ slug: model, ...limits }] }),
        );
        const result = await discovery({
          ...requestContext("ceiling-rediscovery"),
          method: "GET",
          path: "/backend-api/codex/models",
          query: { client_version: "fixture" },
        });
        expect((result as Response).status).toBe(200);
      }
      const upstream = vi.fn(
        async () =>
          new Response(
            'event: response.completed\ndata: {"type":"response.completed","response":{"status":"completed"}}\n\n',
            { headers: { "content-type": "text/event-stream" } },
          ),
      );
      globalThis.fetch = upstream;
      const ctx = requestContext("ceiling-rediscovery-request");
      ctx.body = { model, input: "hello", stream: true };
      const response = await handleCodexResponsesRequest(ctx);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("response.completed");
      expect(upstream).toHaveBeenCalledTimes(1);
      expect(getRuntimeContextWindow("codex", model)).toBe(65536);
      expect(getRuntimeOutputCeiling("codex", model)).toBe(
        output === 32768 ? output : undefined,
      );
      await settleTerminalObservers();
    },
  );

  it("denies a native Codex budget before dispatch without rotating accounts", async () => {
    await saveCodexAccount();
    await saveCodexAccount();
    vi.stubEnv(
      "NEUROLINK_PROXY_TOKEN_BUDGET",
      JSON.stringify({ accountWindowTokens: 10 }),
    );
    const upstream = vi.fn(async () => new Response("unexpected"));
    globalThis.fetch = upstream;
    const response = await handleCodexResponsesRequest(
      requestContext("native-budget-denial"),
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      error: { code: "PROXY_TOKEN_BUDGET_EXCEEDED", retryable: false },
    });
    expect(upstream).not.toHaveBeenCalled();
    expect(getStats().totalAttempts).toBe(0);
  });

  it("settles native Codex reservations from input plus output without adding reasoning twice", async () => {
    await saveCodexAccount();
    vi.stubEnv(
      "NEUROLINK_PROXY_CONTEXT_POLICY",
      JSON.stringify({ outputReserveTokens: 100 }),
    );
    vi.stubEnv(
      "NEUROLINK_PROXY_TOKEN_BUDGET",
      JSON.stringify({
        accountWindowTokens: 10000,
        sessionWindowTokens: 10000,
        maxInFlightTokens: 5000,
      }),
    );
    const payload =
      "event: response.completed\ndata: " +
      JSON.stringify({
        type: "response.completed",
        response: {
          usage: {
            input_tokens: 13,
            output_tokens: 5,
            output_tokens_details: { reasoning_tokens: 4 },
          },
        },
      }) +
      "\n\n";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(payload, {
          headers: { "content-type": "text/event-stream" },
        }),
    );
    const ctx = requestContext("native-budget-settlement");
    ctx.headers["session_id"] = "native-budget-session-fixture";
    const response = await handleCodexResponsesRequest(ctx);
    const observers = takeProxyResponseObservers(ctx.metadata);
    const tracked = trackProxyResponse(response, () => undefined, {
      onTerminal: async (details) => {
        await Promise.all(
          observers.map((observer) => observer.onTerminal?.(details)),
        );
      },
    });
    await tracked.text();
    await settleTerminalObservers();
    expect(await logEntries("proxy-")).toContainEqual(
      expect.objectContaining({
        requestId: ctx.requestId,
        inputTokens: 13,
        outputTokens: 5,
        reasoningTokens: 4,
        tokenBudget: expect.objectContaining({
          settlement: "provider_reported",
          accountChargedTokens: 18,
          sessionChargedTokens: 18,
          accountInFlightTokens: 0,
        }),
      }),
    );
  });
  it("retains a reservation estimate when Codex reports only one token side", async () => {
    await saveCodexAccount();
    vi.stubEnv(
      "NEUROLINK_PROXY_CONTEXT_POLICY",
      JSON.stringify({ outputReserveTokens: 100 }),
    );
    vi.stubEnv(
      "NEUROLINK_PROXY_TOKEN_BUDGET",
      JSON.stringify({ accountWindowTokens: 10000 }),
    );
    const payload =
      "event: response.completed\ndata: " +
      JSON.stringify({
        type: "response.completed",
        response: { usage: { input_tokens: 13 } },
      }) +
      "\n\n";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(payload, {
          headers: { "content-type": "text/event-stream" },
        }),
    );
    const ctx = requestContext("partial-usage-budget");
    const response = await handleCodexResponsesRequest(ctx);
    const observers = takeProxyResponseObservers(ctx.metadata);
    const tracked = trackProxyResponse(response, () => undefined, {
      onTerminal: async (details) => {
        await Promise.all(
          observers.map((observer) => observer.onTerminal?.(details)),
        );
      },
    });
    await tracked.text();
    await settleTerminalObservers();
    const final = (await logEntries("proxy-")).find(
      (entry) => entry.requestId === ctx.requestId,
    );
    expect(final).toMatchObject({
      inputTokens: 13,
      tokenBudget: {
        settlement: "estimate_retained",
        accountInFlightTokens: 0,
      },
    });
    expect(final).not.toHaveProperty("outputTokens");
  });

  it("does not let a late Codex completion overwrite an existing client cancellation", async () => {
    const account = await saveCodexAccount();
    let release: () => void = () => undefined;
    let entered: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const upstreamEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const payload =
      "event: response.completed\ndata: " +
      JSON.stringify({
        type: "response.completed",
        response: { usage: { input_tokens: 13, output_tokens: 5 } },
      }) +
      "\n\n";
    globalThis.fetch = vi.fn(async () => {
      entered();
      await gate;
      return new Response(payload, {
        headers: { "content-type": "text/event-stream" },
      });
    });
    const controller = new AbortController();
    const ctx = {
      ...requestContext("cancelled-before-codex-headers"),
      abortSignal: controller.signal,
    };
    const stop = observeProxyFinalLog(ctx.requestId, () => undefined);
    try {
      const pending = handleCodexResponsesRequest(ctx);
      await upstreamEntered;
      controller.abort(
        new DOMException("Fixture client disconnect", "AbortError"),
      );
      await logRequest({
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
        method: "POST",
        path: ctx.path,
        model: "gpt-5-codex",
        stream: true,
        toolCount: 0,
        account: account.label,
        accountType: "codex-oauth",
        responseStatus: 499,
        responseTimeMs: 5,
        terminalOutcome: "client_cancelled",
        errorType: "client_cancelled",
      });
      release();
      const response = await pending;
      const observers = takeProxyResponseObservers(ctx.metadata);
      const tracked = trackProxyResponse(response, () => undefined, {
        onTerminal: async (details) => {
          await Promise.all(
            observers.map((observer) => observer.onTerminal?.(details)),
          );
        },
      });
      await tracked.text();
      await settleTerminalObservers();
      const finals = (await logEntries("proxy-")).filter(
        (entry) => entry.requestId === ctx.requestId,
      );
      expect(finals).toHaveLength(1);
      expect(finals[0].responseStatus).toBe(499);
      expect(getStats().totalSuccess).toBe(0);
      expect(getStats().accounts[account.key].successCount).toBe(0);
    } finally {
      release();
      stop();
    }
  });
});
