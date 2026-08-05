#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Proxy Limit / Quota Response Headers
 *
 * Covers the full path that makes account limits visible to a normal NeuroLink
 * run:
 *   1. the pure header builder (`proxy/quotaHeaders.ts`),
 *   2. the proxy route emitting headers on every response shape — routed JSON,
 *      routed streaming, terminal 429, and fallback,
 *   3. the Anthropic provider capturing them back off the wire.
 *
 * HERMETIC BY CONSTRUCTION. This suite must never touch the developer's real
 * proxy state or make a network call:
 *   - `initAccountQuota` / `initAccountCooldown` redirect all persistence into
 *     a temp dir, so `~/.neurolink/` is never read or written.
 *   - `globalThis.fetch` is stubbed, so nothing leaves the process.
 *   - request headers deliberately omit `user-agent: claude-cli/` and
 *     `x-claude-code-session-id`. `isLikelyClaudeClient` keys off those, and
 *     header snapshots are NOT redirected in dev mode — tripping that
 *     heuristic would write into the real `~/.neurolink/header-snapshots/`.
 *
 * NOTE on assertion messages: the harness classifies a thrown error as SKIP
 * when the text matches `isExpectedProviderError()`. Quoting a response
 * payload here (which contains "rate_limit_error", "429", ...) would turn a
 * real failure into a silent skip. Report header names and key paths only,
 * never values. See CLAUDE.md.
 *
 * Run with: npx tsx test/continuous-test-suite-proxy-limit-headers.ts
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initAccountQuota,
  flushAccountQuotaStateForTests,
} from "../src/lib/proxy/accountQuota.js";
import { initAccountCooldown } from "../src/lib/proxy/accountCooldown.js";
import {
  buildProxyLimitHeaders,
  buildQuotaResponseHeaders,
  pickUpstreamRateLimitHeaders,
  summarizePoolHeadroom,
  utilizationToLeftPct,
} from "../src/lib/proxy/quotaHeaders.js";
import {
  buildLimitSnapshot,
  parseAnthropicLimitHeaders,
  withLimitCapture,
  wrapFetchWithLimitCapture,
} from "../src/lib/providers/anthropic/rateLimitCapture.js";
import { createClaudeProxyRoutes } from "../src/lib/server/routes/claudeProxyRoutes.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import { resetUsageStatsForTests } from "../src/lib/proxy/usageStats.js";
import type { AccountQuota, ServerContext } from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, section, runSuite } = defineSuite("Proxy Limit Headers");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A representative subscription-account response header set. */
function upstreamQuotaHeaders(
  overrides: Record<string, string> = {},
): Record<string, string> {
  const fiveHoursOut = Math.floor(Date.now() / 1000) + 5 * 3600;
  const weekOut = Math.floor(Date.now() / 1000) + 7 * 86400;
  return {
    "content-type": "application/json",
    "anthropic-ratelimit-unified-status": "allowed",
    "anthropic-ratelimit-unified-5h-utilization": "0.42",
    "anthropic-ratelimit-unified-5h-status": "allowed",
    "anthropic-ratelimit-unified-5h-reset": String(fiveHoursOut),
    "anthropic-ratelimit-unified-7d-utilization": "0.19",
    "anthropic-ratelimit-unified-7d-status": "allowed",
    "anthropic-ratelimit-unified-7d-reset": String(weekOut),
    "anthropic-ratelimit-unified-fallback-percentage": "0.5",
    "anthropic-ratelimit-unified-fallback": "available",
    "anthropic-ratelimit-unified-overage-status": "allowed",
    "x-request-id": "req_test_123",
    ...overrides,
  };
}

const MESSAGE_BODY = JSON.stringify({
  id: "msg_test",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-4-6",
  content: [{ type: "text", text: "ok" }],
  stop_reason: "end_turn",
  usage: { input_tokens: 10, output_tokens: 5 },
});

function sampleQuota(overrides: Partial<AccountQuota> = {}): AccountQuota {
  return {
    unifiedStatus: "allowed",
    sessionUsed: 0.42,
    sessionStatus: "allowed",
    sessionResetAt: Math.floor(Date.now() / 1000) + 3600,
    weeklyUsed: 0.19,
    weeklyStatus: "allowed",
    weeklyResetAt: Math.floor(Date.now() / 1000) + 7 * 86400,
    fallbackPercentage: 0.5,
    fallbackStatus: "available",
    overageStatus: "allowed",
    lastUpdated: Date.now(),
    ...overrides,
  };
}

