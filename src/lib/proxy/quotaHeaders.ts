/**
 * Proxy response quota headers.
 *
 * The proxy already knows, per request, exactly how much subscription capacity
 * the serving account has left — it parses Anthropic's `anthropic-ratelimit-*`
 * headers to route on them (see `accountQuota.ts`). Historically none of that
 * reached the client: only the SSE path forwarded a small legacy allowlist, and
 * every JSON/error path dropped headers entirely.
 *
 * This module turns that state into response headers in two layers:
 *
 * 1. **Verbatim passthrough** of Anthropic's own `anthropic-ratelimit-*` and
 *    `retry-after` headers. This is the load-bearing part: a proxied response
 *    then looks byte-identical to a direct one, so a consumer needs exactly one
 *    parser for both.
 * 2. **`x-neurolink-*`** for what only the proxy can know — which account
 *    served the request, pool headroom, whether the numbers are live or stale,
 *    and the derived "how much is left" percentages.
 *
 * Pure CPU, no I/O — safe on the hot path and directly unit-testable.
 *
 * @module proxy/quotaHeaders
 */

import type { AccountQuota, ProxyQuotaHeaderContext } from "../types/index.js";

/** Upstream headers forwarded to the client untouched. */
const UPSTREAM_PREFIX = "anthropic-ratelimit-";
const UPSTREAM_EXTRA_HEADERS = ["retry-after"];

/**
 * A value beyond ~year 2100 expressed in seconds is already milliseconds —
 * same heuristic the cooldown planner uses, kept in sync deliberately so
 * "resets in" and the actual cooldown never disagree.
 */
const EPOCH_SECONDS_CEILING = 4_102_444_800;

/**
 * Strip anything that cannot legally appear in a header value.
 *
 * Account labels originate from user email addresses, so this is not
 * theoretical: a CR/LF in a label would let a crafted account name inject
 * additional response headers. Non-ASCII is dropped rather than encoded —
 * these are diagnostic values, not content.
 */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "").trim();
}

/** Epoch seconds (or ms) → seconds from now, floored at 0. Undefined when the
 *  timestamp is absent, zero, or already in the past. */
function secondsUntil(
  resetEpoch: number | undefined,
  now: number,
): number | undefined {
  if (!resetEpoch || resetEpoch <= 0) {
    return undefined;
  }
  const ms =
    resetEpoch > EPOCH_SECONDS_CEILING ? resetEpoch : resetEpoch * 1000;
  if (ms <= now) {
    return undefined;
  }
  return Math.round((ms - now) / 1000);
}

/**
 * Convert a 0.0-1.0 utilization fraction into a whole-percent "left" figure.
 *
 * Anthropic publishes utilization (used), never remaining, for subscription
 * windows — there is no absolute message or token count to report, so the
 * honest derived form is a percentage. Clamped because a utilization above 1.0
 * (overage) would otherwise produce a negative "left".
 */
export function utilizationToLeftPct(used: number): number {
  if (!Number.isFinite(used)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((1 - used) * 100)));
}

/**
 * Copy Anthropic's rate-limit headers verbatim from an upstream response.
 *
 * Covers both header families: the unified subscription windows
 * (`unified-5h-*`, `unified-7d-*`) and the legacy per-tier counters
 * (`requests-remaining`, `tokens-remaining`, ...) that API-key accounts get.
 * Which family is present depends on the serving account type, which is why
 * `x-neurolink-account-type` accompanies them.
 */
export function pickUpstreamRateLimitHeaders(
  headers: Headers | Record<string, string>,
): Record<string, string> {
  const picked: Record<string, string> = {};
  const consider = (key: string, value: string): void => {
    const lower = key.toLowerCase();
    if (
      lower.startsWith(UPSTREAM_PREFIX) ||
      UPSTREAM_EXTRA_HEADERS.includes(lower)
    ) {
      const clean = sanitizeHeaderValue(value);
      if (clean) {
        picked[lower] = clean;
      }
    }
  };

  if (typeof (headers as Headers).forEach === "function") {
    (headers as Headers).forEach((value, key) => consider(key, value));
    return picked;
  }
  for (const [key, value] of Object.entries(
    headers as Record<string, string>,
  )) {
    if (typeof value === "string") {
      consider(key, value);
    }
  }
  return picked;
}

