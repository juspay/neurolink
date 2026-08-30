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
  trackProxyResponse,
} from "../src/lib/proxy/proxyActivity.js";
import { resolveProxyStatusAccountIdentity } from "../src/lib/proxy/codexAccountUsage.js";
import {
  flushRequestLogs,
  initRequestLogger,
} from "../src/lib/proxy/requestLogger.js";
import {
  getStats,
  getTerminalErrors,
  ProxyUsageStatsStore,
  resetUsageStatsForTests,
} from "../src/lib/proxy/usageStats.js";
import { handleCodexResponsesRequest } from "../src/lib/server/routes/codexProxyRoutes.js";
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
      (prefix !== "proxy-" || !candidate.startsWith("proxy-attempts-")),
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
    globalThis.fetch = isolatedFetch;
    await flushRequestLogs().catch(() => undefined);
    initRequestLogger(false);
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
      errorType: "all_accounts_failed",
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

    const response = await handleCodexResponsesRequest(
      requestContext("codex-stream-success"),
    );
    expect(getStats().totalRequests).toBe(0);
    expect(await response.text()).toContain("response.completed");
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
});
