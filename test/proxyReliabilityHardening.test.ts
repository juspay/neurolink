import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenStore, tokenStore } from "../src/lib/auth/tokenStore.js";
import {
  anthropicAccountKeysEqual,
  createAccountAllowlist,
  ENV_ANTHROPIC_ACCOUNT_KEY,
  isAccountAllowed,
  LEGACY_ANTHROPIC_ACCOUNT_KEY,
  shouldLoadFallbackCredential,
} from "../src/lib/proxy/accountSelection.js";
import {
  clearAccountCooldown,
  initAccountCooldown,
  loadAccountCooldowns,
  saveAccountCooldown,
} from "../src/lib/proxy/accountCooldown.js";
import {
  flushAccountQuotaStateForTests,
  getUnifiedRateLimitStatus,
  initAccountQuota,
  loadAccountQuotas,
  parseQuotaHeaders,
  saveAccountQuota,
} from "../src/lib/proxy/accountQuota.js";
import {
  resolveProxyPaths,
  resolveProxyUsageStatsPath,
} from "../src/lib/proxy/proxyPaths.js";
import { createSSEInterceptor } from "../src/lib/proxy/sseInterceptor.js";
import {
  clearRefreshStateForTests,
  needsRefresh,
  refreshToken,
} from "../src/lib/proxy/tokenRefresh.js";
import {
  createStreamTerminalOutcomeTracker,
  mergeStreamTerminalOutcome,
  preflightAnthropicStream,
} from "../src/lib/proxy/streamOutcome.js";
import {
  getStats,
  recordAttempt,
  resetUsageStatsForTests,
} from "../src/lib/proxy/usageStats.js";
import { parseProxyConfigString } from "../src/lib/proxy/proxyConfig.js";
import {
  __testHooks,
  createClaudeProxyRoutes,
} from "../src/lib/server/routes/claudeProxyRoutes.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  clearRefreshStateForTests();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
  __testHooks.resetAllRuntimeState();
  await resetUsageStatsForTests();
});

describe("weekly-expiry quota routing", () => {
  const account = (label: string) => ({
    key: `anthropic:${label}`,
    label,
    token: "test-token",
    type: "oauth" as const,
  });
  const quota = (
    now: number,
    overrides: Partial<{
      sessionUsed: number;
      sessionStatus: string;
      sessionResetAt: number;
      weeklyUsed: number;
      weeklyStatus: string;
      weeklyResetAt: number;
    }>,
  ) => ({
    unifiedStatus: "allowed",
    sessionUsed: 0,
    sessionStatus: "allowed",
    sessionResetAt: Math.floor(now / 1000) + 5 * 60 * 60,
    weeklyUsed: 0,
    weeklyStatus: "allowed",
    weeklyResetAt: Math.floor(now / 1000) + 7 * 24 * 60 * 60,
    fallbackPercentage: 0.5,
    overageStatus: "allowed",
    lastUpdated: now,
    ...overrides,
  });
  const setQuota = (
    label: string,
    now: number,
    overrides: Parameters<typeof quota>[1],
  ): void => {
    __testHooks.setAccountRuntimeState(`anthropic:${label}`, {
      quota: quota(now, overrides),
    });
  };
  const order = (labels: string[], now: number): string[] =>
    __testHooks
      .orderAccountsByQuota(
        labels.map(account),
        now,
        "anthropic:hello@neurolink.ink",
        0.97,
        15 * 60 * 1000,
      )
      .map((item) => item.label);

  it("prioritizes the observed account whose weekly allowance expires first", () => {
    const now = Date.UTC(2026, 6, 17, 12, 52, 0);
    const nowSec = Math.floor(now / 1000);
    setQuota("hello@neurolink.ink", now, {
      sessionUsed: 0.11,
      sessionResetAt: nowSec + 98 * 60,
      weeklyUsed: 0.51,
      weeklyResetAt: nowSec + 52 * 60 * 60,
    });
    setQuota("sachiny09@gmail.com", now, {
      sessionUsed: 0.44,
      sessionResetAt: nowSec - 112 * 60,
      weeklyUsed: 0.44,
      weeklyResetAt: nowSec + 132 * 60 * 60,
    });
    setQuota("sachin.sharma@juspay.in", now, {
      sessionUsed: 0.97,
      sessionResetAt: nowSec - 172 * 60,
      weeklyUsed: 0.39,
      weeklyResetAt: nowSec + 12 * 60 * 60,
    });

    expect(
      order(
        [
          "hello@neurolink.ink",
          "sachiny09@gmail.com",
          "sachin.sharma@juspay.in",
        ],
        now,
      ),
    ).toEqual([
      "sachin.sharma@juspay.in",
      "hello@neurolink.ink",
      "sachiny09@gmail.com",
    ]);
  });

  it("temporarily demotes an urgent weekly account at the session soft limit", () => {
    const now = Date.UTC(2026, 6, 17, 12, 0, 0);
    const nowSec = Math.floor(now / 1000);
    setQuota("urgent@example.com", now, {
      sessionUsed: 0.98,
      sessionResetAt: nowSec + 30 * 60,
      weeklyUsed: 0.4,
      weeklyResetAt: nowSec + 12 * 60 * 60,
    });
    setQuota("later@example.com", now, {
      sessionUsed: 0.2,
      sessionResetAt: nowSec + 2 * 60 * 60,
      weeklyUsed: 0.2,
      weeklyResetAt: nowSec + 3 * 24 * 60 * 60,
    });

    expect(order(["urgent@example.com", "later@example.com"], now)).toEqual([
      "later@example.com",
      "urgent@example.com",
    ]);
    expect(
      order(["urgent@example.com", "later@example.com"], now + 31 * 60 * 1000),
    ).toEqual(["urgent@example.com", "later@example.com"]);
  });

  it("freshens an expired weekly window instead of routing on stale urgency", () => {
    const now = Date.UTC(2026, 6, 17, 12, 0, 0);
    const nowSec = Math.floor(now / 1000);
    setQuota("expired@example.com", now, {
      weeklyUsed: 0.99,
      weeklyStatus: "allowed",
      weeklyResetAt: nowSec - 60,
    });
    setQuota("active@example.com", now, {
      weeklyUsed: 0.2,
      weeklyResetAt: nowSec + 24 * 60 * 60,
    });

    expect(order(["expired@example.com", "active@example.com"], now)).toEqual([
      "active@example.com",
      "expired@example.com",
    ]);
  });

  it("applies a hot-cleared primary to the immediately following request", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-routing-reload-"));
    tempDirs.push(dir);
    initAccountCooldown(join(dir, "cooldowns.json"));
    initAccountQuota(join(dir, "quotas.json"));

    const accountKeys = [
      "anthropic:first@example.com",
      "anthropic:old@example.com",
    ];
    vi.spyOn(tokenStore, "pruneExpired").mockResolvedValue(undefined);
    vi.spyOn(tokenStore, "listByPrefix").mockResolvedValue(accountKeys);
    vi.spyOn(tokenStore, "isDisabled").mockResolvedValue(false);
    vi.spyOn(tokenStore, "loadTokens").mockImplementation(async (key) => ({
      accessToken: key.includes("old@example.com")
        ? "old-account-token"
        : "first-account-token",
      refreshToken: "test-refresh-token",
      expiresAt: Date.now() + 60 * 60 * 1000,
      tokenType: "Bearer",
    }));

    const attemptedTokens: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const headers = init?.headers as Record<string, string>;
      attemptedTokens.push(headers.authorization);
      return new Response(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-test",
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    let primaryAccountKey: string | undefined = "anthropic:old@example.com";
    let accountAllowlist = createAccountAllowlist(["old@example.com"]);
    let generation = 1;
    const routeGroup = createClaudeProxyRoutes(
      undefined,
      "",
      "fill-first",
      false,
      primaryAccountKey,
      {
        runtimeConfigProvider: () => ({
          generation,
          strategy: "fill-first",
          modelRouter: undefined,
          passthrough: false,
          primaryAccountKey,
          accountAllowlist,
          quotaRoutingEnabled: false,
          sessionSoftLimit: 0.97,
          sessionResetToleranceMs: 15 * 60 * 1000,
        }),
      },
    );
    const messagesRoute = routeGroup.routes.find(
      (route) => route.method === "POST" && route.path === "/v1/messages",
    );
    expect(messagesRoute).toBeDefined();

    const requestContext = (requestId: string) =>
      ({
        requestId,
        method: "POST",
        path: "/v1/messages",
        headers: {},
        query: {},
        params: {},
        body: {
          model: "claude-test",
          max_tokens: 16,
          messages: [{ role: "user", content: "hello" }],
        },
        neurolink: {},
        toolRegistry: {},
        timestamp: Date.now(),
        metadata: {},
      }) as never;

    await expect(
      messagesRoute!.handler(requestContext("configured-primary")),
    ).resolves.toMatchObject({ type: "message" });
    primaryAccountKey = undefined;
    accountAllowlist = undefined;
    generation += 1;
    await expect(
      messagesRoute!.handler(requestContext("cleared-primary")),
    ).resolves.toMatchObject({ type: "message" });

    expect(attemptedTokens).toEqual([
      "Bearer old-account-token",
      "Bearer first-account-token",
    ]);
  });
});

