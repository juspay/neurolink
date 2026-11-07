#!/usr/bin/env tsx
/**
 * Continuous Test Suite — optional quota windows
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * The usage endpoint and the rate-limit headers are provider-controlled wire
 * formats. A payload that omits the 5h (or 7d) window cannot be induced
 * through a live account on demand, so fixed payloads are parsed here and the
 * exact output shape is asserted: which fields exist, which are absent, and
 * what the `/limits` snapshot serializes. `proxyTestIsolation` redirects HOME
 * and blocks every provider host, so nothing here reaches the network or a
 * real credential.
 *
 * Assertion messages never quote a payload (see test/CLAUDE.md).
 *
 * Run: pnpm run test:optional-quota-windows
 */

import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import "./helpers/proxyTestIsolation.js";
import {
  parseQuotaHeaders,
  saveAccountQuota,
} from "../src/lib/proxy/accountQuota.js";
import { __testHooks } from "../src/lib/server/routes/claudeProxyRoutes.js";
import { usageToQuota } from "../src/lib/proxy/accountUsage.js";
import { codexRateLimitsToQuota } from "../src/lib/proxy/codexAccountUsage.js";
import {
  buildQuotaResponseHeaders,
  summarizePoolHeadroom,
} from "../src/lib/proxy/quotaHeaders.js";

const { test, runSuite } = defineSuite("Optional quota windows", {
  offline: true,
  perTestTimeoutMs: 30_000,
});

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const WEEKLY_ONLY = {
  seven_day: { utilization: 40, resets_at: "2026-11-10T00:00:00Z" },
};

function near(actual: number | undefined, expected: number): boolean {
  return actual !== undefined && Math.abs(actual - expected) < 1e-9;
}

// ---------------------------------------------------------------------------
// usageToQuota
// ---------------------------------------------------------------------------

await test("usageToQuota omits session fields when five_hour is absent", () => {
  const quota = usageToQuota(WEEKLY_ONLY, { now: NOW });
  assert(quota !== null, "a weekly-only payload produced no quota");
  assert(near(quota?.weeklyUsed, 0.4), "weekly utilization was not kept");
  assertEqual(quota?.weeklyStatus, "allowed", "weekly status");
  assertEqual(quota?.sessionUsed, undefined, "sessionUsed should be absent");
  assertEqual(
    quota?.sessionStatus,
    undefined,
    "sessionStatus should be absent",
  );
  assertEqual(
    quota?.sessionResetAt,
    undefined,
    "sessionResetAt should be absent",
  );
});

await test("usageToQuota does not resurrect a prior session reading", () => {
  const quota = usageToQuota(
    { seven_day: { utilization: 10, resets_at: null } },
    {
      now: NOW,
      prior: {
        sessionUsed: 0.9,
        sessionStatus: "allowed",
        sessionResetAt: 1,
        fallbackPercentage: 0,
        overageStatus: "unknown",
        lastUpdated: NOW - 1000,
      },
    },
  );
  assertEqual(quota?.sessionUsed, undefined, "prior session reading survived");
});

await test("usageToQuota omits weekly fields when only five_hour is reported", () => {
  const quota = usageToQuota(
    { five_hour: { utilization: 25, resets_at: "2026-11-07T15:00:00Z" } },
    { now: NOW },
  );
  assert(near(quota?.sessionUsed, 0.25), "session utilization was not kept");
  assertEqual(quota?.weeklyUsed, undefined, "weeklyUsed should be absent");
  assertEqual(quota?.weeklyStatus, undefined, "weeklyStatus should be absent");
});

await test("usageToQuota keeps both windows when both are reported", () => {
  const quota = usageToQuota(
    {
      five_hour: { utilization: 25, resets_at: "2026-11-07T15:00:00Z" },
      seven_day: { utilization: 50, resets_at: "2026-11-10T00:00:00Z" },
    },
    { now: NOW },
  );
  assert(near(quota?.sessionUsed, 0.25), "session utilization was lost");
  assert(near(quota?.weeklyUsed, 0.5), "weekly utilization was lost");
});

await test("usageToQuota returns null when no window is reported", () => {
  assertEqual(usageToQuota({}, { now: NOW }), null, "empty payload");
});

// ---------------------------------------------------------------------------
// parseQuotaHeaders
// ---------------------------------------------------------------------------

const HEADER_PREFIX = "anthropic-ratelimit-unified-";

await test("parseQuotaHeaders accepts a response with only the 7d window", () => {
  const quota = parseQuotaHeaders({
    [`${HEADER_PREFIX}7d-utilization`]: "0.3",
    [`${HEADER_PREFIX}7d-status`]: "allowed",
    [`${HEADER_PREFIX}7d-reset`]: "1900000000",
  });
  assert(near(quota?.weeklyUsed, 0.3), "weekly utilization was not parsed");
  assertEqual(quota?.sessionUsed, undefined, "sessionUsed should be absent");
  assertEqual(
    quota?.sessionStatus,
    undefined,
    "sessionStatus should be absent",
  );
});

