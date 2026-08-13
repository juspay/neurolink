#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Manual Limits Refresh (usage endpoint)
 *
 * Covers the manual refetch path that complements the passive header capture:
 *   1. `usageToQuota` — pure normalization of the OAuth usage endpoint payload
 *      (percent → fraction, ISO → epoch seconds, dynamic `windows` incl. the
 *      model-scoped Fable weekly),
 *   2. `fetchAccountUsage` — transport behavior against a stubbed fetch,
 *   3. the proxy's GET /limits refresh flow (`refreshAccountLimits` via
 *      __testHooks) — write-through to runtime state + disk, cooldown
 *      reconciliation, throttle, snapshot mode, single-flight,
 *   4. `saveAccountQuota` windows preservation when a header-sourced save
 *      follows a usage-API refresh,
 *   5. the CLI window-row formatter.
 *
 * HERMETIC BY CONSTRUCTION — same recipe as the proxy-limit-headers suite:
 *   - `initAccountQuota` / `initAccountCooldown` redirect all persistence into
 *     a temp dir, so `~/.neurolink/` is never read or written.
 *   - `globalThis.fetch` is stubbed, so nothing leaves the process.
 *   - the token store is stubbed with per-test account labels (module-level
 *     runtime state has no reset hook — distinct labels keep tests
 *     order-independent).
 *
 * NOTE on assertion messages: the harness classifies a thrown error as SKIP
 * when the text matches `isExpectedProviderError()`. Report field names and
 * key paths only, never payload values. See CLAUDE.md.
 *
 * Run with: npx tsx test/continuous-test-suite-proxy-usage-refresh.ts
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initAccountQuota,
  flushAccountQuotaStateForTests,
  loadAccountQuotas,
  saveAccountQuota,
} from "../src/lib/proxy/accountQuota.js";
import { initAccountCooldown } from "../src/lib/proxy/accountCooldown.js";
import {
  fetchAccountUsage,
  usageToQuota,
} from "../src/lib/proxy/accountUsage.js";
import {
  createClaudeProxyRoutes,
  __testHooks,
} from "../src/lib/server/routes/claudeProxyRoutes.js";
import { formatQuotaWindowRows } from "../src/cli/commands/auth.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import type {
  AccountQuota,
  AnthropicUsageResponse,
  ProxyLimitsRefreshResponse,
  ProxyPassthroughAccount,
  ServerContext,
} from "../src/lib/types/index.js";
import {
  assert,
  assertEqual,
  assertNotNull,
  defineSuite,
} from "./helpers/harness.js";

const { test, section, runSuite } = defineSuite("Proxy Usage Refresh");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Trimmed real usage-endpoint payload captured live (values adjusted). */
function usagePayload(
  overrides: Partial<AnthropicUsageResponse> = {},
): AnthropicUsageResponse {
  const sessionReset = new Date(Date.now() + 3 * 3600_000).toISOString();
  const weeklyReset = new Date(Date.now() + 4 * 86400_000).toISOString();
  return {
    five_hour: { utilization: 26.0, resets_at: sessionReset },
    seven_day: { utilization: 50.0, resets_at: weeklyReset },
    limits: [
      {
        kind: "session",
        group: "session",
        percent: 26,
        severity: "normal",
        resets_at: sessionReset,
        scope: null,
        is_active: false,
      },
      {
        kind: "weekly_all",
        group: "weekly",
        percent: 50,
        severity: "normal",
        resets_at: weeklyReset,
        scope: null,
        is_active: true,
      },
      {
        kind: "weekly_scoped",
        group: "weekly",
        percent: 49,
        severity: "normal",
        resets_at: weeklyReset,
        scope: { model: { id: null, display_name: "Fable" }, surface: null },
        is_active: false,
      },
    ],
    extra_usage: { is_enabled: false },
    ...overrides,
  };
}