describe("OAuth request-shape preservation", () => {
  it("preserves the exact genuine Claude Code subagent system shape", () => {
    const agentCache = { type: "ephemeral" };
    const instructionsCache = { type: "ephemeral" };
    const request = {
      model: "claude-sonnet-5",
      system: [
        {
          type: "text",
          text: "x-anthropic-billing-header: cc_version=2.1.207.fa5; cc_entrypoint=cli; cc_is_subagent=true;",
        },
        {
          type: "text",
          text: "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
          cache_control: agentCache,
        },
        {
          type: "text",
          text: "Keep this canonical Claude Code instruction block in place.",
          cache_control: instructionsCache,
        },
      ],
      messages: [{ role: "user", content: "hello" }],
      metadata: {
        user_id: JSON.stringify({
          device_id: "a".repeat(64),
          account_uuid: "11111111-1111-4111-8111-111111111111",
          session_id: "22222222-2222-4222-8222-222222222222",
        }),
      },
    };

    const result = JSON.parse(
      __testHooks.polyfillOAuthBody(JSON.stringify(request), true).bodyStr,
    );

    expect(result).toEqual(request);
  });

  it("continues relocating billing-only custom-client instructions out of OAuth system", () => {
    const result = JSON.parse(
      __testHooks.polyfillOAuthBody(
        JSON.stringify({
          model: "claude-sonnet-5",
          system: [
            {
              type: "text",
              text: "x-anthropic-billing-header: cc_version=2.1.201; cc_entrypoint=cli; cch=random;",
            },
            {
              type: "text",
              text: "Custom application instructions",
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: "hello" }],
        }),
        true,
      ).bodyStr,
    );

    expect(result.system).toHaveLength(2);
    expect(result.system[0].text).toContain("x-anthropic-billing-header");
    expect(result.system[1].text).toContain("Claude Agent SDK");
    expect(result.messages[0].content[0]).toMatchObject({
      type: "text",
      text: "<system_instructions>\nCustom application instructions\n</system_instructions>",
      cache_control: { type: "ephemeral" },
    });
  });

  it("prepends synthesized billing before an existing Claude Code agent block", () => {
    const result = JSON.parse(
      __testHooks.polyfillOAuthBody(
        JSON.stringify({
          model: "claude-sonnet-5",
          system: [
            {
              type: "text",
              text: "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: "Canonical Claude Code instructions" },
          ],
          messages: [{ role: "user", content: "hello" }],
        }),
        true,
      ).bodyStr,
    );

    expect(result.system.map((block: { text: string }) => block.text)).toEqual([
      expect.stringContaining("x-anthropic-billing-header"),
      "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
      "Canonical Claude Code instructions",
    ]);
  });
});

describe("upstream attempt classification and retry amplification", () => {
  const fetchArgs = (
    logAttempt: ReturnType<typeof vi.fn>,
    logProxyBody: ReturnType<typeof vi.fn>,
  ) => ({
    url: "https://api.anthropic.com/v1/messages",
    headers: { "content-type": "application/json" },
    finalBodyStr: "{}",
    account: {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "test-token",
      type: "oauth" as const,
    },
    accountState: {
      consecutiveRefreshFailures: 0,
      permanentlyDisabled: false,
    },
    enabledAccounts: [],
    orderedAccounts: [],
    logAttempt,
    logProxyBody,
    fetchStartMs: Date.now(),
    attemptNumber: 1,
    currentLastError: undefined,
    currentSawRateLimit: false,
    currentSawNetworkError: false,
  });

  it("persists the low-level code for retryable fetch failures", async () => {
    const fetchError = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "EADDRNOTAVAIL" },
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(fetchError);
    const logAttempt = vi.fn();

    const result = await __testHooks.fetchAnthropicAccountResponse(
      fetchArgs(logAttempt, vi.fn()),
    );

    expect(result).toMatchObject({
      continueLoop: true,
      retrySameAccount: true,
      sawNetworkError: true,
    });
    expect(logAttempt).toHaveBeenCalledWith(
      502,
      "network_error",
      "fetch failed",
      {
        retryable: true,
        errorCode: "EADDRNOTAVAIL",
      },
    );
    expect(getStats()).toMatchObject({ totalAttemptErrors: 1 });
  });

  it("retries transient DNS lookup failures on the same account", async () => {
    const fetchError = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ENOTFOUND" },
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(fetchError);
    const logAttempt = vi.fn();

    const result = await __testHooks.fetchAnthropicAccountResponse(
      fetchArgs(logAttempt, vi.fn()),
    );

    expect(result).toMatchObject({
      continueLoop: true,
      retrySameAccount: true,
      sawNetworkError: true,
    });
    expect(logAttempt).toHaveBeenCalledWith(
      502,
      "network_error",
      "fetch failed",
      {
        retryable: true,
        errorCode: "ENOTFOUND",
      },
    );
  });

  it("logs non-retryable fetch failures before preserving terminal behavior", async () => {
    const fetchError = Object.assign(new TypeError("invalid URL"), {
      cause: { code: "ERR_INVALID_URL" },
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(fetchError);
    const logAttempt = vi.fn();

    await expect(
      __testHooks.fetchAnthropicAccountResponse(fetchArgs(logAttempt, vi.fn())),
    ).rejects.toBe(fetchError);
    expect(logAttempt).toHaveBeenCalledWith(
      502,
      "network_error",
      "invalid URL",
      {
        retryable: false,
        errorCode: "ERR_INVALID_URL",
      },
    );
    expect(getStats()).toMatchObject({ totalAttemptErrors: 1 });
  });

  it("returns a construction rejection once without counting it as a rate limit", async () => {
    const body = JSON.stringify({
      type: "error",
      error: { type: "rate_limit_error", message: "Error" },
    });
    const clientBody = JSON.stringify({
      type: "error",
      error: {
        type: "invalid_request_error",
        message:
          "Anthropic rejected the OAuth request shape. This is not an account rate limit.",
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(body, {
        status: 429,
        headers: {
          "content-type": "application/json",
          "x-should-retry": "true",
        },
      }),
    );
    const logAttempt = vi.fn();
    const logProxyBody = vi.fn();
    const logFinalRequest = vi.fn();
    const args = fetchArgs(logAttempt, logProxyBody);

    const result = await __testHooks.fetchAnthropicAccountResponse(args);

    expect(result).toMatchObject({
      continueLoop: false,
      sawRateLimit: false,
      terminalError: {
        status: 400,
        body: clientBody,
        errorType: "construction_rejection",
      },
    });
    expect(result.response).toBeUndefined();
    expect(logAttempt).toHaveBeenCalledTimes(1);
    expect(logAttempt).toHaveBeenCalledWith(
      429,
      "construction_rejection",
      body,
    );
    if (!result.terminalError) {
      throw new Error("expected a terminal construction rejection");
    }
    expect(
      __testHooks.finalizeAnthropicTerminalFetchError({
        terminalError: result.terminalError,
        account: args.account,
        requestStartTime: args.fetchStartMs,
        attemptNumber: args.attemptNumber,
        logProxyBody,
        logFinalRequest,
      }),
    ).toEqual(JSON.parse(clientBody));
    expect(logProxyBody).toHaveBeenCalledTimes(2);
    expect(logFinalRequest).toHaveBeenCalledTimes(1);
    expect(logFinalRequest).toHaveBeenCalledWith(
      400,
      "primary@example.com",
      "oauth",
      "construction_rejection",
      clientBody,
    );
    expect(getStats().totalRateLimits).toBe(0);
    expect(getStats()).toMatchObject({ totalRequests: 1, totalErrors: 1 });
    expect(getStats().accounts["primary@example.com"]).toMatchObject({
      errorCount: 1,
      rateLimitCount: 0,
    });
  });

  it("finalizes a construction rejection after OAuth refresh as one 400", async () => {
    const upstreamBody = JSON.stringify({
      type: "error",
      error: { type: "rate_limit_error", message: "Error" },
    });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "refreshed-access",
            refresh_token: "refreshed-refresh",
            expires_in: 3600,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(upstreamBody, {
          status: 429,
          headers: {
            "content-type": "application/json",
            "x-should-retry": "true",
          },
        }),
      );
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "expired-access",
      refreshToken: "valid-refresh",
      type: "oauth" as const,
    };
    const logAttempt = vi.fn();
    const logProxyBody = vi.fn();
    const logFinalRequest = vi.fn();
    const tracer = {
      logUpstreamResponseHeaders: vi.fn(),
      logUpstreamResponseBody: vi.fn(),
      setError: vi.fn(),
      end: vi.fn(),
    };
    const upstreamSpan = { end: vi.fn() };
    const allocateAttemptNumber = vi.fn().mockReturnValue(3);
    recordAttempt(account.label, account.type);

    const result = await __testHooks.handleAnthropicAuthRetry({
      ctx: {} as never,
      body: { model: "claude-sonnet-5", messages: [], stream: true },
      account,
      accountState: {
        consecutiveRefreshFailures: 0,
        permanentlyDisabled: false,
      },
      headers: { "content-type": "application/json" },
      buildUpstreamBody: () => ({ bodyStr: "{}" }),
      enabledAccounts: [account],
      orderedAccounts: [account],
      tracer: tracer as never,
      requestStartTime: Date.now(),
      allocateAttemptNumber,
      upstreamSpan: upstreamSpan as never,
      logAttempt,
      logProxyBody,
      logFinalRequest,
      lastError: undefined,
      authFailureMessage: null,
      sawRateLimit: false,
      sawTransientFailure: false,
      sawNetworkError: false,
    });

    expect(result).toMatchObject({
      continueLoop: false,
      sawRateLimit: false,
      response: {
        type: "error",
        error: {
          type: "invalid_request_error",
          message:
            "Anthropic rejected the OAuth request shape. This is not an account rate limit.",
        },
      },
    });
    expect(allocateAttemptNumber).toHaveBeenCalledOnce();
    expect(logAttempt).toHaveBeenCalledTimes(2);
    expect(logAttempt).toHaveBeenNthCalledWith(
      1,
      401,
      "authentication_error",
      "received 401 from Anthropic",
      { retryable: true },
    );
    expect(logAttempt).toHaveBeenNthCalledWith(
      2,
      429,
      "construction_rejection",
      upstreamBody,
      { attempt: 3, attemptDurationMs: expect.any(Number) },
    );
    expect(logFinalRequest).toHaveBeenCalledTimes(1);
    expect(logFinalRequest).toHaveBeenCalledWith(
      400,
      account.label,
      account.type,
      "construction_rejection",
      expect.stringContaining("not an account rate limit"),
    );
    expect(tracer.end).toHaveBeenCalledTimes(1);
    expect(upstreamSpan.end).toHaveBeenCalledTimes(1);
    expect(getStats().totalRateLimits).toBe(0);
    expect(getStats()).toMatchObject({
      totalAttempts: 2,
      totalAttemptErrors: 1,
      totalRequests: 1,
      totalErrors: 1,
    });
    expect(
      logProxyBody.mock.calls.map(([capture]) => ({
        phase: capture.phase,
        attempt: capture.attempt,
      })),
    ).toEqual(
      expect.arrayContaining([
        { phase: "upstream_request", attempt: 3 },
        { phase: "upstream_response", attempt: 3 },
        { phase: "client_response", attempt: 3 },
      ]),
    );
  });

  it("records duration for a successful non-stream OAuth retry", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "refreshed-access",
            refresh_token: "refreshed-refresh",
            expires_in: 3600,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "message",
            usage: { input_tokens: 7, output_tokens: 3 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "expired-access",
      refreshToken: "valid-refresh",
      type: "oauth" as const,
    };
    const logAttempt = vi.fn();
    const logFinalRequest = vi.fn();
    recordAttempt(account.label, account.type);

    const result = await __testHooks.handleAnthropicAuthRetry({
      ctx: {} as never,
      body: { model: "claude-sonnet-5", messages: [], stream: false },
      account,
      accountState: {
        consecutiveRefreshFailures: 0,
        permanentlyDisabled: false,
      },
      headers: { "content-type": "application/json" },
      buildUpstreamBody: () => ({ bodyStr: "{}" }),
      enabledAccounts: [account],
      orderedAccounts: [account],
      requestStartTime: Date.now(),
      allocateAttemptNumber: () => 3,
      logAttempt,
      logProxyBody: vi.fn(),
      logFinalRequest,
      lastError: undefined,
      authFailureMessage: null,
      sawRateLimit: false,
      sawTransientFailure: false,
      sawNetworkError: false,
    });

    expect(result).toMatchObject({
      continueLoop: false,
      response: { type: "message" },
    });
    expect(logAttempt).toHaveBeenNthCalledWith(2, 200, undefined, undefined, {
      attempt: 3,
      attemptDurationMs: expect.any(Number),
    });
    expect(logFinalRequest).toHaveBeenCalledWith(
      200,
      account.label,
      account.type,
    );
  });

  it("classifies terminal OAuth retry transport failures as non-retryable", async () => {
    const retryError = Object.assign(new TypeError("invalid URL"), {
      cause: { code: "ERR_INVALID_URL" },
    });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "refreshed-access",
            refresh_token: "refreshed-refresh",
            expires_in: 3600,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockRejectedValueOnce(retryError);
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "expired-access",
      refreshToken: "valid-refresh",
      type: "oauth" as const,
    };
    const logAttempt = vi.fn();

    const result = await __testHooks.handleAnthropicAuthRetry({
      ctx: {} as never,
      body: { model: "claude-sonnet-5", messages: [], stream: true },
      account,
      accountState: {
        consecutiveRefreshFailures: 0,
        permanentlyDisabled: false,
      },
      headers: { "content-type": "application/json" },
      buildUpstreamBody: () => ({ bodyStr: "{}" }),
      enabledAccounts: [account],
      orderedAccounts: [account],
      requestStartTime: Date.now(),
      allocateAttemptNumber: () => 2,
      logAttempt,
      logProxyBody: vi.fn(),
      logFinalRequest: vi.fn(),
      lastError: undefined,
      authFailureMessage: null,
      sawRateLimit: false,
      sawTransientFailure: false,
      sawNetworkError: false,
    });

    expect(result).toMatchObject({
      continueLoop: true,
      sawNetworkError: true,
      lastError: "network error on retry 1: invalid URL",
    });
    expect(logAttempt).toHaveBeenNthCalledWith(
      2,
      502,
      "network_error",
      "invalid URL",
      {
        retryable: false,
        errorCode: "ERR_INVALID_URL",
        attempt: 2,
        attemptDurationMs: expect.any(Number),
      },
    );
  });

  it("preflights immediate SSE rate limits after OAuth refresh before client commit", async () => {
    const streamError =
      'event: error\ndata: {"type":"error","error":{"type":"rate_limit_error","message":"rate limited after refresh"}}\n\n';
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "refreshed-access",
            refresh_token: "refreshed-refresh",
            expires_in: 3600,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(streamError, {
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            "retry-after": "1",
            "anthropic-ratelimit-unified-status": "allowed",
          },
        }),
      );
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "expired-access",
      refreshToken: "valid-refresh",
      type: "oauth" as const,
    };
    const logAttempt = vi.fn();
    recordAttempt(account.label, account.type);

    const result = await __testHooks.handleAnthropicAuthRetry({
      ctx: {} as never,
      body: { model: "claude-sonnet-5", messages: [], stream: true },
      account,
      accountState: {
        consecutiveRefreshFailures: 0,
        permanentlyDisabled: false,
      },
      headers: { "content-type": "application/json" },
      buildUpstreamBody: () => ({ bodyStr: "{}" }),
      enabledAccounts: [account],
      orderedAccounts: [account],
      requestStartTime: Date.now(),
      allocateAttemptNumber: () => 2,
      logAttempt,
      logProxyBody: vi.fn(),
      logFinalRequest: vi.fn(),
      lastError: undefined,
      authFailureMessage: null,
      sawRateLimit: false,
      sawTransientFailure: false,
      sawNetworkError: false,
    });

    expect(result).toMatchObject({
      continueLoop: true,
      sawRateLimit: true,
      sawTransientFailure: false,
      lastError: "rate limited after refresh",
    });
    expect(result.response).toBeUndefined();
    expect(logAttempt).toHaveBeenNthCalledWith(
      2,
      429,
      "rate_limit_error",
      "rate limited after refresh",
      expect.objectContaining({
        attempt: 2,
        retryable: true,
        rateLimitKind: "transient",
      }),
    );
    expect(getStats()).toMatchObject({
      totalAttempts: 2,
      totalAttemptErrors: 2,
      totalRateLimits: 1,
      totalRequests: 0,
    });
  });

  it("still counts and plans cooldown for a genuine transient 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "error",
          error: { type: "rate_limit_error", message: "Rate limited" },
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": "1",
            "anthropic-ratelimit-unified-status": "allowed",
            "anthropic-ratelimit-unified-5h-status": "allowed",
            "anthropic-ratelimit-unified-7d-status": "allowed",
          },
        },
      ),
    );

    const logAttempt = vi.fn();
    const result = await __testHooks.fetchAnthropicAccountResponse(
      fetchArgs(logAttempt, vi.fn()),
    );

    expect(result).toMatchObject({
      continueLoop: true,
      retrySameAccount: true,
      sawRateLimit: true,
      cooldownPlan: { reason: "transient", rotateImmediately: false },
    });
    expect(getStats()).toMatchObject({
      totalAttemptErrors: 1,
      totalRateLimits: 1,
      totalTransientRateLimits: 1,
      totalQuotaRateLimits: 0,
    });
    expect(logAttempt).toHaveBeenCalledWith(
      429,
      "rate_limit_error",
      expect.any(String),
      {
        retryable: true,
        rateLimitKind: "transient",
        cooldownReason: "transient",
      },
    );
  });

  it("shares two transient retries across an entire concurrent account window", () => {
    const now = 1_800_000_000_000;
    const coolingUntil = now + 60_000;
    const claims = Array.from({ length: 8 }, () =>
      __testHooks.claimTransientRateLimitRetry(
        "anthropic:primary@example.com",
        coolingUntil,
        now,
      ),
    );

    expect(claims).toEqual([
      1,
      2,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(
      __testHooks.claimTransientRateLimitRetry(
        "anthropic:primary@example.com",
        coolingUntil + 120_000,
        coolingUntil + 1,
      ),
    ).toBe(1);
  });

  it("paces a bounded queue through a short transient cooldown", () => {
    const now = 1_800_000_000_000;
    const coolingUntil = now + 60_000;
    const firstThree = Array.from({ length: 3 }, () =>
      __testHooks.claimTransientCooldownAdmission(
        "anthropic:primary@example.com",
        coolingUntil,
        now,
      ),
    );

    expect(firstThree).toEqual([60_000, 60_250, 60_500]);
    const remainingClaims = Array.from({ length: 59 }, () =>
      __testHooks.claimTransientCooldownAdmission(
        "anthropic:primary@example.com",
        coolingUntil,
        now,
      ),
    );
    expect(remainingClaims.at(-2)).toBe(75_000);
    expect(remainingClaims.at(-1)).toBeUndefined();
    expect(
      __testHooks.claimTransientCooldownAdmission(
        "anthropic:other@example.com",
        now + 120_000,
        now,
      ),
    ).toBeUndefined();
  });

  it("waits for transient recovery and spaces concurrent admissions", async () => {
    vi.useFakeTimers();
    const now = 1_800_000_000_000;
    vi.setSystemTime(now);
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "test-token",
      type: "oauth" as const,
    };
    __testHooks.setAccountRuntimeState(account.key, {
      coolingUntil: now + 60_000,
      coolingReason: "transient",
    });

    const firstAdmission = __testHooks.waitForTransientAccountAvailability([
      account,
    ]);
    const secondAdmission = __testHooks.waitForTransientAccountAvailability([
      account,
    ]);

    await vi.advanceTimersByTimeAsync(60_000);
    await expect(firstAdmission).resolves.toEqual([account]);
    await vi.advanceTimersByTimeAsync(250);
    await expect(secondAdmission).resolves.toEqual([account]);
  });

  it("never queues through a hard quota cooldown", async () => {
    const now = Date.now();
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "test-token",
      type: "oauth" as const,
    };
    __testHooks.setAccountRuntimeState(account.key, {
      coolingUntil: now + 5 * 60 * 60 * 1000,
      coolingReason: "five_hour",
    });

    await expect(
      __testHooks.waitForTransientAccountAvailability([account]),
    ).resolves.toEqual([]);
  });

  it("does not run provider fallback for a deterministic invalid request", () => {
    const loopState = {
      lastError: undefined,
      sawRateLimit: false,
      sawNetworkError: false,
      sawTransientFailure: false,
      invalidRequestFailure: null,
      authFailureMessage: null,
      authCooldownMessage: null,
      attemptNumber: 1,
    };

    expect(__testHooks.shouldAttemptClaudeFallback(loopState)).toBe(true);
    expect(
      __testHooks.shouldAttemptClaudeFallback({
        ...loopState,
        invalidRequestFailure: {
          status: 400,
          body: JSON.stringify({
            type: "error",
            error: {
              type: "invalid_request_error",
              message: "prompt is too long",
            },
          }),
          contentType: "application/json",
        },
      }),
    ).toBe(false);
  });
});

