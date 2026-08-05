/**
 * Anthropic rate-limit / quota header capture.
 *
 * Anthropic returns limit state on the response headers of every request:
 * `anthropic-ratelimit-unified-*` for subscription (OAuth) accounts,
 * `anthropic-ratelimit-{requests,tokens}-*` for API-key accounts. The NeuroLink
 * Claude proxy forwards those verbatim and adds `x-neurolink-*` for what only
 * it knows (which account served the request, pool headroom, whether the
 * numbers are live or a carried-over snapshot).
 *
 * None of it used to reach the SDK: `doGenerate` returned a hardcoded empty
 * header bag and the streaming loop never looked. The capture point here is the
 * `fetch` the Anthropic SDK is constructed with — it is invoked exactly once
 * per HTTP request on BOTH the streaming and non-streaming paths, so a single
 * wrapper covers everything without touching the SSE loop or switching the
 * non-streaming call to `.withResponse()`.
 *
 * Scoping is per-request via AsyncLocalStorage rather than a field on the
 * provider: a provider instance is shared across concurrent calls, so an
 * instance field would race and attribute one request's limits to another.
 *
 * @module providers/anthropic/rateLimitCapture
 */

import { AsyncLocalStorage } from "async_hooks";
import { trace } from "@opentelemetry/api";
import type {
  AnthropicRateLimitInfo,
  ClaudeLimitCaptureSlot,
  ClaudeLimitSnapshot,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/** Below this much session headroom (percent), log at WARN instead of INFO. */
const LOW_HEADROOM_WARN_PCT = 15;

const limitCaptureStorage = new AsyncLocalStorage<ClaudeLimitCaptureSlot>();

function headerOf(headers: Headers, name: string): string | undefined {
  const value = headers.get(name);
  return value === null || value === "" ? undefined : value;
}

function numberOf(headers: Headers, name: string): number | undefined {
  const raw = headerOf(headers, name);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function intOf(headers: Headers, name: string): number | undefined {
  const raw = headerOf(headers, name);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** 0.0-1.0 utilization → whole-percent remaining, clamped to [0, 100]. */
function leftPctFrom(utilization: number | undefined): number | undefined {
  if (utilization === undefined) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round((1 - utilization) * 100)));
}

/**
 * Parse both Anthropic rate-limit header families into a single shape.
 *
 * Which family is present depends on the account type, so every field is
 * optional and absence is normal rather than an error.
 */
export function parseAnthropicLimitHeaders(
  headers: Headers,
): AnthropicRateLimitInfo {
  const sessionUtilization = numberOf(
    headers,
    "anthropic-ratelimit-unified-5h-utilization",
  );
  const weeklyUtilization = numberOf(
    headers,
    "anthropic-ratelimit-unified-7d-utilization",
  );

  const info: AnthropicRateLimitInfo = {};

  // Legacy per-tier counters — these ARE absolute remaining counts.
  const requestsLimit = intOf(headers, "anthropic-ratelimit-requests-limit");
  const requestsRemaining = intOf(
    headers,
    "anthropic-ratelimit-requests-remaining",
  );
  const requestsReset = headerOf(headers, "anthropic-ratelimit-requests-reset");
  const tokensLimit = intOf(headers, "anthropic-ratelimit-tokens-limit");
  const tokensRemaining = intOf(
    headers,
    "anthropic-ratelimit-tokens-remaining",
  );
  const tokensReset = headerOf(headers, "anthropic-ratelimit-tokens-reset");
  const retryAfter = intOf(headers, "retry-after");

  if (requestsLimit !== undefined) {
    info.requestsLimit = requestsLimit;
  }
  if (requestsRemaining !== undefined) {
    info.requestsRemaining = requestsRemaining;
  }
  if (requestsReset !== undefined) {
    info.requestsReset = requestsReset;
  }
  if (tokensLimit !== undefined) {
    info.tokensLimit = tokensLimit;
  }
  if (tokensRemaining !== undefined) {
    info.tokensRemaining = tokensRemaining;
  }
  if (tokensReset !== undefined) {
    info.tokensReset = tokensReset;
  }
  if (retryAfter !== undefined) {
    info.retryAfter = retryAfter;
  }

  // Unified subscription windows — utilization only, no absolute remaining.
  if (sessionUtilization !== undefined) {
    info.sessionUtilization = sessionUtilization;
    const left = leftPctFrom(sessionUtilization);
    if (left !== undefined) {
      info.sessionLeftPct = left;
    }
  }
  const sessionStatus = headerOf(
    headers,
    "anthropic-ratelimit-unified-5h-status",
  );
  if (sessionStatus !== undefined) {
    info.sessionStatus = sessionStatus;
  }
  const sessionResetAt = intOf(headers, "anthropic-ratelimit-unified-5h-reset");
  if (sessionResetAt !== undefined) {
    info.sessionResetAt = sessionResetAt;
  }

  if (weeklyUtilization !== undefined) {
    info.weeklyUtilization = weeklyUtilization;
    const left = leftPctFrom(weeklyUtilization);
    if (left !== undefined) {
      info.weeklyLeftPct = left;
    }
  }
  const weeklyStatus = headerOf(
    headers,
    "anthropic-ratelimit-unified-7d-status",
  );
  if (weeklyStatus !== undefined) {
    info.weeklyStatus = weeklyStatus;
  }
  const weeklyResetAt = intOf(headers, "anthropic-ratelimit-unified-7d-reset");
  if (weeklyResetAt !== undefined) {
    info.weeklyResetAt = weeklyResetAt;
  }

  const unifiedStatus = headerOf(headers, "anthropic-ratelimit-unified-status");
  if (unifiedStatus !== undefined) {
    info.unifiedStatus = unifiedStatus;
  }
  const overageStatus = headerOf(
    headers,
    "anthropic-ratelimit-unified-overage-status",
  );
  if (overageStatus !== undefined) {
    info.overageStatus = overageStatus;
  }

  return info;
}

/** True when a parsed info object carries no usable signal at all. */
function isEmptyRateLimitInfo(info: AnthropicRateLimitInfo): boolean {
  return Object.keys(info).length === 0;
}

/**
 * Build a snapshot from a response, or undefined when the response carries
 * neither Anthropic rate-limit headers nor NeuroLink proxy metadata.
 */
export function buildLimitSnapshot(
  headers: Headers,
  status: number,
  now: number = Date.now(),
): ClaudeLimitSnapshot | undefined {
  const rateLimit = parseAnthropicLimitHeaders(headers);
  const quotaSource = headerOf(headers, "x-neurolink-quota-source");
  const account = headerOf(headers, "x-neurolink-account");
  const accountType = headerOf(headers, "x-neurolink-account-type");
  const servedBy = headerOf(headers, "x-neurolink-served-by");
  const poolAvailable = intOf(headers, "x-neurolink-pool-available");
  const poolCooling = intOf(headers, "x-neurolink-pool-cooling");
  const poolBest = intOf(headers, "x-neurolink-pool-best-session-left");
  const coolingUntil = intOf(headers, "x-neurolink-account-cooling-until");
  const coolingReason = headerOf(headers, "x-neurolink-account-cooling-reason");
  const requestId = headerOf(headers, "x-request-id");

  const hasProxyMetadata =
    quotaSource !== undefined ||
    account !== undefined ||
    servedBy !== undefined;
  if (isEmptyRateLimitInfo(rateLimit) && !hasProxyMetadata) {
    return undefined;
  }

  const pool =
    poolAvailable !== undefined ||
    poolCooling !== undefined ||
    poolBest !== undefined
      ? {
          ...(poolAvailable !== undefined ? { available: poolAvailable } : {}),
          ...(poolCooling !== undefined ? { cooling: poolCooling } : {}),
          ...(poolBest !== undefined ? { bestSessionLeftPct: poolBest } : {}),
        }
      : undefined;

  return {
    rateLimit,
    ...(quotaSource === "live" ||
    quotaSource === "snapshot" ||
    quotaSource === "none"
      ? { quotaSource }
      : {}),
    ...(account !== undefined ? { account } : {}),
    ...(accountType !== undefined ? { accountType } : {}),
    ...(servedBy !== undefined ? { servedBy } : {}),
    ...(coolingUntil !== undefined
      ? { accountCoolingUntil: coolingUntil }
      : {}),
    ...(coolingReason !== undefined
      ? { accountCoolingReason: coolingReason }
      : {}),
    ...(pool ? { pool } : {}),
    ...(requestId !== undefined ? { requestId } : {}),
    status,
    capturedAt: now,
  };
}

/**
 * Wrap a fetch so every response's limit headers are captured into the
 * enclosing `withLimitCapture` scope. A no-op outside such a scope.
 *
 * Capture never alters the response and never throws — a parsing failure must
 * not be able to break a request that the provider would otherwise complete.
 */
export function wrapFetchWithLimitCapture(inner: typeof fetch): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await inner(input, init);
    const slot = limitCaptureStorage.getStore();
    if (!slot) {
      return response;
    }
    try {
      const raw: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        raw[key] = value;
      });
      slot.headers = raw;
      const snapshot = buildLimitSnapshot(response.headers, response.status);
      if (snapshot) {
        // Last write wins: a retried or multi-step call reports the most
        // recent upstream state, which is the one a caller acts on.
        slot.snapshot = snapshot;
      }
    } catch {
      // Diagnostics only — never disturb the response.
    }
    return response;
  };
}