/**
 * Build a request context. Client headers stay minimal on purpose — see the
 * header-snapshot warning in the file docblock.
 */
function createContext(requestId: string, stream = false): ServerContext {
  return {
    requestId,
    method: "POST",
    path: "/v1/messages",
    headers: { "content-type": "application/json" },
    query: {},
    params: {},
    timestamp: Date.now(),
    metadata: {},
    responseHeaders: {},
    body: {
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 16,
      ...(stream ? { stream: true } : {}),
    },
    neurolink: { stream: async () => undefined },
    toolRegistry: {},
  } as unknown as ServerContext;
}

const findMessagesRoute = () => {
  const route = createClaudeProxyRoutes(
    undefined,
    "",
    "fill-first",
    false,
  ).routes.find((r) => r.method === "POST" && r.path === "/v1/messages");
  if (!route) {
    throw new Error("messages route not found");
  }
  return route;
};

// ---------------------------------------------------------------------------
// Hermetic environment
// ---------------------------------------------------------------------------

type Restore = () => void;

/**
 * Per-test account identity counter.
 *
 * The route module keeps account runtime state (cooldowns especially) in a
 * module-level map with no reset hook, so an account cooled by the 429 test
 * would still be cooling for every test after it. Distinct labels keep tests
 * order-independent instead of quietly coupling them.
 */
let accountSeq = 0;

/**
 * Redirect every piece of proxy persistence into a temp dir, install a stub
 * fetch and a stub token store, run `body`, then restore everything.
 */
async function withIsolatedProxy(
  args: {
    accounts?: string[];
    fetchImpl: (
      url: string,
      init?: RequestInit,
    ) => Promise<Response> | Response;
  },
  body: () => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "neurolink-limit-headers-"));
  accountSeq += 1;
  const accounts = args.accounts ?? [
    `anthropic:tester${accountSeq}@example.com`,
  ];

  // Persistence → temp dir. Without this the suite would read and rewrite the
  // developer's real ~/.neurolink/account-quotas.json.
  initAccountQuota(join(dir, "quotas.json"));
  initAccountCooldown(join(dir, "cooldowns.json"));
  await resetUsageStatsForTests();

  const restores: Restore[] = [];
  const patch = <T extends object, K extends keyof T>(
    target: T,
    key: K,
    value: T[K],
  ): void => {
    const original = target[key];
    target[key] = value;
    restores.push(() => {
      target[key] = original;
    });
  };

  patch(globalThis, "fetch", (async (
    url: RequestInfo | URL,
    init?: RequestInit,
  ) => args.fetchImpl(String(url), init)) as typeof fetch);

  patch(tokenStore, "pruneExpired", async () => undefined);
  patch(tokenStore, "listByPrefix", async () => accounts);
  patch(tokenStore, "isDisabled", async () => false);
  patch(tokenStore, "listDisabled", async () => []);
  patch(tokenStore, "loadTokens", async (key: string) => ({
    accessToken: `token-for-${key}`,
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 3600_000,
    tokenType: "Bearer",
  }));

  try {
    await body();
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await flushAccountQuotaStateForTests().catch(() => undefined);
    await resetUsageStatsForTests().catch(() => undefined);
    // Point persistence back at a throwaway path so a later flush from this
    // process can never land in the real state dir.
    initAccountQuota(join(dir, "quotas.json"));
    initAccountCooldown(join(dir, "cooldowns.json"));
    await rm(dir, { recursive: true, force: true });
  }
}

function headersOf(ctx: ServerContext): Record<string, string> {
  return (ctx.responseHeaders ?? {}) as Record<string, string>;
}

// ===========================================================================
// 1. Pure builder
// ===========================================================================

section("Header builder (pure)");

await test("derives whole-percent headroom from utilization", () => {
  assertEqual(utilizationToLeftPct(0.42), 58, "58% should remain at 0.42 used");
  assertEqual(utilizationToLeftPct(0), 100, "an unused window is 100% left");
  assertEqual(utilizationToLeftPct(1), 0, "a full window is 0% left");
});

await test("clamps overage utilization instead of reporting negative headroom", () => {
  assertEqual(
    utilizationToLeftPct(1.35),
    0,
    "utilization above 1.0 must clamp to 0, not go negative",
  );
});