describe("authoritative unified rate-limit handling", () => {
  it("rotates immediately when unified is rejected but 5h and 7d are allowed", () => {
    const now = 1_800_000_000_000;
    const retryAfterMs = 12 * 60 * 60 * 1000;
    const headers = new Headers({
      "anthropic-ratelimit-unified-status": "rejected",
      "anthropic-ratelimit-unified-5h-status": "allowed",
      "anthropic-ratelimit-unified-5h-utilization": "0.42",
      "anthropic-ratelimit-unified-5h-reset": String(now / 1000 + 3600),
      "anthropic-ratelimit-unified-7d-status": "allowed",
      "anthropic-ratelimit-unified-7d-utilization": "0.63",
      "anthropic-ratelimit-unified-7d-reset": String(now / 1000 + 86400),
    });

    const quota = parseQuotaHeaders(headers);
    expect(quota?.unifiedStatus).toBe("rejected");
    expect(getUnifiedRateLimitStatus(headers)).toBe("rejected");
    expect(
      __testHooks.planCooldownFor429(
        quota,
        retryAfterMs,
        now,
        getUnifiedRateLimitStatus(headers),
      ),
    ).toEqual({
      reason: "unified",
      coolingUntil: now + retryAfterMs,
      rotateImmediately: true,
    });
  });

  it("does not classify a normal allowed response as unified exhaustion", () => {
    const headers = {
      "Anthropic-RateLimit-Unified-Status": " allowed ",
    };
    expect(getUnifiedRateLimitStatus(headers)).toBe("allowed");
  });
});