/**
 * Build the `x-neurolink-*` half of the contract from proxy-side state.
 *
 * Always emits `x-neurolink-quota-source` — even when it is "none". A consumer
 * that sees quota numbers with no provenance cannot tell a fresh reading from a
 * snapshot carried over from a previous request, and would happily log stale
 * capacity as current.
 */
export function buildQuotaResponseHeaders(
  context: ProxyQuotaHeaderContext,
  now: number = Date.now(),
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-neurolink-quota-source": context.source,
  };

  const set = (name: string, value: string | number | undefined): void => {
    if (value === undefined || value === null) {
      return;
    }
    const clean = sanitizeHeaderValue(String(value));
    if (clean) {
      headers[name] = clean;
    }
  };

  set("x-neurolink-account", context.accountLabel);
  set("x-neurolink-account-type", context.accountType);
  set("x-neurolink-served-by", context.servedBy);
  set("x-neurolink-attempt", context.attempt);
  set("x-neurolink-account-cooling-until", context.coolingUntil);
  set("x-neurolink-account-cooling-reason", context.coolingReason);

  if (context.pool) {
    set("x-neurolink-pool-available", context.pool.available);
    set("x-neurolink-pool-cooling", context.pool.cooling);
    set("x-neurolink-pool-best-session-left", context.pool.bestSessionLeftPct);
  }

  const quota = context.quota;
  if (quota && context.source !== "none") {
    set(
      "x-neurolink-quota-session-left-pct",
      utilizationToLeftPct(quota.sessionUsed),
    );
    set("x-neurolink-quota-session-status", quota.sessionStatus);
    set(
      "x-neurolink-quota-session-resets-in",
      secondsUntil(quota.sessionResetAt, now),
    );
    set(
      "x-neurolink-quota-weekly-left-pct",
      utilizationToLeftPct(quota.weeklyUsed),
    );
    set("x-neurolink-quota-weekly-status", quota.weeklyStatus);
    set(
      "x-neurolink-quota-weekly-resets-in",
      secondsUntil(quota.weeklyResetAt, now),
    );
    set("x-neurolink-quota-unified-status", quota.unifiedStatus);
    set("x-neurolink-quota-overage-status", quota.overageStatus);
    set(
      "x-neurolink-quota-fallback-pct",
      Math.round((quota.fallbackPercentage ?? 0) * 100),
    );
    set("x-neurolink-quota-updated-at", quota.lastUpdated);
  }

  return headers;
}

/**
 * Full response header set: upstream verbatim + proxy-derived.
 *
 * Upstream headers are applied first so a `x-neurolink-*` key can never be
 * shadowed by an upstream one (they share no names today, but the ordering
 * makes the precedence explicit rather than incidental).
 */
export function buildProxyLimitHeaders(args: {
  upstreamHeaders?: Headers | Record<string, string>;
  context: ProxyQuotaHeaderContext;
  now?: number;
}): Record<string, string> {
  return {
    ...(args.upstreamHeaders
      ? pickUpstreamRateLimitHeaders(args.upstreamHeaders)
      : {}),
    ...buildQuotaResponseHeaders(args.context, args.now),
  };
}

/** Compute pool headroom from the runtime account states backing a request. */
export function summarizePoolHeadroom(
  entries: ReadonlyArray<{
    coolingUntil?: number;
    quota?: AccountQuota;
  }>,
  now: number = Date.now(),
): { available: number; cooling: number; bestSessionLeftPct?: number } {
  let available = 0;
  let cooling = 0;
  let bestSessionLeftPct: number | undefined;

  for (const entry of entries) {
    const isCooling = !!entry.coolingUntil && entry.coolingUntil > now;
    if (isCooling) {
      cooling += 1;
      continue;
    }
    available += 1;
    if (entry.quota) {
      const left = utilizationToLeftPct(entry.quota.sessionUsed);
      if (bestSessionLeftPct === undefined || left > bestSessionLeftPct) {
        bestSessionLeftPct = left;
      }
    }
  }

  return {
    available,
    cooling,
    ...(bestSessionLeftPct !== undefined ? { bestSessionLeftPct } : {}),
  };
}