function stubAccount(
  overrides: Partial<ProxyPassthroughAccount> = {},
): ProxyPassthroughAccount {
  return {
    key: "anthropic:stub@example.com",
    label: "stub@example.com",
    token: "stub-access-token",
    refreshToken: "stub-refresh-token",
    expiresAt: Date.now() + 3600_000,
    type: "oauth",
    persistTarget: { providerKey: "anthropic:stub@example.com" },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const stripAnsi = (text: string): string =>
  // eslint-disable-next-line no-control-regex
  text.replace(/\[[0-9;]*m/g, "");

// ---------------------------------------------------------------------------
// Hermetic environment
// ---------------------------------------------------------------------------

type Restore = () => void;

/** Per-test account identity counter — see file docblock. */
let accountSeq = 0;

async function withIsolatedRefreshEnv(
  args: {
    accountLabels?: string[];
    tokenType?: string;
    fetchImpl: (
      url: string,
      init?: RequestInit,
    ) => Promise<Response> | Response;
  },
  body: (accountKeys: string[]) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "neurolink-usage-refresh-"));
  accountSeq += 1;
  const labels = args.accountLabels ?? [`refresher${accountSeq}@example.com`];
  const accountKeys = labels.map((label) => `anthropic:${label}`);

  initAccountQuota(join(dir, "quotas.json"));
  initAccountCooldown(join(dir, "cooldowns.json"));
  __testHooks.clearLimitsRefreshStateForTests();

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

  patch(tokenStore, "pruneExpired", async () => []);
  patch(tokenStore, "listByPrefix", async () => accountKeys);
  patch(tokenStore, "isDisabled", async () => false);
  patch(tokenStore, "listDisabled", async () => []);
  patch(tokenStore, "loadTokens", async (key: string) => ({
    accessToken: `token-for-${key}`,
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 3600_000,
    tokenType: args.tokenType ?? "Bearer",
  }));

  try {
    await body(accountKeys);
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
    await flushAccountQuotaStateForTests().catch(() => undefined);
    __testHooks.clearLimitsRefreshStateForTests();
    // Point persistence back at a throwaway path so a later flush from this
    // process can never land in the real state dir.
    initAccountQuota(join(dir, "quotas.json"));
    initAccountCooldown(join(dir, "cooldowns.json"));
    await rm(dir, { recursive: true, force: true });
  }
}

const findLimitsRoute = () => {
  const route = createClaudeProxyRoutes(
    undefined,
    "",
    "fill-first",
    false,
  ).routes.find((r) => r.method === "GET" && r.path === "/limits");
  if (!route) {
    throw new Error("limits route not found");
  }
  return route;
};

function limitsContext(query: Record<string, string> = {}): ServerContext {
  return {
    requestId: `req-${Math.random().toString(36).slice(2)}`,
    method: "GET",
    path: "/limits",
    headers: {},
    query,
    params: {},
    timestamp: Date.now(),
    metadata: {},
    responseHeaders: {},
    body: undefined,
    neurolink: {},
    toolRegistry: {},
  } as unknown as ServerContext;
}

// ===========================================================================
// 1. usageToQuota (pure)
// ===========================================================================

section("usageToQuota normalization (pure)");

await test("maps the live payload shape into AccountQuota", () => {
  const now = Date.now();
  const quota = usageToQuota(usagePayload(), { now });
  assertNotNull(quota, "a well-formed payload must produce a quota");
  assertEqual(quota.sessionUsed, 0.26, "sessionUsed must be percent / 100");
  assertEqual(quota.weeklyUsed, 0.5, "weeklyUsed must be percent / 100");
  assert(
    quota.sessionResetAt > Math.floor(now / 1000),
    "sessionResetAt must be a future epoch-seconds timestamp",
  );
  assertEqual(
    quota.sessionStatus,
    "allowed",
    "normal severity maps to allowed",
  );
  assertEqual(quota.source, "usage-api", "source must mark the refresh path");
  assertEqual(quota.lastUpdated, now, "lastUpdated must be the capture time");
  assertEqual(quota.windowsUpdatedAt, now, "windowsUpdatedAt must be set");
  assertEqual(
    quota.windows?.length,
    3,
    "every limits[] entry becomes a window",
  );
});

await test("preserves the model-scoped Fable weekly window", () => {
  const quota = usageToQuota(usagePayload(), { now: Date.now() });
  const scoped = quota?.windows?.find((w) => w.kind === "weekly_scoped");
  assertNotNull(scoped, "the weekly_scoped window must survive normalization");
  assertEqual(scoped.scopeModel, "Fable", "scope model display name must map");
  assertEqual(scoped.group, "weekly", "provider group must pass through");
  assertEqual(scoped.used, 0.49, "scoped percent must convert to fraction");
  assert(scoped.resetsAt > 0, "scoped reset must parse to epoch seconds");
});

await test("preserves unknown kinds, groups, and severities verbatim", () => {
  const quota = usageToQuota(
    usagePayload({
      limits: [
        {
          kind: "monthly_experimental",
          group: "lunar",
          percent: 12,
          severity: "quirky",
          resets_at: new Date(Date.now() + 86400_000).toISOString(),
        },
      ],
    }),
    { now: Date.now() },
  );
  const window = quota?.windows?.[0];
  assertNotNull(window, "an unknown window kind must still be captured");
  assertEqual(window.kind, "monthly_experimental", "kind must be verbatim");
  assertEqual(window.group, "lunar", "group must be verbatim");
  assertEqual(window.severity, "quirky", "severity must be verbatim");
  assertEqual(
    window.status,
    "allowed",
    "an unknown severity must stay allowed (conservative)",
  );
});

await test("derives rejected status from a full window or exhausted severity", () => {
  const fullQuota = usageToQuota(
    usagePayload({
      seven_day: {
        utilization: 100,
        resets_at: new Date(Date.now() + 86400_000).toISOString(),
      },
    }),
    { now: Date.now() },
  );
  assertEqual(
    fullQuota?.weeklyStatus,
    "rejected",
    "a window at 100 percent must derive rejected",
  );

  const severityQuota = usageToQuota(
    usagePayload({
      limits: [
        {
          kind: "session",
          group: "session",
          percent: 40,
          severity: "exceeded",
        },
      ],
      five_hour: null,
      seven_day: null,
    }),
    { now: Date.now() },
  );
  assertEqual(
    severityQuota?.windows?.[0]?.status,
    "rejected",
    "an exhausted severity must derive rejected even below 100 percent",
  );
});

await test("carries fallback/overage entitlement over from the prior snapshot", () => {
  const prior: AccountQuota = {
    sessionUsed: 0.1,
    sessionStatus: "allowed",
    sessionResetAt: 0,
    weeklyUsed: 0.1,
    weeklyStatus: "allowed",
    weeklyResetAt: 0,
    fallbackPercentage: 0.5,
    fallbackStatus: "available",
    upgradePaths: "overage",
    overageStatus: "allowed",
    lastUpdated: Date.now() - 60_000,
  };
  const quota = usageToQuota(usagePayload({ extra_usage: null }), {
    now: Date.now(),
    prior,
  });
  assertEqual(
    quota?.fallbackPercentage,
    0.5,
    "fallbackPercentage must carry over from prior",
  );
  assertEqual(
    quota?.fallbackStatus,
    "available",
    "fallbackStatus must carry over from prior",
  );
  assertEqual(
    quota?.upgradePaths,
    "overage",
    "upgradePaths must carry over from prior",
  );
  assertEqual(
    quota?.overageStatus,
    "allowed",
    "missing extra_usage must fall back to the prior overage status",
  );
});

await test("maps extra_usage.is_enabled onto overageStatus", () => {
  const enabled = usageToQuota(
    usagePayload({ extra_usage: { is_enabled: true } }),
    { now: Date.now() },
  );
  assertEqual(
    enabled?.overageStatus,
    "allowed",
    "enabled extra usage maps to allowed",
  );
  const disabled = usageToQuota(
    usagePayload({ extra_usage: { is_enabled: false } }),
    { now: Date.now() },
  );
  assertEqual(
    disabled?.overageStatus,
    "rejected",
    "disabled extra usage maps to rejected",
  );
});

await test("never fabricates unifiedStatus from the usage payload", () => {
  const quota = usageToQuota(usagePayload(), { now: Date.now() });
  assertEqual(
    quota?.unifiedStatus,
    undefined,
    "unifiedStatus must stay undefined on usage-derived quotas",
  );
});

await test("falls back to limits[] percents when top-level windows are absent", () => {
  const quota = usageToQuota(
    usagePayload({ five_hour: null, seven_day: null }),
    { now: Date.now() },
  );
  assertEqual(
    quota?.sessionUsed,
    0.26,
    "sessionUsed must fall back to the session limits[] entry",
  );
  assertEqual(
    quota?.weeklyUsed,
    0.5,
    "weeklyUsed must fall back to the weekly_all limits[] entry",
  );
});

await test("returns null for a payload with no recognizable windows", () => {
  const quota = usageToQuota({}, { now: Date.now() });
  assertEqual(quota, null, "an empty payload must produce no quota");
});

await test("preserves prior reset timestamps when the payload omits resets_at", () => {
  const priorSessionReset = Math.floor(Date.now() / 1000) + 7200;
  const priorWeeklyReset = Math.floor(Date.now() / 1000) + 5 * 86400;
  const prior: AccountQuota = {
    sessionUsed: 0.4,
    sessionStatus: "allowed",
    sessionResetAt: priorSessionReset,
    weeklyUsed: 0.4,
    weeklyStatus: "allowed",
    weeklyResetAt: priorWeeklyReset,
    fallbackPercentage: 0,
    overageStatus: "unknown",
    lastUpdated: Date.now() - 60_000,
  };
  const quota = usageToQuota(
    {
      five_hour: { utilization: 12, resets_at: null },
      seven_day: { utilization: 34, resets_at: null },
    },
    { now: Date.now(), prior },
  );
  assertEqual(
    quota?.sessionResetAt,
    priorSessionReset,
    "a missing session resets_at must keep the prior reset, not become 0",
  );
  assertEqual(
    quota?.weeklyResetAt,
    priorWeeklyReset,
    "a missing weekly resets_at must keep the prior reset, not become 0",
  );
  assertEqual(quota?.sessionUsed, 0.12, "utilization must still update");
});

// ===========================================================================
// 2. fetchAccountUsage (stubbed transport)
// ===========================================================================

section("fetchAccountUsage transport");

await test("fetches the usage endpoint with OAuth headers", async () => {
  let capturedUrl = "";
  let capturedHeaders: Record<string, string> = {};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
    return jsonResponse(usagePayload());
  }) as typeof fetch;
  try {
    const result = await fetchAccountUsage(stubAccount());
    assert(result.ok, "a 200 usage response must produce an ok result");
    assert(
      capturedUrl.includes("/api/oauth/usage"),
      "the request must target the usage endpoint",
    );
    assert(
      (capturedHeaders.authorization ?? "").startsWith("Bearer "),
      "the request must carry a bearer authorization header",
    );
    assert(
      (capturedHeaders["user-agent"] ?? "").startsWith("claude-cli/"),
      "the request must carry the claude-cli user agent",
    );
    assert(
      capturedHeaders["anthropic-beta"] !== undefined,
      "the request must carry the oauth beta header",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("short-circuits api_key accounts without any network call", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return jsonResponse(usagePayload());
  }) as typeof fetch;
  try {
    const result = await fetchAccountUsage(stubAccount({ type: "api_key" }));
    assert(!result.ok, "an api_key account must not produce a usage result");
    assert(
      !result.ok && result.reason === "not_oauth",
      "the failure reason must be not_oauth",
    );
    assertEqual(fetchCalls, 0, "no upstream request may be made");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test("classifies upstream failure statuses", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => jsonResponse({}, 500)) as typeof fetch;
    const serverError = await fetchAccountUsage(stubAccount());
    assert(
      !serverError.ok && serverError.reason === "http",
      "a 5xx must classify as http",
    );

    globalThis.fetch = (async () => jsonResponse({}, 403)) as typeof fetch;
    const forbidden = await fetchAccountUsage(stubAccount());
    assert(
      !forbidden.ok && forbidden.reason === "auth",
      "a 403 must classify as auth",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ===========================================================================
// 3. refreshAccountLimits (proxy write-through)
// ===========================================================================

section("GET /limits refresh flow");

await test("writes fresh windows through runtime state and disk", async () => {
  let usageFetches = 0;
  await withIsolatedRefreshEnv(
    {
      fetchImpl: (url) => {
        if (url.includes("/api/oauth/usage")) {
          usageFetches += 1;
          return jsonResponse(usagePayload());
        }
        throw new Error(`unexpected fetch in hermetic test: ${url}`);
      },
    },
    async (accountKeys) => {
      const response = await __testHooks.refreshAccountLimits({});
      assertEqual(response.snapshot, false, "a default refresh must be fresh");
      assertEqual(
        response.results.length,
        1,
        "one stubbed account must produce one result",
      );
      const result = response.results[0];
      assertEqual(result.status, "refreshed", "the account must refresh");
      assertEqual(
        result.quota?.source,
        "usage-api",
        "the refreshed quota must carry usage-api provenance",
      );
      assertEqual(
        result.quota?.windows?.length,
        3,
        "the refreshed quota must carry the dynamic windows",
      );
      assertEqual(usageFetches, 1, "exactly one upstream usage fetch");

      const runtime = __testHooks.getAccountRuntimeState(accountKeys[0]);
      assertEqual(
        runtime?.quota?.source,
        "usage-api",
        "runtime state must hold the refreshed quota",
      );

      await flushAccountQuotaStateForTests();
      const persisted = await loadAccountQuotas();
      const label = accountKeys[0].split(":")[1];
      assertEqual(
        persisted[label]?.windows?.length,
        3,
        "the disk snapshot must retain the dynamic windows",
      );
    },
  );
});

await test("parks the account when a refreshed weekly window is exhausted", async () => {
  await withIsolatedRefreshEnv(
    {
      fetchImpl: () =>
        jsonResponse(
          usagePayload({
            seven_day: {
              utilization: 100,
              resets_at: new Date(Date.now() + 2 * 86400_000).toISOString(),
            },
          }),
        ),
    },
    async (accountKeys) => {
      const response = await __testHooks.refreshAccountLimits({});
      assertEqual(
        response.results[0]?.status,
        "refreshed",
        "the refresh itself must succeed",
      );
      const runtime = __testHooks.getAccountRuntimeState(accountKeys[0]);
      assert(
        (runtime?.coolingUntil ?? 0) > Date.now(),
        "an exhausted weekly window must park the account until reset",
      );
      assertEqual(
        runtime?.coolingReason,
        "weekly",
        "the cooldown reason must name the weekly window",
      );
      assertEqual(
        response.results[0]?.coolingUntil,
        runtime?.coolingUntil,
        "the endpoint result must surface the cooldown",
      );
    },
  );
});

await test("a later allowed reading never shortens an active cooldown", async () => {
  let weeklyUtilization = 100;
  await withIsolatedRefreshEnv(
    {
      fetchImpl: () =>
        jsonResponse(
          usagePayload({
            seven_day: {
              utilization: weeklyUtilization,
              resets_at: new Date(Date.now() + 2 * 86400_000).toISOString(),
            },
          }),
        ),
    },
    async (accountKeys) => {
      await __testHooks.refreshAccountLimits({});
      const parked = __testHooks.getAccountRuntimeState(accountKeys[0]);
      const parkedUntil = parked?.coolingUntil ?? 0;
      assert(parkedUntil > Date.now(), "the first refresh must park");

      // Second refresh (post-throttle) reports the window healthy again.
      weeklyUtilization = 10;
      __testHooks.clearLimitsRefreshStateForTests();
      await __testHooks.refreshAccountLimits({});
      const after = __testHooks.getAccountRuntimeState(accountKeys[0]);
      assert(
        (after?.coolingUntil ?? 0) >= parkedUntil,
        "an allowed reading must not shorten the active weekly cooldown",
      );
    },
  );
});

await test("throttles repeat refreshes inside the minimum interval", async () => {
  let usageFetches = 0;
  await withIsolatedRefreshEnv(
    {
      fetchImpl: () => {
        usageFetches += 1;
        return jsonResponse(usagePayload());
      },
    },
    async () => {
      const first = await __testHooks.refreshAccountLimits({});
      assertEqual(first.results[0]?.status, "refreshed", "first call fetches");
      const second = await __testHooks.refreshAccountLimits({});
      assertEqual(
        second.results[0]?.status,
        "throttled",
        "an immediate second call must throttle",
      );
      assertEqual(usageFetches, 1, "the throttled call must not refetch");
      assertEqual(
        second.results[0]?.quota?.source,
        "usage-api",
        "the throttled result must still return the fresh reading",
      );
    },
  );
});

await test("snapshot mode performs zero upstream fetches", async () => {
  let usageFetches = 0;
  await withIsolatedRefreshEnv(
    {
      fetchImpl: () => {
        usageFetches += 1;
        return jsonResponse(usagePayload());
      },
    },
    async () => {
      const response = await __testHooks.refreshAccountLimits({
        snapshotOnly: true,
      });
      assertEqual(response.snapshot, true, "snapshot mode must be marked");
      assertEqual(
        response.results[0]?.status,
        "snapshot",
        "results must be labelled snapshot",
      );
      assertEqual(usageFetches, 0, "snapshot mode must not contact upstream");
    },
  );
});

await test("skips api_key accounts without contacting upstream", async () => {
  let usageFetches = 0;
  await withIsolatedRefreshEnv(
    {
      tokenType: "ApiKey",
      fetchImpl: () => {
        usageFetches += 1;
        return jsonResponse(usagePayload());
      },
    },
    async () => {
      const response = await __testHooks.refreshAccountLimits({});
      assertEqual(
        response.results[0]?.status,
        "skipped_api_key",
        "api_key accounts must be skipped",
      );
      assertEqual(usageFetches, 0, "no upstream fetch for api_key accounts");
    },
  );
});

await test("keeps the full label for accounts whose label contains a colon", async () => {
  await withIsolatedRefreshEnv(
    {
      accountLabels: ["team:alpha"],
      fetchImpl: () => jsonResponse(usagePayload()),
    },
    async () => {
      const response = await __testHooks.refreshAccountLimits({});
      assertEqual(
        response.results[0]?.account,
        "team:alpha",
        "the full suffix after the provider prefix must be the quota key",
      );
      assertEqual(
        response.results[0]?.status,
        "refreshed",
        "the colon-labelled account must refresh normally",
      );
      await flushAccountQuotaStateForTests();
      const persisted = await loadAccountQuotas();
      assert(
        persisted["team:alpha"] !== undefined,
        "the disk snapshot must be keyed by the full label",
      );
    },
  );
});

await test("surfaces per-account fetch failures without failing the sweep", async () => {
  await withIsolatedRefreshEnv(
    {
      fetchImpl: () => jsonResponse({}, 500),
    },
    async () => {
      const response = await __testHooks.refreshAccountLimits({});
      assertEqual(
        response.results[0]?.status,
        "error",
        "an upstream failure must mark the account result as error",
      );
      assert(
        typeof response.results[0]?.error === "string",
        "the error text must be included",
      );
    },
  );
});

await test("route handler single-flights concurrent full refreshes", async () => {
  let usageFetches = 0;
  await withIsolatedRefreshEnv(
    {
      fetchImpl: async () => {
        usageFetches += 1;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return jsonResponse(usagePayload());
      },
    },
    async () => {
      const route = findLimitsRoute();
      const [first, second] = (await Promise.all([
        route.handler(limitsContext()),
        route.handler(limitsContext()),
      ])) as [ProxyLimitsRefreshResponse, ProxyLimitsRefreshResponse];
      assertEqual(
        first.results[0]?.status,
        "refreshed",
        "the first concurrent caller must get the fresh sweep",
      );
      assertEqual(
        second.results[0]?.status,
        "refreshed",
        "the second concurrent caller must share the same sweep",
      );
      assertEqual(usageFetches, 1, "concurrent callers share one fetch");
    },
  );
});

// ===========================================================================
// 4. saveAccountQuota windows preservation
// ===========================================================================

section("saveAccountQuota windows preservation");

await test("a header-sourced save never erases refresh-sourced windows", async () => {
  const dir = await mkdtemp(join(tmpdir(), "neurolink-usage-merge-"));
  initAccountQuota(join(dir, "quotas.json"));
  try {
    const label = "merge-test@example.com";
    const refreshed = usageToQuota(usagePayload(), { now: Date.now() });
    assertNotNull(refreshed, "fixture payload must normalize");
    await saveAccountQuota(label, refreshed);

    const headerSourced: AccountQuota = {
      sessionUsed: 0.6,
      sessionStatus: "allowed",
      sessionResetAt: Math.floor(Date.now() / 1000) + 3600,
      weeklyUsed: 0.7,
      weeklyStatus: "allowed",
      weeklyResetAt: Math.floor(Date.now() / 1000) + 86400,
      fallbackPercentage: 0.5,
      overageStatus: "rejected",
      lastUpdated: Date.now(),
      source: "headers",
    };
    await saveAccountQuota(label, headerSourced);
    await flushAccountQuotaStateForTests();

    const persisted = await loadAccountQuotas();
    assertEqual(
      persisted[label]?.sessionUsed,
      0.6,
      "legacy fields must take the newer header values",
    );
    assertEqual(
      persisted[label]?.windows?.length,
      3,
      "the dynamic windows from the earlier refresh must survive",
    );
    assertEqual(
      persisted[label]?.windowsUpdatedAt,
      refreshed.windowsUpdatedAt,
      "windowsUpdatedAt must carry over with the windows",
    );
  } finally {
    await flushAccountQuotaStateForTests().catch(() => undefined);
    initAccountQuota(join(dir, "quotas.json"));
    await rm(dir, { recursive: true, force: true });
  }
});

// ===========================================================================
// 5. CLI window-row formatter
// ===========================================================================

section("CLI window rows");

await test("renders scoped windows and skips the column duplicates", () => {
  const quota = usageToQuota(usagePayload(), { now: Date.now() });
  assertNotNull(quota, "fixture payload must normalize");
  const rows = formatQuotaWindowRows(quota).map(stripAnsi);
  assertEqual(
    rows.length,
    1,
    "session and weekly_all must be skipped; only scoped windows render",
  );
  assert(
    rows[0].includes("weekly (Fable):"),
    "the scoped row must be labelled with group and model name",
  );
  assert(
    rows[0].includes("51% left"),
    "the scoped row must show remaining percent",
  );
  assert(rows[0].includes("resets "), "the scoped row must show the reset");
});

await test("renders nothing for a quota without windows", () => {
  const quota: AccountQuota = {
    sessionUsed: 0.2,
    sessionStatus: "allowed",
    sessionResetAt: 0,
    weeklyUsed: 0.2,
    weeklyStatus: "allowed",
    weeklyResetAt: 0,
    fallbackPercentage: 0,
    overageStatus: "unknown",
    lastUpdated: Date.now(),
  };
  assertEqual(
    formatQuotaWindowRows(quota).length,
    0,
    "a header-only quota has no extra rows",
  );
});

await runSuite();