describe("cooldown persistence", () => {
  it("restores a cooldown after module state is reset and clears it conditionally", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-cooldown-"));
    tempDirs.push(dir);
    const file = join(dir, "account-cooldowns.json");
    const coolingUntil = Date.now() + 60_000;

    initAccountCooldown(file);
    initAccountQuota(join(dir, "account-quotas.json"));
    await saveAccountCooldown("anthropic:a", coolingUntil, "unified");

    initAccountCooldown(file);
    expect(await loadAccountCooldowns()).toMatchObject({
      "anthropic:a": { coolingUntil, reason: "unified" },
    });
    await __testHooks.seedRuntimeQuotasFromDisk([
      {
        key: "anthropic:a",
        label: "a",
        token: "test-token",
        type: "oauth",
      },
    ]);
    expect(__testHooks.getAccountRuntimeState("anthropic:a")).toMatchObject({
      coolingUntil,
      coolingReason: "unified",
    });

    await clearAccountCooldown("anthropic:a", coolingUntil + 1);
    expect(await loadAccountCooldowns()).toHaveProperty("anthropic:a");
    await clearAccountCooldown("anthropic:a", coolingUntil);
    expect(await loadAccountCooldowns()).not.toHaveProperty("anthropic:a");
  });

  it("preserves concurrent first writes while the persisted cache loads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-cooldown-race-"));
    tempDirs.push(dir);
    initAccountCooldown(join(dir, "account-cooldowns.json"));
    const now = Date.now();

    await Promise.all([
      saveAccountCooldown("anthropic:a", now + 60_000, "session"),
      saveAccountCooldown("anthropic:b", now + 120_000, "weekly"),
    ]);

    expect(await loadAccountCooldowns()).toMatchObject({
      "anthropic:a": { coolingUntil: now + 60_000 },
      "anthropic:b": { coolingUntil: now + 120_000 },
    });
  });

  it("serializes cooldown extensions and conditional clears on disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-cooldown-order-"));
    tempDirs.push(dir);
    const file = join(dir, "account-cooldowns.json");
    initAccountCooldown(file);
    const initialCoolingUntil = Date.now() + 60_000;
    const extendedCoolingUntil = initialCoolingUntil + 120_000;

    await saveAccountCooldown("anthropic:a", initialCoolingUntil, "session");
    await Promise.all([
      saveAccountCooldown("anthropic:a", extendedCoolingUntil, "weekly"),
      clearAccountCooldown("anthropic:a", initialCoolingUntil),
      saveAccountCooldown("anthropic:a", initialCoolingUntil + 30_000, "auth"),
    ]);

    const persisted = JSON.parse(await readFile(file, "utf8"));
    expect(persisted["anthropic:a"]).toMatchObject({
      coolingUntil: extendedCoolingUntil,
      reason: "weekly",
    });
  });

  it("preserves concurrent first quota updates while the cache loads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-quota-race-"));
    tempDirs.push(dir);
    initAccountQuota(join(dir, "account-quotas.json"));
    const quota = {
      sessionUsed: 0.1,
      sessionStatus: "allowed",
      sessionResetAt: 0,
      weeklyUsed: 0.2,
      weeklyStatus: "allowed",
      weeklyResetAt: 0,
      fallbackPercentage: 0,
      overageStatus: "unknown",
      lastUpdated: Date.now(),
    };

    await Promise.all([
      saveAccountQuota("anthropic:a", quota),
      saveAccountQuota("anthropic:b", { ...quota, sessionUsed: 0.3 }),
    ]);

    expect(await loadAccountQuotas()).toMatchObject({
      "anthropic:a": { sessionUsed: 0.1 },
      "anthropic:b": { sessionUsed: 0.3 },
    });
    await flushAccountQuotaStateForTests();
    const persisted = JSON.parse(
      await readFile(join(dir, "account-quotas.json"), "utf8"),
    );
    expect(persisted).toMatchObject({
      "anthropic:a": { sessionUsed: 0.1 },
      "anthropic:b": { sessionUsed: 0.3 },
    });
  });
});