await test("forwards both Anthropic rate-limit header families verbatim", () => {
  const picked = pickUpstreamRateLimitHeaders({
    ...upstreamQuotaHeaders(),
    "anthropic-ratelimit-requests-remaining": "42",
    "anthropic-ratelimit-tokens-remaining": "1000",
    "retry-after": "30",
    "set-cookie": "should-not-be-forwarded",
  });

  assert(
    picked["anthropic-ratelimit-unified-5h-utilization"] === "0.42",
    "unified 5h utilization must pass through verbatim",
  );
  assert(
    picked["anthropic-ratelimit-requests-remaining"] === "42",
    "legacy absolute remaining count must pass through verbatim",
  );
  assert(picked["retry-after"] === "30", "retry-after must pass through");
  assert(
    picked["set-cookie"] === undefined,
    "unrelated headers must not be forwarded",
  );
});

await test("always reports quota provenance", () => {
  const live = buildQuotaResponseHeaders({
    quota: sampleQuota(),
    source: "live",
  });
  assertEqual(
    live["x-neurolink-quota-source"],
    "live",
    "a fresh reading must be labelled live",
  );

  const none = buildQuotaResponseHeaders({ quota: null, source: "none" });
  assertEqual(
    none["x-neurolink-quota-source"],
    "none",
    "provenance must be present even when there is no quota",
  );
});

await test("omits quota figures entirely when no account served the request", () => {
  const headers = buildQuotaResponseHeaders({
    quota: sampleQuota(),
    source: "none",
    servedBy: "vertex",
  });
  assert(
    headers["x-neurolink-quota-session-left-pct"] === undefined,
    "a fallback-served response must not carry session headroom",
  );
  assertEqual(
    headers["x-neurolink-served-by"],
    "vertex",
    "the serving provider must be named",
  );
});

await test("sanitizes header values so an account label cannot inject headers", () => {
  const headers = buildQuotaResponseHeaders({
    quota: null,
    source: "none",
    accountLabel: "evil\r\nx-injected: yes",
  });
  const label = headers["x-neurolink-account"] ?? "";
  assert(
    !label.includes("\r") && !label.includes("\n"),
    "CR/LF must be stripped from the account label",
  );
  assert(
    headers["x-injected"] === undefined,
    "a crafted label must not produce an extra header",
  );
});

await test("summarizes pool headroom across accounts", () => {
  const now = Date.now();
  const summary = summarizePoolHeadroom(
    [
      { quota: sampleQuota({ sessionUsed: 0.9 }) },
      { quota: sampleQuota({ sessionUsed: 0.1 }) },
      { coolingUntil: now + 60_000, quota: sampleQuota({ sessionUsed: 1 }) },
    ],
    now,
  );
  assertEqual(summary.available, 2, "two accounts are usable");
  assertEqual(summary.cooling, 1, "one account is cooling");
  assertEqual(
    summary.bestSessionLeftPct,
    90,
    "best headroom comes from the least-used available account",
  );
});

await test("merges upstream and proxy headers into one set", () => {
  const headers = buildProxyLimitHeaders({
    upstreamHeaders: upstreamQuotaHeaders(),
    context: {
      quota: sampleQuota(),
      source: "live",
      accountLabel: "tester@example.com",
      accountType: "oauth",
      servedBy: "anthropic",
    },
  });
  assert(
    headers["anthropic-ratelimit-unified-5h-utilization"] !== undefined,
    "verbatim upstream header missing from merged set",
  );
  assert(
    headers["x-neurolink-quota-session-left-pct"] !== undefined,
    "derived headroom header missing from merged set",
  );
});

// ===========================================================================
// 2. Proxy routes — every response shape
// ===========================================================================

section("Proxy route emission");

await test("routed JSON success publishes verbatim and derived headers", async () => {
  await withIsolatedProxy(
    {
      fetchImpl: () =>
        new Response(MESSAGE_BODY, {
          status: 200,
          headers: upstreamQuotaHeaders(),
        }),
    },
    async () => {
      const ctx = createContext("limit-json");
      await findMessagesRoute().handler(ctx);
      const headers = headersOf(ctx);

      assertEqual(
        headers["anthropic-ratelimit-unified-5h-utilization"],
        "0.42",
        "upstream utilization must reach the client verbatim",
      );
      assertEqual(
        headers["x-neurolink-quota-session-left-pct"],
        "58",
        "derived session headroom must be published",
      );
      assertEqual(
        headers["x-neurolink-quota-source"],
        "live",
        "a response carrying quota headers is a live reading",
      );
      assertEqual(
        headers["x-neurolink-served-by"],
        "anthropic",
        "an account-served response must name anthropic",
      );
      assert(
        headers["x-neurolink-account"] !== undefined,
        "the serving account must be identified",
      );
      assert(
        headers["x-neurolink-pool-available"] !== undefined,
        "pool headroom must be reported",
      );
    },
  );
});