/**
 * Run `body` in a capture scope and return its result alongside whatever limit
 * snapshot the underlying HTTP request(s) produced.
 */
export async function withLimitCapture<T>(
  body: () => Promise<T>,
): Promise<{ result: T; snapshot?: ClaudeLimitSnapshot }> {
  const slot: ClaudeLimitCaptureSlot = {};
  const result = await limitCaptureStorage.run(slot, body);
  return {
    result,
    ...(slot.snapshot ? { snapshot: slot.snapshot } : {}),
  };
}

/**
 * Current scope's snapshot, if any. Lets a long-running loop (the streaming
 * path) read limits mid-flight without unwinding the scope.
 */
export function getCapturedLimitSnapshot(): ClaudeLimitSnapshot | undefined {
  return limitCaptureStorage.getStore()?.snapshot;
}

/** Raw headers of the most recent captured response in this scope. */
export function getCapturedResponseHeaders():
  | Record<string, string>
  | undefined {
  return limitCaptureStorage.getStore()?.headers;
}

/** Enter a capture scope without wrapping a single call — for streaming, where
 *  the scope must outlive the function that opened it. */
export function runInLimitCaptureScope<T>(body: () => T): T {
  return limitCaptureStorage.run({}, body);
}

/**
 * Attach limit state to the currently active OTel span.
 *
 * Uses the active span rather than threading one down from the generation
 * layer: that layer is provider-agnostic and should not learn about Anthropic
 * quota headers just to record them. The active span during a turn is the one
 * already carrying `gen_ai.usage.*` and `neurolink.cost`, so "what did this
 * cost" and "how much is left" answer from the same trace.
 */