describe("refresh failure classification", () => {
  it("uses the shared five-minute expiry buffer", () => {
    expect(
      needsRefresh({
        token: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 6 * 60 * 1000,
        label: "account",
      }),
    ).toBe(false);
    expect(
      needsRefresh({
        token: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() + 4 * 60 * 1000,
        label: "account",
      }),
    ).toBe(true);
  });

  it("only treats rejected refresh credentials as permanent", () => {
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 400 }),
    ).toBe(true);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 401 }),
    ).toBe(true);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 404 }),
    ).toBe(true);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 429 }),
    ).toBe(false);
    expect(
      __testHooks.isPermanentRefreshFailure({ success: false, status: 503 }),
    ).toBe(false);
    expect(__testHooks.isPermanentRefreshFailure({ success: false })).toBe(
      false,
    );
  });

  it("preserves a stale-token 404 when the fallback endpoint is down", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockRejectedValueOnce(new Error("fallback endpoint unavailable"));

    const result = await refreshToken({
      token: "expired",
      refreshToken: "invalid",
      label: "account-a",
    });
    expect(result).toMatchObject({ success: false, status: 404 });
    expect(__testHooks.isPermanentRefreshFailure(result)).toBe(true);
  });

  it("keeps refresh endpoint 429 and 5xx failures transient", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));

    const result = await refreshToken({
      token: "expired",
      refreshToken: "still-valid",
      label: "account-b",
    });
    expect(result).toMatchObject({ success: false, status: 503 });
    expect(__testHooks.isPermanentRefreshFailure(result)).toBe(false);
  });

  it("serializes concurrent rotating-token refreshes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const first = {
      token: "old-access-a",
      refreshToken: "shared-old-refresh",
      label: "account-a",
    };
    const second = {
      token: "old-access-b",
      refreshToken: "shared-old-refresh",
      label: "account-b",
    };

    const results = await Promise.all([
      refreshToken(first),
      refreshToken(second),
    ]);

    expect(results).toEqual([{ success: true }, { success: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({
      token: "new-access",
      refreshToken: "new-refresh",
    });
    expect(second).toMatchObject({
      token: "new-access",
      refreshToken: "new-refresh",
    });

    const rotatedTokenCaller = {
      token: "stale-access",
      refreshToken: "new-refresh",
      label: "account-a-reloaded",
    };
    expect(await refreshToken(rotatedTokenCaller)).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rotatedTokenCaller).toMatchObject({
      token: "new-access",
      refreshToken: "new-refresh",
    });
  });
});