await test("routed streaming success carries headers on the Response", async () => {
  await withIsolatedProxy(
    {
      fetchImpl: () => {
        const sse =
          `event: message_start\ndata: ${JSON.stringify({
            type: "message_start",
            message: {
              id: "msg_1",
              model: "claude-sonnet-4-6",
              usage: { input_tokens: 5, output_tokens: 0 },
            },
          })}\n\n` +
          `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`;
        return new Response(sse, {
          status: 200,
          headers: upstreamQuotaHeaders({
            "content-type": "text/event-stream",
          }),
        });
      },
    },
    async () => {
      const ctx = createContext("limit-stream", true);
      const result = await findMessagesRoute().handler(ctx);

      assert(
        result instanceof Response,
        "the streaming path must return a Response",
      );
      const response = result as Response;
      assertEqual(
        response.headers.get("anthropic-ratelimit-unified-5h-utilization"),
        "0.42",
        "streaming responses must forward unified quota, not only the legacy allowlist",
      );
      assertEqual(
        response.headers.get("x-neurolink-quota-session-left-pct"),
        "58",
        "streaming responses must carry derived headroom",
      );
      // Drain so the capture pipeline settles before the stub is restored.
      await response.text().catch(() => undefined);
    },
  );
});

await test("terminal rate-limit failure still reports limits", async () => {
  const exhausted = upstreamQuotaHeaders({
    "anthropic-ratelimit-unified-status": "rejected",
    "anthropic-ratelimit-unified-5h-utilization": "1.0",
    "anthropic-ratelimit-unified-5h-status": "rejected",
    "retry-after": "120",
  });
  await withIsolatedProxy(
    {
      fetchImpl: () =>
        new Response(
          JSON.stringify({
            type: "error",
            error: { type: "rate_limit_error", message: "limit reached" },
          }),
          { status: 429, headers: exhausted },
        ),
    },
    async () => {
      const ctx = createContext("limit-429");
      await findMessagesRoute().handler(ctx);
      const headers = headersOf(ctx);

      assert(
        headers["x-neurolink-quota-source"] !== undefined,
        "a terminal failure must still state quota provenance",
      );
      assert(
        headers["x-neurolink-pool-available"] !== undefined,
        "a terminal failure must report pool headroom",
      );
      assertEqual(
        headers["x-neurolink-quota-session-left-pct"],
        "0",
        "an exhausted session window must report zero headroom",
      );
    },
  );
});