export function setLimitSpanAttributes(snapshot: ClaudeLimitSnapshot): void {
  const span = trace.getActiveSpan();
  if (!span) {
    return;
  }
  const { rateLimit } = snapshot;
  const attrs: Array<[string, string | number | undefined]> = [
    ["neurolink.claude.quota.session_left_pct", rateLimit.sessionLeftPct],
    ["neurolink.claude.quota.weekly_left_pct", rateLimit.weeklyLeftPct],
    ["neurolink.claude.quota.requests_remaining", rateLimit.requestsRemaining],
    ["neurolink.claude.quota.tokens_remaining", rateLimit.tokensRemaining],
    ["neurolink.claude.quota.source", snapshot.quotaSource],
    ["neurolink.claude.account", snapshot.account],
    ["neurolink.claude.served_by", snapshot.servedBy],
    ["neurolink.claude.pool.available", snapshot.pool?.available],
    [
      "neurolink.claude.pool.best_session_left_pct",
      snapshot.pool?.bestSessionLeftPct,
    ],
  ];
  for (const [key, value] of attrs) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }
}

/** Seconds-from-now for an epoch-seconds reset, or undefined if absent/past. */
function resetsInSeconds(
  resetAt: number | undefined,
  now: number,
): number | undefined {
  if (!resetAt || resetAt <= 0) {
    return undefined;
  }
  // Tolerate a value already expressed in ms (year 2100 in seconds).
  const ms = resetAt > 4_102_444_800 ? resetAt : resetAt * 1000;
  return ms > now ? Math.round((ms - now) / 1000) : undefined;
}