describe("account restriction", () => {
  it("normalizes an explicit allowlist and denies every unlisted source", () => {
    const allowlist = createAccountAllowlist([
      " primary@example.com ",
      "anthropic:PRIMARY@example.com",
    ]);

    expect([...allowlist!]).toEqual(["anthropic:primary@example.com"]);
    expect(isAccountAllowed("primary@example.com", allowlist)).toBe(true);
    expect(isAccountAllowed("anthropic:other@example.com", allowlist)).toBe(
      false,
    );
    expect(isAccountAllowed(LEGACY_ANTHROPIC_ACCOUNT_KEY, allowlist)).toBe(
      false,
    );
    expect(isAccountAllowed(ENV_ANTHROPIC_ACCOUNT_KEY, allowlist)).toBe(false);
    expect(
      anthropicAccountKeysEqual(
        "anthropic:PRIMARY@example.com",
        "primary@example.com",
      ),
    ).toBe(true);
  });

  it("distinguishes an absent allowlist from an explicit deny-all list", () => {
    expect(isAccountAllowed("anthropic:any", undefined)).toBe(true);
    expect(isAccountAllowed("anthropic:any", createAccountAllowlist([]))).toBe(
      false,
    );
  });

  it("never activates hidden fallback credentials while token-store accounts exist", () => {
    expect(
      shouldLoadFallbackCredential(1, LEGACY_ANTHROPIC_ACCOUNT_KEY, undefined),
    ).toBe(false);
    expect(
      shouldLoadFallbackCredential(
        1,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        createAccountAllowlist(["legacy-default"]),
      ),
    ).toBe(false);
    expect(
      shouldLoadFallbackCredential(
        0,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        createAccountAllowlist(["primary@example.com"]),
      ),
    ).toBe(false);
    expect(
      shouldLoadFallbackCredential(
        0,
        LEGACY_ANTHROPIC_ACCOUNT_KEY,
        createAccountAllowlist(["legacy-default"]),
      ),
    ).toBe(true);
  });

  it("parses and validates account-allowlist without failing open", async () => {
    const config = await parseProxyConfigString(
      JSON.stringify({
        routing: {
          "account-allowlist": [" primary@example.com ", "anthropic:other"],
        },
      }),
    );
    expect(config.routing?.accountAllowlist).toEqual([
      "primary@example.com",
      "anthropic:other",
    ]);

    await expect(
      parseProxyConfigString(
        JSON.stringify({ routing: { "account-allowlist": "hello" } }),
      ),
    ).rejects.toThrow("account-allowlist must be an array");
  });

  it("preserves manual disable metadata across automatic token saves", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-token-store-"));
    tempDirs.push(dir);
    const store = new TokenStore({
      encryptionEnabled: false,
      customStoragePath: join(dir, "tokens.json"),
    });
    const key = "anthropic:disabled@example.com";
    await store.saveTokens(key, {
      accessToken: "old-access",
      refreshToken: "old-refresh",
      expiresAt: Date.now() + 60_000,
      tokenType: "Bearer",
    });
    await store.markDisabled(key, "manual_single_account_routing");
    await store.saveTokens(key, {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: Date.now() + 120_000,
      tokenType: "Bearer",
    });

    expect(await store.isDisabled(key)).toBe(true);
    expect(await store.getDisabledReason(key)).toBe(
      "manual_single_account_routing",
    );
    expect(await store.loadTokens(key)).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    await store.markEnabled(key);
    await Promise.all([
      store.saveTokens(key, {
        accessToken: "concurrent-access",
        refreshToken: "concurrent-refresh",
        expiresAt: Date.now() + 180_000,
        tokenType: "Bearer",
      }),
      store.markDisabled(key, "concurrent_operator_disable"),
    ]);
    expect(await store.isDisabled(key)).toBe(true);
    expect(await store.getDisabledReason(key)).toBe(
      "concurrent_operator_disable",
    );
  });
});