await test("parseQuotaHeaders returns null when neither window is present", () => {
  assertEqual(parseQuotaHeaders({}), null, "empty headers");
});

// ---------------------------------------------------------------------------
// codexRateLimitsToQuota
// ---------------------------------------------------------------------------

await test("codexRateLimitsToQuota omits weekly fields without a secondary window", () => {
  const quota = codexRateLimitsToQuota(
    { primary: { used_percent: 20, resets_at: 1900000000 } },
    NOW,
  );
  assert(near(quota.sessionUsed, 0.2), "session utilization was not kept");
  assertEqual(quota.weeklyUsed, undefined, "weeklyUsed should be absent");
  assertEqual(quota.weeklyStatus, undefined, "weeklyStatus should be absent");
});

await test("codexRateLimitsToQuota omits both windows when none are reported", () => {
  const quota = codexRateLimitsToQuota({}, NOW);
  assertEqual(quota.sessionUsed, undefined, "sessionUsed should be absent");
  assertEqual(quota.weeklyUsed, undefined, "weeklyUsed should be absent");
});

// ---------------------------------------------------------------------------
// Response headers and pool headroom
// ---------------------------------------------------------------------------

await test("proxy limit headers carry no session entries when 5h is absent", () => {
  const weeklyOnly = usageToQuota(WEEKLY_ONLY, { now: NOW });
  const headers = buildQuotaResponseHeaders(
    { quota: weeklyOnly, source: "live" },
    NOW,
  );
  assertEqual(
    headers["x-neurolink-quota-weekly-left-pct"],
    "60",
    "weekly header",
  );
  const sessionHeaders = Object.keys(headers).filter((name) =>
    name.includes("session"),
  );
  assertEqual(sessionHeaders.length, 0, "session headers were emitted");
});

await test("a 5h-less account does not count toward best session headroom", () => {
  const weeklyOnly = usageToQuota(WEEKLY_ONLY, { now: NOW });
  const summary = summarizePoolHeadroom(
    [{ quota: weeklyOnly ?? undefined }],
    NOW,
  );
  assertEqual(
    summary.bestSessionLeftPct,
    undefined,
    "session headroom was fabricated",
  );
});

// ---------------------------------------------------------------------------
// GET /limits snapshot JSON, in process
// ---------------------------------------------------------------------------

await test("/limits snapshot serializes a weekly-only quota without session keys", async () => {
  const key = "anthropic:optional-window@example.test";
  const quota = usageToQuota(WEEKLY_ONLY, { now: NOW });
  assert(quota !== null, "expected a quota");
  if (!quota) {
    return;
  }
  await saveAccountQuota(key, quota);
  __testHooks.setAccountDirectoryForTests({
    knownKeys: new Set([key]),
    anthropic: [
      {
        key,
        label: "optional-window@example.test",
        token: "t",
        type: "oauth" as const,
      },
    ],
    codex: [],
  });
  try {
    const limits = await __testHooks.refreshAccountLimits({
      snapshotOnly: true,
    });
    const row = limits.results.find((r) => r.key === key);
    const wire = JSON.parse(JSON.stringify(row?.quota)) as Record<
      string,
      unknown
    >;
    assert(near(wire.weeklyUsed as number, 0.4), "weeklyUsed missing on wire");
    const sessionKeys = Object.keys(wire).filter((k) =>
      k.startsWith("session"),
    );
    assertEqual(sessionKeys.length, 0, "session keys were serialized");
  } finally {
    __testHooks.setAccountDirectoryForTests(null);
  }
});

// ---------------------------------------------------------------------------
// Routing evidence
// ---------------------------------------------------------------------------

await test("routing evidence leaves an absent 5h window out", () => {
  const account = {
    key: "anthropic:weekly-only",
    label: "weekly-only",
    token: "t",
    type: "oauth" as const,
  };
  const quota = usageToQuota(WEEKLY_ONLY, { now: NOW });
  assert(quota !== null, "expected a quota");
  if (!quota) {
    return;
  }
  __testHooks.resetAllRuntimeState();
  __testHooks.setAccountRuntimeState(account.key, { quota });
  try {
    const decision = __testHooks.buildQuotaRoutingDecision(
      [account],
      NOW,
      account.key,
      0.9,
      60_000,
    );
    const candidate = decision?.candidates.find(
      (c) => c.account === account.label,
    );
    assert(candidate !== undefined, "no routing candidate was recorded");
    assertEqual(candidate?.sessionUsed, null, "absent window reported usage");
    assertEqual(candidate?.sessionStatus, null, "absent window had a status");
    assert(near(candidate?.weeklyUsed ?? undefined, 0.4), "weekly was lost");
  } finally {
    __testHooks.resetAllRuntimeState();
  }
});

await runSuite();