/**
 * Emit one structured line per request describing remaining capacity.
 *
 * Leads with headroom ("how much is left") because that is the figure an
 * operator acts on; the raw utilization stays available on the snapshot for
 * anything computing against it. Escalates to WARN when the session window is
 * nearly spent or the provider has already flagged the account as
 * throttled/rejected.
 */
export function logClaudeLimitSnapshot(
  snapshot: ClaudeLimitSnapshot,
  model?: string,
  now: number = Date.now(),
): void {
  const { rateLimit } = snapshot;

  // A fallback provider served this — there is no Anthropic capacity to report.
  if (snapshot.quotaSource === "none" && snapshot.servedBy) {
    logger.debug("[Anthropic] request served without account quota", {
      servedBy: snapshot.servedBy,
      ...(model ? { model } : {}),
    });
    return;
  }

  const details: Record<string, unknown> = {
    ...(model ? { model } : {}),
    ...(snapshot.account ? { account: snapshot.account } : {}),
    ...(snapshot.accountType ? { accountType: snapshot.accountType } : {}),
    ...(snapshot.servedBy ? { servedBy: snapshot.servedBy } : {}),
    ...(snapshot.quotaSource ? { quotaSource: snapshot.quotaSource } : {}),
  };

  if (rateLimit.sessionLeftPct !== undefined) {
    details.sessionLeftPct = rateLimit.sessionLeftPct;
    const resets = resetsInSeconds(rateLimit.sessionResetAt, now);
    if (resets !== undefined) {
      details.sessionResetsInSec = resets;
    }
  }
  if (rateLimit.weeklyLeftPct !== undefined) {
    details.weeklyLeftPct = rateLimit.weeklyLeftPct;
    const resets = resetsInSeconds(rateLimit.weeklyResetAt, now);
    if (resets !== undefined) {
      details.weeklyResetsInSec = resets;
    }
  }
  // API-key accounts report absolute remaining rather than a percentage.
  if (rateLimit.requestsRemaining !== undefined) {
    details.requestsRemaining = rateLimit.requestsRemaining;
  }
  if (rateLimit.tokensRemaining !== undefined) {
    details.tokensRemaining = rateLimit.tokensRemaining;
  }
  if (rateLimit.retryAfter !== undefined) {
    details.retryAfterSec = rateLimit.retryAfter;
  }
  if (snapshot.pool) {
    details.pool = snapshot.pool;
  }

  if (Object.keys(details).length === 0) {
    return;
  }

  const status = (
    rateLimit.unifiedStatus ??
    rateLimit.sessionStatus ??
    ""
  ).toLowerCase();
  const lowHeadroom =
    rateLimit.sessionLeftPct !== undefined &&
    rateLimit.sessionLeftPct <= LOW_HEADROOM_WARN_PCT;
  const flagged = status === "throttled" || status === "rejected";

  if (lowHeadroom || flagged) {
    // `always`, not `warn`: this logger suppresses everything below `error`
    // unless debug mode is on, and "you are about to run out of capacity" is
    // precisely the thing an operator must see during a normal run. The
    // routine per-request line below stays debug-gated so this stays rare
    // enough to mean something.
    logger.always(
      `[Anthropic] account limits running low — ${JSON.stringify({
        ...details,
        ...(status ? { status } : {}),
      })}`,
    );
    return;
  }
  logger.info("[Anthropic] account limits", details);
}