describe("stream terminal outcomes", () => {
  it("preserves the first terminal outcome", async () => {
    const tracker = createStreamTerminalOutcomeTracker();
    tracker.fail("socket reset");
    tracker.complete();
    expect(await tracker.outcome).toEqual({
      kind: "upstream_error",
      message: "socket reset",
    });
  });

  it("captures a passthrough source failure while preserving stream failure", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial"));
        controller.error(new Error("upstream socket reset"));
      },
    });
    const tracked = __testHooks.trackUpstreamReadableStream(source);
    await expect(new Response(tracked.stream).text()).rejects.toBeInstanceOf(
      Error,
    );
    expect(await tracked.outcome).toEqual({
      kind: "upstream_error",
      message: "upstream socket reset",
    });
  });

  it("records client cancellation as a distinct terminal outcome", async () => {
    let sourceCancelled = false;
    const source = new ReadableStream<Uint8Array>({
      cancel() {
        sourceCancelled = true;
      },
    });
    const tracked = __testHooks.trackUpstreamReadableStream(source);

    await tracked.stream.cancel("client disconnected");

    expect(sourceCancelled).toBe(true);
    expect(await tracked.outcome).toEqual({ kind: "client_cancelled" });
  });

  it("promotes a terminal SSE error instead of reporting success", async () => {
    const { stream, telemetry } = createSSEInterceptor();
    const source = new Response(
      'event: error\ndata: {"type":"error","error":{"message":"quota stream interrupted"}}\n\n',
    ).body!;
    await new Response(source.pipeThrough(stream)).text();
    const data = await telemetry;

    expect(data.streamErrorMessage).toBe("quota stream interrupted");
    expect(
      mergeStreamTerminalOutcome(
        { kind: "completed" },
        data.streamErrorMessage,
      ),
    ).toEqual({
      kind: "upstream_error",
      message: "quota stream interrupted",
    });
    expect(
      __testHooks.getStreamFailureDetails({
        kind: "upstream_error",
        message: "quota stream interrupted",
      }),
    ).toEqual({
      status: 502,
      errorType: "stream_error",
      message: "quota stream interrupted",
    });
    expect(
      __testHooks.getStreamFailureDetails({ kind: "client_cancelled" }),
    ).toMatchObject({ status: 499, errorType: "client_cancelled" });
  });

  it("retains the nested transport cause for terminated streams", () => {
    const cause = Object.assign(new Error("other side closed"), {
      code: "UND_ERR_SOCKET",
    });
    const error = new Error("terminated", { cause });

    expect(__testHooks.describeTransportError(error)).toBe(
      "terminated (UND_ERR_SOCKET: other side closed)",
    );
  });

  it("bounds upstream SSE error messages before logging", async () => {
    const oversizedMessage = "x".repeat(10_000);
    const { stream, telemetry } = createSSEInterceptor();
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const drain = (async () => {
      while (!(await reader.read()).done) {
        // Drain the passthrough stream so writes cannot backpressure the test.
      }
    })();

    await writer.write(
      new TextEncoder().encode(
        `event: error\ndata: ${JSON.stringify({ type: "error", error: { message: oversizedMessage } })}\n\n`,
      ),
    );
    await writer.close();
    await drain;

    const data = await telemetry;
    expect(data.streamErrorMessage).toHaveLength(2048);
    expect(data.streamErrorMessage).toMatch(/^x+\.\.\.\[TRUNCATED\]$/);
  });

  it("detects a fragmented SSE error before committing stream bytes", async () => {
    const encoder = new TextEncoder();
    const frames = [
      "event: er",
      'ror\ndata: {"type":"error","error":{"type":"rate_limit_error",',
      '"message":"Rate limited"}}\n\n',
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) {
          controller.enqueue(encoder.encode(frame));
        }
        controller.close();
      },
    });

    const result = await preflightAnthropicStream(stream.getReader());

    expect(result).toMatchObject({
      kind: "sse_error",
      errorType: "rate_limit_error",
      message: "Rate limited",
    });
    expect(
      Buffer.concat(result.chunks.map((chunk) => Buffer.from(chunk))).toString(
        "utf8",
      ),
    ).toBe(frames.join(""));
  });

  it("detects immediate SSE errors using CRLF framing", async () => {
    const frame =
      'event: error\r\ndata: {"type":"error","error":{"type":"api_error","message":"Unavailable"}}\r\n\r\n';
    const stream = new Response(frame).body!;

    await expect(
      preflightAnthropicStream(stream.getReader()),
    ).resolves.toMatchObject({
      kind: "sse_error",
      errorType: "api_error",
      message: "Unavailable",
    });
  });

  it("rotates on an immediate HTTP 200 SSE rate limit without a final failure", async () => {
    const dir = await mkdtemp(join(tmpdir(), "neurolink-sse-preflight-"));
    tempDirs.push(dir);
    initAccountCooldown(join(dir, "account-cooldowns.json"));
    initAccountQuota(join(dir, "account-quotas.json"));

    const encoder = new TextEncoder();
    const frames = [
      "event: er",
      'ror\ndata: {"type":"error","error":{"details":null,',
      '"type":"rate_limit_error","message":"Rate limited"}}\n\n',
    ];
    const upstreamStream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) {
          controller.enqueue(encoder.encode(frame));
        }
      },
    });
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "test-token",
      type: "oauth" as const,
    };
    const accountState = {
      consecutiveRefreshFailures: 0,
      permanentlyDisabled: false,
    };
    const logAttempt = vi.fn();
    const logFinalRequest = vi.fn();
    const logProxyBody = vi.fn();
    const upstreamSpan = { end: vi.fn() };
    const tracer = { recordRetry: vi.fn() };
    const nowSec = Math.floor(Date.now() / 1000);
    const responseHeaders = {
      "content-type": "text/event-stream",
      "anthropic-ratelimit-unified-status": "allowed",
      "anthropic-ratelimit-unified-5h-status": "allowed",
      "anthropic-ratelimit-unified-5h-utilization": "0.06",
      "anthropic-ratelimit-unified-5h-reset": String(nowSec + 60 * 60),
      "anthropic-ratelimit-unified-7d-status": "allowed",
      "anthropic-ratelimit-unified-7d-utilization": "0.01",
      "anthropic-ratelimit-unified-7d-reset": String(nowSec + 24 * 60 * 60),
    };

    const result = await __testHooks.handleAnthropicStreamingSuccessResponse({
      ctx: {} as never,
      body: { model: "claude-opus-4-8", messages: [], stream: true },
      account,
      accountState,
      response: new Response(upstreamStream, {
        status: 200,
        headers: responseHeaders,
      }),
      responseHeaders,
      tracer: tracer as never,
      requestStartTime: Date.now(),
      fetchStartMs: Date.now(),
      attemptNumber: 1,
      finalBodyStr: "{}",
      upstreamSpan: upstreamSpan as never,
      logAttempt,
      logProxyBody,
      logFinalRequest,
    });

    expect(result).toEqual({
      retryNextAccount: true,
      failure: { message: "Rate limited", rateLimit: true },
    });
    expect(logAttempt).toHaveBeenCalledWith(
      429,
      "rate_limit_error",
      "Rate limited",
      {
        retryable: true,
        rateLimitKind: "transient",
        cooldownReason: "transient",
      },
    );
    expect(getStats()).toMatchObject({
      totalRequests: 0,
      totalAttemptErrors: 1,
      totalRateLimits: 1,
      totalTransientRateLimits: 1,
      totalQuotaRateLimits: 0,
    });
    expect(accountState).toMatchObject({
      coolingReason: "transient",
      coolingUntil: expect.any(Number),
    });
    expect(accountState.coolingUntil).toBeGreaterThan(Date.now());
    expect(logProxyBody).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: "upstream_response",
        body: frames.join(""),
        responseStatus: 200,
        metadata: {
          logicalStatus: 429,
          upstreamErrorType: "rate_limit_error",
        },
      }),
    );
    expect(logFinalRequest).not.toHaveBeenCalled();
    expect(upstreamSpan.end).toHaveBeenCalledTimes(1);
    expect(tracer.recordRetry).toHaveBeenCalledWith(
      account.label,
      "stream_rate_limit_before_commit",
    );
  });

  it("settles failed-stream telemetry exactly once", async () => {
    const encoder = new TextEncoder();
    const transportCause = Object.assign(new Error("other side closed"), {
      code: "UND_ERR_SOCKET",
    });
    const upstreamStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":1,"output_tokens":0}}}\n\n',
          ),
        );
      },
      pull() {
        throw new Error("terminated", { cause: transportCause });
      },
    });
    const account = {
      key: "anthropic:primary@example.com",
      label: "primary@example.com",
      token: "test-token",
      type: "oauth" as const,
    };
    const logFinalRequest = vi.fn();
    const logAttempt = vi.fn();
    const logProxyBody = vi.fn();
    const upstreamSpan = { end: vi.fn() };
    const tracer = {
      setUsage: vi.fn(),
      logStreamEvents: vi.fn(),
      setResponseInfo: vi.fn(),
      logUpstreamResponseBody: vi.fn(),
      recordMetrics: vi.fn(),
      recordBodySizes: vi.fn(),
      setError: vi.fn(),
      end: vi.fn(),
    };

    const result = await __testHooks.handleAnthropicStreamingSuccessResponse({
      ctx: {} as never,
      body: { model: "claude-opus-4-8", messages: [], stream: true },
      account,
      accountState: {
        consecutiveRefreshFailures: 0,
        permanentlyDisabled: false,
      },
      response: new Response(upstreamStream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
      responseHeaders: { "content-type": "text/event-stream" },
      tracer: tracer as never,
      requestStartTime: Date.now(),
      fetchStartMs: Date.now(),
      attemptNumber: 1,
      finalBodyStr: "{}",
      upstreamSpan: upstreamSpan as never,
      logAttempt,
      logProxyBody,
      logFinalRequest,
    });

    expect(result).not.toHaveProperty("retryNextAccount");
    await (result.response as Response).text();
    await vi.waitFor(() => expect(logFinalRequest).toHaveBeenCalledTimes(1));

    expect(logAttempt).toHaveBeenCalledWith(200, undefined, undefined, {
      attemptDurationMs: expect.any(Number),
    });

    expect(logFinalRequest).toHaveBeenCalledWith(
      502,
      account.label,
      account.type,
      "stream_error",
      "terminated (UND_ERR_SOCKET: other side closed)",
      expect.any(Object),
    );
    expect(tracer.setError).toHaveBeenCalledTimes(1);
    expect(tracer.end).toHaveBeenCalledTimes(1);
    expect(upstreamSpan.end).toHaveBeenCalledTimes(1);
    expect(getStats()).toMatchObject({ totalRequests: 1, totalErrors: 1 });
  });
});