await test("never fabricates headroom when upstream sends no quota headers", async () => {
  // Deliberately NOT tested by emptying the account list: with no accounts the
  // route falls through to a stored/legacy credential, which would pull a real
  // developer account into the run. A stub account with a quota-less upstream
  // response exercises the same branch hermetically.
  await withIsolatedProxy(
    {
      fetchImpl: () =>
        new Response(MESSAGE_BODY, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
    async () => {
      const ctx = createContext("limit-no-quota-headers");
      await findMessagesRoute().handler(ctx);
      const headers = headersOf(ctx);

      assertEqual(
        headers["x-neurolink-quota-source"],
        "none",
        "a response with no quota headers and no snapshot must report source none",
      );
      assert(
        headers["x-neurolink-quota-session-left-pct"] === undefined,
        "source=none must never be accompanied by headroom figures",
      );
      assert(
        headers["x-neurolink-served-by"] === "anthropic",
        "the serving upstream must still be identified",
      );
    },
  );
});

// ===========================================================================
// 3. Provider-side capture
// ===========================================================================

section("Provider capture");

await test("parses both header families off a response", () => {
  const headers = new Headers({
    ...upstreamQuotaHeaders(),
    "anthropic-ratelimit-requests-remaining": "17",
    "anthropic-ratelimit-tokens-remaining": "900",
  });
  const info = parseAnthropicLimitHeaders(headers);

  assertEqual(info.sessionUtilization, 0.42, "session utilization must parse");
  assertEqual(info.sessionLeftPct, 58, "session headroom must be derived");
  assertEqual(info.weeklyLeftPct, 81, "weekly headroom must be derived");
  assertEqual(
    info.requestsRemaining,
    17,
    "absolute remaining requests must parse",
  );
  assertEqual(
    info.tokensRemaining,
    900,
    "absolute remaining tokens must parse",
  );
});

await test("reads proxy account and pool metadata into the snapshot", () => {
  const headers = new Headers({
    ...upstreamQuotaHeaders(),
    "x-neurolink-quota-source": "live",
    "x-neurolink-account": "tester@example.com",
    "x-neurolink-account-type": "oauth",
    "x-neurolink-served-by": "anthropic",
    "x-neurolink-pool-available": "3",
    "x-neurolink-pool-cooling": "1",
    "x-neurolink-pool-best-session-left": "88",
  });
  const snapshot = buildLimitSnapshot(headers, 200);

  assert(
    snapshot !== undefined,
    "a quota-bearing response must yield a snapshot",
  );
  assertEqual(snapshot?.quotaSource, "live", "provenance must be carried over");
  assertEqual(
    snapshot?.account,
    "tester@example.com",
    "serving account must be carried over",
  );
  assertEqual(
    snapshot?.pool?.available,
    3,
    "pool availability must be carried",
  );
  assertEqual(
    snapshot?.pool?.bestSessionLeftPct,
    88,
    "best pool headroom must be carried",
  );
  assertEqual(
    snapshot?.requestId,
    "req_test_123",
    "request id must be carried",
  );
});

await test("yields no snapshot for a response with nothing to report", () => {
  const snapshot = buildLimitSnapshot(
    new Headers({ "content-type": "application/json" }),
    200,
  );
  assertEqual(
    snapshot,
    undefined,
    "a response with no limit or proxy headers must not fabricate a snapshot",
  );
});

await test("captures limits through the wrapped fetch", async () => {
  const stub = (async () =>
    new Response(MESSAGE_BODY, {
      status: 200,
      headers: upstreamQuotaHeaders(),
    })) as unknown as typeof fetch;
  const wrapped = wrapFetchWithLimitCapture(stub);

  const { snapshot } = await withLimitCapture(async () => {
    await wrapped("https://api.anthropic.com/v1/messages");
  });

  assert(snapshot !== undefined, "the wrapper must capture a snapshot");
  assertEqual(
    snapshot?.rateLimit.sessionLeftPct,
    58,
    "captured headroom must match the response",
  );
});

await test("keeps concurrent requests' limits separate", async () => {
  // The whole reason capture is scoped via AsyncLocalStorage rather than an
  // instance field: one provider instance serves many concurrent calls.
  const makeStub = (utilization: string) =>
    (async () =>
      new Response(MESSAGE_BODY, {
        status: 200,
        headers: upstreamQuotaHeaders({
          "anthropic-ratelimit-unified-5h-utilization": utilization,
        }),
      })) as unknown as typeof fetch;

  const callA = withLimitCapture(async () => {
    const wrapped = wrapFetchWithLimitCapture(makeStub("0.10"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    await wrapped("https://api.anthropic.com/v1/messages");
  });
  const callB = withLimitCapture(async () => {
    const wrapped = wrapFetchWithLimitCapture(makeStub("0.80"));
    await wrapped("https://api.anthropic.com/v1/messages");
  });

  const [a, b] = await Promise.all([callA, callB]);
  assertEqual(
    a.snapshot?.rateLimit.sessionLeftPct,
    90,
    "the slower call must report its own headroom",
  );
  assertEqual(
    b.snapshot?.rateLimit.sessionLeftPct,
    20,
    "the faster call must report its own headroom",
  );
});

await test("capture never breaks a request when parsing fails", async () => {
  const hostile = {
    get: () => {
      throw new Error("header access exploded");
    },
    forEach: () => {
      throw new Error("header iteration exploded");
    },
  };
  const stub = (async () => ({
    status: 200,
    headers: hostile,
  })) as unknown as typeof fetch;
  const wrapped = wrapFetchWithLimitCapture(stub);

  const { result } = await withLimitCapture(async () => {
    const response = await wrapped("https://api.anthropic.com/v1/messages");
    return (response as unknown as { status: number }).status;
  });

  assertEqual(
    result,
    200,
    "a capture failure must not prevent the response from being returned",
  );
});

await runSuite();