describe("launchd lifecycle source invariants", () => {
  it("leaves restart ownership with launchd and isolates automatic updates", async () => {
    const source = await readFile(
      new URL("../src/cli/commands/proxy.ts", import.meta.url),
      "utf8",
    );
    const updateState = await readFile(
      new URL("../src/lib/proxy/updateState.ts", import.meta.url),
      "utf8",
    );
    const installer = await readFile(
      new URL("../src/lib/proxy/globalInstaller.ts", import.meta.url),
      "utf8",
    );
    const startHandler = source.slice(
      source.indexOf("async function startProxyCommandHandler"),
      source.indexOf("export const proxyStartCommand"),
    );

    expect(source).not.toContain("tryLaunchdRestart");
    expect(source).toContain("params.argv.dev || managedByLaunchd");
    expect(source).toContain("NEUROLINK_PROXY_AUTO_UPDATE");
    expect(source).toContain('["0", "off", "false"]');
    expect(source).toContain("spawnProxyUpdater");
    expect(source).toContain("startUpdaterWorkerSupervisor");
    expect(source).toContain("startRollingProxyServer");
    expect(source).toContain("attachSocketWorkerProcess");
    expect(source).toContain("PROXY_ROLLING_SUPERVISOR_ENV");
    expect(source).toContain('process.on("SIGUSR2", activatePendingUpdate)');
    expect(source).toContain('process.kill(parentPid, "SIGUSR2")');
    expect(source).toContain("command: TRAMPOLINE_PATH");
    expect(source).toContain("NEUROLINK_PROXY_TRAMPOLINE_EXEC_ONLY");
    expect(source).toContain("if (!rollingSupervisor)");
    expect(source).toContain('"proxy-supervisor-state.json"');
    expect(source).toContain("const servingWorker =");
    expect(source).toContain(
      "const servingState = servingWorker ? state : null",
    );
    expect(source).toContain('type: "proxy-worker:replacement-requested"');
    expect(source).toContain(
      "status.strategy = servingState?.strategy ?? null",
    );
    expect(source).not.toContain("status.strategy = state?.strategy ?? null");
    expect(source).toContain(
      "rolling activation failed; restoring @juspay/neurolink@",
    );
    expect(source).toContain("package rollback complete");
    expect(source).toMatch(
      /if \(updaterOnly && consecutiveUnhealthy >= failureThreshold\)/,
    );
    expect(source).toContain(
      "if (\n        !updaterOnly &&\n        !updateRestartInProgress &&\n        !healthy &&\n        consecutiveUnhealthy >= failureThreshold",
    );
    expect(source).toContain("openProxyWorkerLog");
    expect(source).toContain("sanitizeForLog(String(model))");
    expect(source).toContain("getProxyRuntimeActivity");
    expect(source).not.toContain("proceeding with update anyway");
    expect(source).toContain('["kickstart", "-k"');
    expect(source).not.toContain('["bootout", `gui/${uid}/${PLIST_LABEL}`]');
    expect(source).toContain("stopUpdateChecks()");
    expect(source).toContain("validateInstalledVersion");
    expect(source).not.toContain("trampoline_broken_after_install");
    expect(source).toContain('from "../../../package.json" with');
    expect(source).toContain("<key>ExitTimeOut</key>");
    expect(source).toContain("backgroundRefreshInProgress");
    expect(source).toContain("await tokenStore.isDisabled(key)");
    expect(source).toContain(
      'await tokenStore.markDisabled(key, "refresh_invalid")',
    );
    expect(source).not.toContain("tokenChanged || legacyTransientDisable");
    expect(source).toContain("initAccountCooldown(devPaths.cooldownFile)");
    expect(source).not.toContain("Ignoring default config");
    expect(source).toContain("catch(forceExitAfterShutdownFailure)");
    expect(source).toContain("Timed out draining the proxy server");
    expect(source).toContain("await Promise.allSettled([");
    expect(source).toContain(
      "Timed out flushing proxy usage statistics during shutdown",
    );
    expect(source).toContain(
      "Timed out flushing proxy lifecycle metadata during shutdown",
    );
    expect(source).toContain(
      "Timed out flushing proxy request logs during shutdown",
    );
    const rollingServer = await readFile(
      new URL("../src/lib/proxy/rollingProxyServer.ts", import.meta.url),
      "utf8",
    );
    expect(rollingServer).toContain(
      "await new Promise<void>((resolve) => listener.close(() => resolve()))",
    );
    expect(rollingServer).toContain(
      "await supervisor.close().catch(() => undefined)",
    );
    const startAllowedIndex = startHandler.indexOf(
      "await ensureProxyStartAllowed(spinner)",
    );
    const statsInitIndex = startHandler.indexOf(
      "await initUsageStats(resolveProxyUsageStatsPath(proxyPaths))",
    );
    expect(startAllowedIndex).toBeGreaterThanOrEqual(0);
    expect(statsInitIndex).toBeGreaterThanOrEqual(0);
    expect(startAllowedIndex).toBeLessThan(statsInitIndex);
    expect(updateState).toContain("randomUUID()");
    expect(updateState).not.toContain("const tempPath = `${filePath}.tmp`");
    expect(installer).toContain('["bin", "-g"]');
    expect(installer).toContain('["prefix", "-g"]');
    expect(installer).toContain("stdout:");
    expect(installer).toContain("stderr:");
  });

  it("keeps dev-mode cooldown state outside the live state directory", () => {
    const paths = resolveProxyPaths(true);
    expect(paths.cooldownFile).toBe(
      join(process.cwd(), ".neurolink-dev", "account-cooldowns.json"),
    );
    expect(paths.statsFile).toBe(
      join(process.cwd(), ".neurolink-dev", "proxy-usage-stats.json"),
    );
    expect(
      resolveProxyUsageStatsPath({
        stateDir: paths.stateDir,
        logsDir: paths.logsDir,
        quotaFile: paths.quotaFile,
        cooldownFile: paths.cooldownFile,
        isDev: true,
      }),
    ).toBe(join(paths.stateDir, "proxy-usage-stats.json"));
  });

  it("does not fall back to known-cooling accounts", async () => {
    const source = await readFile(
      new URL("../src/lib/server/routes/claudeProxyRoutes.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("let effectiveAccounts = nonCoolingAccounts;");
    expect(source).toContain("eligible credentials reloaded");
    expect(source).toContain("authCooldownMessage");
    expect(source).not.toContain("credentials changed, re-enabling");
    expect(source).not.toContain(
      "nonCoolingAccounts.length > 0 ? nonCoolingAccounts : orderedAccounts",
    );
  });
});
