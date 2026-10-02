/**
 * Codex (OpenAI ChatGPT) Proxy Routes
 *
 * Exposes `POST /backend-api/codex/responses` — the ChatGPT-backend Responses
 * API endpoint the Codex CLI talks to — and pools it across multiple ChatGPT
 * OAuth accounts, mirroring the Anthropic Claude pool engine.
 *
 * A Codex CLI configured with `model_providers.<name>.base_url` pointing at this
 * proxy sends its own OAuth token; the proxy strips it, selects a pooled
 * `codex:*` account, attaches that account's Bearer + matching chatgpt-account-id,
 * forwards to https://chatgpt.com/backend-api/codex, and relays the SSE stream.
 * On quota exhaustion (429 / usage limit) the account is cooled and the next
 * account is tried — so the user never has to switch accounts by hand.
 *
 * This engine is deliberately leaner than claudeProxyRoutes.ts: it reuses the
 * shared cooldown/quota persistence (keyed by the `codex:` account key so it
 * never collides with anthropic entries) and does pre-commit rotation only, not
 * the full transient-budget / admission machinery.
 */

import { tokenStore } from "../../auth/tokenStore.js";
import {
  CODEX_ORIGINATOR,
  CODEX_MODELS_URL,
  CODEX_RESPONSES_URL,
  CODEX_USER_AGENT,
  codexTokenNeedsRefresh,
  isPermanentCodexRefreshFailure,
  refreshCodexToken,
  resolveCodexAccountId,
} from "../../auth/codexOAuth.js";
import {
  clearAccountCooldown,
  loadAccountCooldowns,
  saveAccountCooldown,
} from "../../proxy/accountCooldown.js";
import {
  loadAccountQuotas,
  saveAccountQuota,
} from "../../proxy/accountQuota.js";
import { createCodexUsageTap } from "../../proxy/codexUsage.js";
import {
  CODEX_ACCOUNT_PREFIX,
  parseCodexRateLimitHeaders,
} from "../../proxy/codexAccountUsage.js";
import { buildClientAttribution } from "../../proxy/clientAttribution.js";
import { getProxyUpstreamFailure } from "../../proxy/proxyFailureDetails.js";
import {
  registerProxyResponseObserver,
  isProxyRequestFinalized,
  registerInternalProxyRequest,
  getProxyBridgeResult,
  releaseProxyRequestAccounting,
} from "../../proxy/proxyActivity.js";
import {
  parseCodexNativeRequest,
  translateCodexRequestToClaude,
  classifyCodexOutboundFailure,
  buildSystemBlocksFromDeveloperMessages,
} from "../../proxy/codexOutboundFallback.js";
import { createAnthropicFallbackStream } from "../../proxy/codexToAnthropicFallback.js";
import { executeVertexAnthropicFallback } from "../../proxy/vertexAnthropicFallback.js";
import {
  assertClaudeSystemPrefixShape,
  assertClaudeMessagesAlternate,
  codexAnthropicAffinityKey,
} from "../../proxy/codexOutboundCache.js";
import { applyClaudeRequestCacheBreakpoints } from "../../utils/anthropicCacheBreakpoints.js";
import {
  prepareProxyRequestContext,
  ProxyContextPreflightError,
} from "../../proxy/proxyContextPreflight.js";
import {
  reserveProxyTokenBudget,
  settleProxyTokenBudget,
  getProxyTokenBudgetError,
  getProxyTokenBudgetSessionKey,
} from "../../proxy/proxyTokenBudget.js";
import { emitProxyOtelEvent } from "../../proxy/otelLogSink.js";
import {
  getRuntimeContextWindow,
  clearRuntimeOutputCeiling,
  registerRuntimeContextWindow,
  registerRuntimeOutputCeiling,
} from "../../constants/contextWindows.js";
import {
  logRequest,
  logRequestAttempt,
  logBodyCapture,
  isProxyBodyCaptureEnabled,
} from "../../proxy/requestLogger.js";
import { createRawStreamCapture } from "../../proxy/rawStreamCapture.js";
import {
  resolveProxyLogTraceContext,
  getProxyRequestTraceContext,
} from "../../proxy/proxyTraceContext.js";
import { isBorrowedRequest } from "../../proxy/shareContext.js";
import { ProxyTracer, recordFallbackAttempt } from "../../proxy/proxyTracer.js";
import { parseRetryAfterMs } from "../../proxy/routingPolicy.js";
import {
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
} from "../../proxy/usageStats.js";
import type {
  AccountQuota,
  ClaudeRequest,
  CodexAttemptLogExtra,
  CodexFinalLogExtra,
  CodexOutboundServedAttribution,
  CodexOutboundFailureInput,
  CodexOutboundFallbackOutcome,
  CodexQuotaError,
  CodexRefreshTokenStore,
  CodexResponseEnvelope,
  CodexResponseStream,
  CodexResponseUsage,
  CodexRuntimeAccount,
  CodexTokenRefresher,
  RateLimitCoolingReason,
  RouteGroup,
  ServerContext,
  ProxyContextEvidence,
  ProxyPreparedContext,
  ProxyRuntimeConfigProvider,
  ProxyTokenBudgetLease,
  UsageContext,
} from "../../types/index.js";
import { raceWithAbort } from "../../utils/async/withTimeout.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { logger } from "../../utils/logger.js";

const CODEX_UPSTREAM_TIMEOUT_MS = 15 * 60 * 1000; // 15 min, matches Claude path
const DEFAULT_TRANSIENT_COOLDOWN_MS = 60_000;
const MAX_TRANSIENT_COOLDOWN_MS = 15 * 60 * 1000;
/** Brief park after a refresh attempt that never reached a verdict. */
const CODEX_AUTH_COOLDOWN_MS = 60_000;
const CODEX_ACCOUNT_TYPE = "codex-oauth";
const CODEX_FALLBACK_METADATA_KEY = "neurolink.codexFallback";

function getCodexTransportErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const directCode = (error as { code?: unknown }).code;
  if (typeof directCode === "string") {
    return directCode;
  }
  const cause = (error as { cause?: unknown }).cause;
  if (!cause || typeof cause !== "object") {
    return undefined;
  }
  const causeCode = (cause as { code?: unknown }).code;
  return typeof causeCode === "string" ? causeCode : undefined;
}

function codexTransportScope(
  error: unknown,
): "shared_provider_transport" | "connection_transport" {
  const code = getCodexTransportErrorCode(error);
  return code === "ENOTFOUND" || code === "EAI_AGAIN"
    ? "shared_provider_transport"
    : "connection_transport";
}

function summarizeCodexUpstreamError(
  errorText: string,
  fallback: string,
): string {
  return sanitizeForLog(errorText).slice(0, 200) || fallback;
}

/**
 * In-flight proactive refreshes, keyed by account.
 *
 * The pool is rebuilt per request with no shared state, so without this every
 * concurrent request for the same account fires its own refresh. OpenAI rotates
 * the refresh token on each call, so those attempts invalidate one another — the
 * losers then see a rejected grant and, via the 401 path, can disable an account
 * that is perfectly healthy.
 */
const codexRefreshInFlight = new Map<
  string,
  Promise<{ accessToken: string; refreshToken: string; expiresAt?: number }>
>();

async function refreshCodexTokenOnceWithDependencies(
  key: string,
  refreshToken: string,
  store: CodexRefreshTokenStore,
  refresh: CodexTokenRefresher,
): Promise<{ accessToken: string; refreshToken: string; expiresAt?: number }> {
  const existing = codexRefreshInFlight.get(key);
  if (existing) {
    return existing;
  }
  const pending = (async () => {
    // Re-read the stored token instead of trusting the caller's snapshot. A
    // request that captured the pool just before a previous refresh completed
    // holds a token that has since been rotated; using it would spend a real
    // attempt on a grant the server has already invalidated.
    const latest = await store.peekTokens(key).catch(() => null);
    const current = latest?.refreshToken ?? refreshToken;
    const refreshed = await refresh(current);
    const resolved = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? current,
      expiresAt:
        refreshed.expiresAt ?? latest?.expiresAt ?? Date.now() + 3_600_000,
    };
    // Hold the single-flight slot through persistence. Releasing it after the
    // OAuth response but before this write lets a third request read the old
    // rotating refresh token, receive an invalid_grant, and disable an account
    // another request has already healed.
    if (latest) {
      await store.saveTokens(key, {
        ...resolved,
        tokenType: "Bearer",
        ...(latest.scope ? { scope: latest.scope } : {}),
      });
    }
    return resolved;
  })().finally(() => {
    codexRefreshInFlight.delete(key);
  });
  codexRefreshInFlight.set(key, pending);
  return pending;
}

/** Refresh an account's token at most once at a time. */
async function refreshCodexTokenOnce(
  key: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt?: number }> {
  return refreshCodexTokenOnceWithDependencies(
    key,
    refreshToken,
    tokenStore,
    refreshCodexToken,
  );
}

// Headers we never forward upstream (hop-by-hop, client creds, or things we
// re-derive). The client's own auth is replaced with the pooled account's.
const BLOCKED_UPSTREAM_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "cookie",
  "proxy-authorization",
  "authorization",
  "x-api-key",
  "chatgpt-account-id",
  "accept-encoding",
]);

/** Build a Codex error body as a Response with the intended status. */
function buildCodexErrorResponse(
  status: number,
  message: string,
  code?: string,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        type: "proxy_error",
        message,
        ...(code ? { code, retryable: false } : {}),
      },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

/**
 * Build a terminal Codex Responses SSE stream for a failure that never reached
 * an upstream request (every pooled account is cooling).
 * A bare non-2xx status with no body reads to the Codex CLI as a dropped
 * connection, so it shows "Reconnecting... waiting for network" forever
 * instead of a real error. Emitting a well-formed `response.failed` event —
 * the same terminal shape the CLI already parses out of a live stream —
 * lets it render the actual failure instead.
 *
 * The code is what the client keys on: `insufficient_quota` tells it the plan
 * is spent, so it is reserved for a pool that is out of quota. Accounts parked
 * by a transient auth failure report `server_error` instead.
 */
function buildCodexPoolCoolingResponse(
  message: string,
  retryAfterSec: number | undefined,
  code: "insufficient_quota" | "server_error",
): Response {
  const payload = {
    type: "response.failed",
    response: {
      error: {
        type: code,
        code,
        message,
      },
    },
  };
  const headers: Record<string, string> = {
    "content-type": "text/event-stream",
  };
  if (retryAfterSec !== undefined) {
    headers["retry-after"] = String(retryAfterSec);
  }
  return new Response(
    `event: response.failed\ndata: ${JSON.stringify(payload)}\n\n`,
    { status: 200, headers },
  );
}

/**
 * Load the Codex account pool from the token store, refreshing expired OAuth
 * tokens and hydrating cooldown + quota state from disk.
 */
async function loadCodexProxyAccounts(): Promise<CodexRuntimeAccount[]> {
  const [inventory, cooldowns, quotas] = await Promise.all([
    tokenStore.getProviderSnapshot(),
    loadAccountCooldowns(),
    loadAccountQuotas(),
  ]);
  const now = Date.now();
  const accounts: CodexRuntimeAccount[] = [];

  for (const [key, entry] of Object.entries(inventory)) {
    if (!key.startsWith(CODEX_ACCOUNT_PREFIX) || entry.disabled) {
      continue;
    }
    const tokens = entry.tokens;
    if (!tokens || tokens.tokenType !== "Bearer") {
      // Only OAuth (Bearer) accounts can serve the ChatGPT backend.
      continue;
    }

    let accessToken = tokens.accessToken;
    let expiresAt = tokens.expiresAt;
    if (codexTokenNeedsRefresh(expiresAt) && tokens.refreshToken) {
      try {
        const refreshed = await refreshCodexTokenOnce(key, tokens.refreshToken);
        accessToken = refreshed.accessToken;
        expiresAt = refreshed.expiresAt ?? expiresAt;
      } catch (error) {
        // Keep the stale token; a 401 upstream will trigger rotation.
        logger.debug(
          `Codex proactive refresh failed for ${key.slice(
            CODEX_ACCOUNT_PREFIX.length,
          )}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const cooldown = cooldowns[key];
    const cooling = cooldown && cooldown.coolingUntil > now;
    accounts.push({
      key,
      label: key.slice(CODEX_ACCOUNT_PREFIX.length) || key,
      token: accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      accountId: resolveCodexAccountId(accessToken),
      quota: quotas[key],
      coolingUntil: cooling ? cooldown.coolingUntil : undefined,
      coolingReason: cooldown?.reason,
      // Kept even once expired: an account only reaches the request loop when it
      // is NOT cooling, so this is the only handle the success path has for
      // deleting the spent record. Without it they accumulate forever.
      expiredCooldownUntil:
        cooldown && !cooling ? cooldown.coolingUntil : undefined,
    });
  }

  return accounts;
}

/**
 * Order non-cooling accounts ahead of cooling ones, then defer rejected quota.
 * Within each group, probe unknown quota first and otherwise fill the least-used
 * session so fresh accounts get observed rather than starved.
 */
function orderCodexAccounts(
  accounts: CodexRuntimeAccount[],
  now: number,
): CodexRuntimeAccount[] {
  return [...accounts].sort((a, b) => {
    const aCooling = a.coolingUntil !== undefined && a.coolingUntil > now;
    const bCooling = b.coolingUntil !== undefined && b.coolingUntil > now;
    if (aCooling !== bCooling) {
      return aCooling ? 1 : -1;
    }
    const aRejected = a.quota?.unifiedStatus === "rejected";
    const bRejected = b.quota?.unifiedStatus === "rejected";
    if (aRejected !== bRejected) {
      return aRejected ? 1 : -1;
    }
    const aUsed =
      a.quota && a.quota.sessionStatus !== "unknown" ? a.quota.sessionUsed : -1;
    const bUsed =
      b.quota && b.quota.sessionStatus !== "unknown" ? b.quota.sessionUsed : -1;
    return aUsed - bUsed;
  });
}

/** Build the upstream request headers, replacing client auth with the account's. */
function buildCodexUpstreamHeaders(
  clientHeaders: Record<string, string>,
  account: CodexRuntimeAccount,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(clientHeaders)) {
    const lower = name.toLowerCase();
    if (BLOCKED_UPSTREAM_HEADERS.has(lower)) {
      continue;
    }
    headers[lower] = value;
  }
  headers.authorization = `Bearer ${account.token}`;
  const accountId = resolveCodexAccountId(account.token, account.accountId);
  if (accountId) {
    headers["chatgpt-account-id"] = accountId;
  }
  headers["content-type"] = "application/json";
  if (!headers["user-agent"]) {
    headers["user-agent"] = CODEX_USER_AGENT;
  }
  if (!headers.originator) {
    headers.originator = CODEX_ORIGINATOR;
  }
  if (!headers.accept) {
    headers.accept = "text/event-stream";
  }
  return headers;
}

/** Extract explicit plan-exhaustion evidence without guessing account-wide scope. */
function parseCodexQuotaError(
  errorText: string,
  now: number,
): CodexQuotaError | null {
  try {
    const payload = JSON.parse(errorText);
    const error = payload?.error;
    if (
      !error ||
      typeof error !== "object" ||
      (error.type !== "usage_limit_reached" &&
        error.code !== "usage_limit_reached")
    ) {
      return null;
    }
    const absolute = error.resets_at ?? error.reset_at;
    const relative = error.resets_in_seconds ?? error.reset_after_seconds;
    const resetAt =
      typeof absolute === "number" && Number.isFinite(absolute) && absolute > 0
        ? absolute > 4_102_444_800
          ? absolute
          : absolute * 1000
        : typeof relative === "number" &&
            Number.isFinite(relative) &&
            relative > 0
          ? now + relative * 1000
          : 0;
    // Only explicit account-wide window evidence permits a long cooldown.
    // A model/surface-scoped or unscoped rejection must not park the entire pool.
    const window = error.limit_type;
    const scoped =
      error.model || (error.scope !== undefined && error.scope !== "account");
    const scope = scoped
      ? "unknown"
      : window === "primary" || window === "session"
        ? "session"
        : window === "secondary" || window === "weekly"
          ? "weekly"
          : "unknown";
    return {
      errorCode: "usage_limit_reached",
      resetAt: Number.isFinite(resetAt) ? resetAt : 0,
      scope,
    };
  } catch {
    return null;
  }
}

/** Honor known quota resets while bounding unscoped or transient account cooldowns. */
function planCodexCooldown(
  quota: AccountQuota | null,
  retryAfterMs: number,
  now: number,
  errorText = "",
): { coolingUntil: number; reason: RateLimitCoolingReason } {
  // A reported reset can already be in the past — a stale header, or a clock
  // skew. Taken literally the account is eligible again immediately and the
  // pool re-sends to something the provider just rejected.
  const floor = now + DEFAULT_TRANSIENT_COOLDOWN_MS;
  if (quota) {
    if (quota.weeklyStatus === "rejected" && quota.weeklyResetAt > 0) {
      return {
        coolingUntil: Math.max(quota.weeklyResetAt * 1000, floor),
        reason: "weekly",
      };
    }
    if (quota.sessionStatus === "rejected" && quota.sessionResetAt > 0) {
      return {
        coolingUntil: Math.max(quota.sessionResetAt * 1000, floor),
        reason: "session",
      };
    }
  }
  const bodyQuota = parseCodexQuotaError(errorText, now);
  if (bodyQuota) {
    if (bodyQuota.scope !== "unknown" && bodyQuota.resetAt > 0) {
      return {
        coolingUntil: Math.max(bodyQuota.resetAt, floor),
        reason: bodyQuota.scope,
      };
    }
    return {
      coolingUntil:
        now +
        Math.min(
          MAX_TRANSIENT_COOLDOWN_MS,
          Math.max(
            bodyQuota.resetAt - now,
            retryAfterMs,
            DEFAULT_TRANSIENT_COOLDOWN_MS,
          ),
        ),
      reason: "unified",
    };
  }
  const delay = Math.min(
    MAX_TRANSIENT_COOLDOWN_MS,
    Math.max(retryAfterMs, DEFAULT_TRANSIENT_COOLDOWN_MS),
  );
  return {
    coolingUntil: now + delay,
    reason: quota?.unifiedStatus === "rejected" ? "unified" : "transient",
  };
}

/** Set the x-neurolink-* attribution headers on the context. */
function publishCodexHeaders(
  ctx: ServerContext,
  account: CodexRuntimeAccount,
  attempt: number,
  quota: AccountQuota | null,
): void {
  if (!ctx.responseHeaders) {
    ctx.responseHeaders = {};
  }
  ctx.responseHeaders["x-neurolink-account"] = account.label;
  ctx.responseHeaders["x-neurolink-account-type"] = "codex-oauth";
  ctx.responseHeaders["x-neurolink-served-by"] = "codex";
  ctx.responseHeaders["x-neurolink-attempt"] = String(attempt);
  ctx.responseHeaders["x-neurolink-quota-source"] = quota ? "live" : "none";
  if (quota && quota.sessionStatus !== "unknown") {
    ctx.responseHeaders["x-neurolink-quota-session-left-pct"] = String(
      Math.round((1 - quota.sessionUsed) * 100),
    );
  }
  if (quota && quota.weeklyStatus !== "unknown") {
    const remaining = String(Math.round((1 - quota.weeklyUsed) * 100));
    ctx.responseHeaders["x-neurolink-quota-weekly-left-pct"] = remaining;
    // Preserve the original Codex header for existing clients.
    ctx.responseHeaders["x-neurolink-weekly-left-pct"] = remaining;
  }
}

// =============================================================================
// CODEX-OUTBOUND FALLBACK DISPATCH (stage-c-trigger.md). When the native
// Codex pool itself fails (no accounts, all cooling, a non-retryable
// transport error, or the account-retry loop exhausts without a terminal
// response), and runtime config has opted in, translate the inbound native
// Codex request to Anthropic wire format and serve it from the Anthropic
// OAuth pool (in-process loopback to this same proxy's `/v1/messages`
// handler) or Vertex's Claude passthrough, then translate the response back
// to Codex wire format so the native Codex CLI client never sees the
// difference.
//
// Owns dispatch/HTTP only. Classification lives in codexOutboundFallback.ts's
// `classifyCodexOutboundFailure` (that file's own header disclaims dispatch
// ownership); translation and the response codec live in
// codexOutboundFallback.ts and codexToAnthropicFallback.ts respectively.
// =============================================================================

/** Set once a real dispatch attempt begins (after every gate has passed,
 *  before any network call). A single flag — not a per-target counter —
 *  because MAX_ENGINE_CROSSINGS caps the whole request to one crossing
 *  regardless of which of the four call sites in `dispatch()` reaches this
 *  function, and insertion point 3 sits inside a loop that can call it more
 *  than once before insertion point 4 is ever reached. */
const CODEX_OUTBOUND_FALLBACK_ATTEMPTED_KEY =
  "neurolink.codexOutboundFallbackAttempted";

/** Bounds the Anthropic loopback until its response headers arrive. It is
 *  cleared once they do, so a long turn can stream past it. */
const CODEX_OUTBOUND_FALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
let codexOutboundFallbackTimeoutOverrideMs: number | null = null;

/** `CodexResponseUsage` -> the shared `UsageContext` shape `tracer.setUsage`
 *  takes. `cacheReadTokensObserved`/`cacheCreationTokensObserved` are false
 *  only when the field is genuinely absent (never conflated with an
 *  observed zero). `inputIncludesCachedTokens` is always true because
 *  `synthesizeCodexUsage` folds cache reads and cache writes into the Codex
 *  `input_tokens`, the same OpenAI-style total the native Codex path logs. */
function toUsageContext(
  usage: CodexResponseUsage | undefined,
): UsageContext | undefined {
  if (!usage) {
    return undefined;
  }
  const cacheRead = usage.input_tokens_details?.cached_tokens;
  const cacheCreate = usage.input_tokens_details?.cache_write_tokens;
  const cacheCreate1h = usage.input_tokens_details?.cache_write_1h_tokens;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: cacheRead ?? 0,
    cacheCreationTokens: cacheCreate ?? 0,
    ...(cacheCreate1h === undefined
      ? {}
      : { cacheCreation1hTokens: cacheCreate1h }),
    cacheReadTokensObserved: cacheRead !== undefined,
    cacheCreationTokensObserved: cacheCreate !== undefined,
    inputIncludesCachedTokens: true,
  };
}

/** Preserve absent cache fields in the persisted log while the tracer uses
 * zero defaults for arithmetic. */
function outboundFallbackUsageLogFields(
  usage: UsageContext,
): CodexFinalLogExtra {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokensObserved: usage.cacheReadTokensObserved === true,
    cacheCreationTokensObserved: usage.cacheCreationTokensObserved === true,
    ...(usage.cacheReadTokensObserved === true
      ? { cacheReadTokens: usage.cacheReadTokens }
      : {}),
    ...(usage.cacheCreationTokensObserved === true
      ? {
          cacheCreationTokens: usage.cacheCreationTokens,
          ...(usage.cacheCreation1hTokens !== undefined
            ? { cacheCreation1hTokens: usage.cacheCreation1hTokens }
            : {}),
        }
      : {}),
  };
}

/**
 * Drive a `CodexResponseStream`'s `frames` generator into a `Response` body,
 * calling `onSettled` exactly once with the outcome: the terminal envelope on
 * a normal finish, the thrown error on the (never expected, still handled)
 * post-commit failure, or `cancelled` when the consumer cancels the
 * `ReadableStream` first (client disconnect, or an upstream timeout/abort).
 *
 * `createAnthropicFallbackStream`'s generator never throws once past its own
 * internal preflight (codexToAnthropicFallback.ts:220-517) — every
 * post-commit failure is instead serialized as a `response.failed` frame and
 * the generator completes normally — so the `catch` branch here is a
 * defensive backstop, not the documented failure path.
 */
function wrapCodexOutboundResponseStream(
  codecStream: CodexResponseStream,
  headers: Record<string, string>,
  onSettled: (
    result:
      | { kind: "completed"; envelope: CodexResponseEnvelope }
      | { kind: "error"; error: unknown }
      | { kind: "cancelled" },
  ) => void,
): Response {
  let settled = false;
  const settleOnce = (
    result:
      | { kind: "completed"; envelope: CodexResponseEnvelope }
      | { kind: "error"; error: unknown }
      | { kind: "cancelled" },
  ): void => {
    if (settled) {
      return;
    }
    settled = true;
    onSettled(result);
  };
  const encoder = new TextEncoder();
  // One frame per pull(), so a slow client holds the upstream back instead of
  // buffering the whole turn. `cancelled` is set before the codec is
  // cancelled: a read that settles after a disconnect must not be recorded
  // as a stream error.
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await codecStream.frames.next();
        if (cancelled) {
          return;
        }
        if (next.done === true) {
          controller.close();
          settleOnce({ kind: "completed", envelope: next.value });
          return;
        }
        controller.enqueue(encoder.encode(next.value));
      } catch (error) {
        if (cancelled) {
          return;
        }
        try {
          controller.error(error);
        } catch {
          // Already closed or errored.
        }
        settleOnce({ kind: "error", error });
      }
    },
    cancel(reason) {
      cancelled = true;
      return codecStream.cancel(reason).finally(() => {
        settleOnce({ kind: "cancelled" });
      });
    },
  });
  return new Response(body, { status: 200, headers });
}

/** Set the response headers for a served-outbound-fallback turn. Mirrors
 *  `publishCodexHeaders`'s use of `ctx.responseHeaders`, direction-prefixed
 *  so it is never confused with a native Codex-pool response. */
function buildCodexOutboundFallbackResponseHeaders(
  ctx: ServerContext,
  provider: "anthropic" | "vertex",
): Record<string, string> {
  if (!ctx.responseHeaders) {
    ctx.responseHeaders = {};
  }
  ctx.responseHeaders["x-neurolink-served-by"] =
    `codex-outbound-fallback:${provider}`;
  return {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    ...ctx.responseHeaders,
  };
}

/** Forward headers for the loopback `/v1/messages` call — the same allow-list
 *  `openaiProxyRoutes.ts`'s `buildBridgeHeaders` uses — plus the unforgeable
 *  internal-origin marker `claudeProxyRoutes.ts` cross-checks against a
 *  server-set accounting scope that no inbound request header can forge. */
function buildCodexOutboundLoopbackHeaders(
  ctx: ServerContext,
  token: string,
  affinityKey?: string,
): Record<string, string> {
  const forwardHeaders: Record<string, string> = {
    "content-type": "application/json",
    accept: "text/event-stream",
    "x-neurolink-internal-request": token,
    "x-neurolink-internal-origin": "codex-outbound-fallback",
    // Ruling 3: derive the Codex-side session-affinity key and forward it as
    // the same header claudeProxyRoutes.ts already reads for a native Claude
    // client's session id, so the existing (config-gated, off-by-default on
    // the live proxy) session-affinity machinery can bind consecutive turns
    // of the same Codex conversation to the same Anthropic account.
    ...(affinityKey ? { "x-claude-code-session-id": affinityKey } : {}),
  };
  const traceContext = getProxyRequestTraceContext(ctx.requestId);
  if (traceContext) {
    forwardHeaders.traceparent = `00-${traceContext.traceId}-${traceContext.spanId}-${traceContext.traceFlags.toString(16).padStart(2, "0")}`;
  }
  for (const [k, v] of Object.entries(ctx.headers)) {
    if (typeof v !== "string") {
      continue;
    }
    const lower = k.toLowerCase();
    if (
      ["user-agent", "tracestate", "baggage"].includes(lower) ||
      (lower === "traceparent" && !forwardHeaders.traceparent)
    ) {
      forwardHeaders[lower] = v;
    }
  }
  return forwardHeaders;
}

/**
 * One target attempt: dispatch a translated `ClaudeRequest` to either the
 * in-process Anthropic-pool loopback or Vertex's Claude passthrough, and
 * hand back an Anthropic-shaped `Response` (never a Codex-shape one). Both
 * legs are unified through the same `createAnthropicFallbackStream` call one
 * level up, so this function's only job per target is "get the Response
 * plus a way to attribute it afterward" — Vertex's own `onTerminal` usage
 * path is deliberately unused, since usage is read from the shared terminal
 * envelope instead (a scope-bounding ruling, not an oversight).
 *
 * `finalizeAttribution`/`releaseInternal` are split from the dispatch itself
 * because, for the anthropic target, the loopback's own account/model
 * attribution is only known once its lifecycle completes — which, like the
 * OpenAI->Anthropic bridge's `writeLifecycle`, is no earlier than this
 * caller's own read of the response body. The caller invokes
 * `finalizeAttribution` then `releaseInternal`, in that order, exactly once.
 */
async function dispatchCodexOutboundTarget(args: {
  ctx: ServerContext;
  target: { provider: "anthropic" | "vertex"; model: string };
  claudeRequest: ClaudeRequest;
  loopbackPort?: number;
  internalDispatch?: (request: Request) => Response | Promise<Response>;
  affinityKey?: string;
}): Promise<
  | {
      ok: true;
      response: Response;
      finalizeAttribution: () => CodexOutboundServedAttribution;
      releaseInternal: () => void;
      /** Set only for the anthropic target: the internal loopback's own
       *  requestId, which its `/v1/messages` final log entry carries as its
       *  own `requestId`. The caller names this as `usageOwnerRequestId` on
       *  the OUTER Codex entry so the aggregate billing pass counts the
       *  upstream call once (via the inner entry) instead of twice. */
      childRequestId?: string;
    }
  | { ok: false; error: unknown }
> {
  const {
    ctx,
    target,
    claudeRequest,
    loopbackPort,
    internalDispatch,
    affinityKey,
  } = args;

  if (target.provider === "vertex") {
    try {
      const vertexBody: Record<string, unknown> = {
        ...claudeRequest,
        stream: true,
      };
      const response = await executeVertexAnthropicFallback({
        body: vertexBody,
        model: target.model,
        ...(ctx.abortSignal ? { signal: ctx.abortSignal } : {}),
      });
      return {
        ok: true,
        response,
        // Vertex has no OAuth-pool "account" concept, but it does have a
        // model, so it uses the same `vertex/${model}` / "vertex" labeling
        // convention as the existing Claude->Vertex fallback leg
        // (claudeProxyRoutes.ts's setServedAccount(`vertex/${vertexModel}`,
        // "vertex")), keeping per-model cost attribution intact instead of
        // collapsing every Codex-outbound-to-Vertex model into one sentinel.
        finalizeAttribution: () => ({
          account: `vertex/${target.model}`,
          accountKey: `vertex/${target.model}`,
          accountType: "vertex",
          provider: "vertex",
          model: target.model,
        }),
        releaseInternal: () => {
          /* Vertex holds no internal-request capability to release. */
        },
      };
    } catch (error) {
      return { ok: false, error };
    }
  }

  // provider === "anthropic": in-process loopback to this same proxy's own
  // /v1/messages handler. SECURITY: the target is always 127.0.0.1 on the
  // listener's own port, never derived from a client-controlled Host header.
  if (!loopbackPort) {
    return {
      ok: false,
      error: new Error(
        "codex-outbound-fallback: no loopback port configured for the anthropic target",
      ),
    };
  }
  // Registration throws at the internal-dispatch capacity limit. That is a
  // failed target like any other: the caller moves on to the next target or
  // returns the native Codex error, instead of the throw escaping as a 502.
  let internal: ReturnType<typeof registerInternalProxyRequest>;
  try {
    internal = registerInternalProxyRequest(ctx.requestId);
  } catch (error) {
    return { ok: false, error };
  }
  const cancellation = new AbortController();
  const headersTimeout = setTimeout(
    () =>
      cancellation.abort(
        new DOMException("Codex outbound fallback timed out", "TimeoutError"),
      ),
    codexOutboundFallbackTimeoutOverrideMs ??
      CODEX_OUTBOUND_FALLBACK_TIMEOUT_MS,
  );
  const signal = AbortSignal.any([
    cancellation.signal,
    ...(ctx.abortSignal ? [ctx.abortSignal] : []),
  ]);
  const internalUrl = `http://127.0.0.1:${loopbackPort}/v1/messages`;
  let disposed = false;
  const finalizeAttribution = (): CodexOutboundServedAttribution => {
    if (!disposed) {
      disposed = true;
      internal.dispose();
    }
    const child = getProxyBridgeResult(ctx.requestId);
    return {
      account: child?.account ?? "anthropic-outbound",
      ...(child?.accountKey ? { accountKey: child.accountKey } : {}),
      accountType: child?.accountType ?? "anthropic-oauth",
      provider: child?.provider ?? "anthropic",
      model: child?.model ?? target.model,
    };
  };
  const releaseInternal = (): void => {
    if (!disposed) {
      disposed = true;
      internal.dispose();
    }
    releaseProxyRequestAccounting(ctx.requestId);
  };
  try {
    const forwardHeaders = buildCodexOutboundLoopbackHeaders(
      ctx,
      internal.token,
      affinityKey,
    );
    const requestOptions = {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({ ...claudeRequest, stream: true }),
      signal,
    };
    const response = await raceWithAbort(
      Promise.resolve(
        internalDispatch
          ? internalDispatch(new Request(internalUrl, requestOptions))
          : fetch(internalUrl, requestOptions),
      ),
      signal,
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      clearTimeout(headersTimeout);
      releaseInternal();
      return {
        ok: false,
        error: new Error(
          `codex-outbound-fallback: anthropic loopback responded ${response.status}: ${detail.slice(0, 300)}`,
        ),
      };
    }
    clearTimeout(headersTimeout);
    return {
      ok: true,
      response,
      finalizeAttribution,
      releaseInternal,
      childRequestId: internal.requestId,
    };
  } catch (error) {
    clearTimeout(headersTimeout);
    releaseInternal();
    return { ok: false, error };
  }
}

/**
 * Attempt the Codex-outbound fallback for one native-Codex-route failure.
 * Called from each of `executeCodexResponsesRequest`'s four insertion points
 * with a `CodexOutboundFailureInput` describing what that call site observed.
 *
 * Gating order: already-a-fallback-request -> already-attempted-this-request
 * -> classifier eligibility -> runtime-config enabled+targets -> the inbound
 * body parses as a native Codex request. Any gate failing returns
 * `not_attempted`, and the caller's existing code at that insertion point
 * runs completely unchanged — this is what makes the flag-off path byte-
 * identical to before this feature existed.
 */
async function attemptCodexOutboundFallback(args: {
  ctx: ServerContext;
  body: Record<string, unknown>;
  model: string;
  isFallbackRequest: boolean;
  runtimeConfigProvider?: ProxyRuntimeConfigProvider;
  loopbackPort?: number;
  internalDispatch?: (request: Request) => Response | Promise<Response>;
  tracer?: ProxyTracer;
  recordFinalOutcome: (
    account: CodexRuntimeAccount | undefined,
    responseStatus: number,
    extra?: CodexFinalLogExtra,
  ) => Promise<void>;
  failureInput: CodexOutboundFailureInput;
}): Promise<CodexOutboundFallbackOutcome> {
  const {
    ctx,
    body,
    model,
    isFallbackRequest,
    runtimeConfigProvider,
    loopbackPort,
    internalDispatch,
    tracer,
    recordFinalOutcome,
    failureInput,
  } = args;

  // A request that itself arrived as an inner fallback leg (the existing
  // Claude->Codex direction's own Codex call) must never be offered a
  // further outbound fallback — that would be a second engine crossing in
  // the same turn, exactly what MAX_ENGINE_CROSSINGS bounds against.
  if (isFallbackRequest) {
    return { kind: "not_attempted" };
  }
  if (ctx.metadata?.[CODEX_OUTBOUND_FALLBACK_ATTEMPTED_KEY] === true) {
    return { kind: "not_attempted" };
  }
  if (!runtimeConfigProvider) {
    return { kind: "not_attempted" };
  }
  const decision = classifyCodexOutboundFailure(failureInput);
  if (!decision.eligible) {
    return { kind: "not_attempted" };
  }
  let snapshot: ReturnType<ProxyRuntimeConfigProvider>;
  try {
    snapshot = runtimeConfigProvider();
  } catch {
    return { kind: "not_attempted" };
  }
  if (!snapshot.codexOutboundFallbackEnabled) {
    return { kind: "not_attempted" };
  }
  const targets = snapshot.codexOutboundFallbackTargets;
  if (!targets || targets.length === 0) {
    return { kind: "not_attempted" };
  }
  const parsed = parseCodexNativeRequest(body);
  if (!parsed.ok) {
    return { kind: "not_attempted" };
  }

  // Every gate has passed and at least one target will be tried below: this
  // is the one dispatch attempt MAX_ENGINE_CROSSINGS allows for this whole
  // request, so no later insertion-point call may try again even if every
  // target below ultimately fails.
  ctx.metadata[CODEX_OUTBOUND_FALLBACK_ATTEMPTED_KEY] = true;

  for (const target of targets) {
    const mapping = snapshot.codexOutboundFallbackModelMappings.find(
      (m) => m.from === parsed.value.model && m.provider === target.provider,
    );
    const resolvedModel = mapping ? mapping.to : target.model;
    const translated = translateCodexRequestToClaude(parsed.value, {
      provider: target.provider,
      model: resolvedModel,
    });
    if (translated.ok === false) {
      if (translated.error.code === "REQUEST_TOO_LARGE") {
        // Target-independent: every other configured target would fail the
        // exact same way, so this short-circuits the whole loop.
        return {
          kind: "request_too_large",
          message: translated.error.message,
        };
      }
      recordFallbackAttempt({
        provider: target.provider,
        model: resolvedModel,
        status: "failure",
        errorMessage: translated.error.message,
        durationMs: 0,
        direction: "codex-outbound",
      });
      continue;
    }

    // Cache preservation (spec cache section; Ruling #3): guard the
    // translated request's shape, then mark cache breakpoints with a 1h TTL
    // before dispatch. The fallback exists to rescue the turn, so a
    // cache-shape problem must never fail it — a thrown guard is logged
    // (never with payload content) and the unmodified translated request is
    // dispatched without the added breakpoints instead.
    let claudeRequest = translated.value;
    try {
      assertClaudeSystemPrefixShape(
        translated.value.system,
        buildSystemBlocksFromDeveloperMessages(parsed.value.input).length,
      );
      assertClaudeMessagesAlternate(translated.value.messages);
      claudeRequest = applyClaudeRequestCacheBreakpoints(translated.value, {
        ttl: "1h",
      });
    } catch (error) {
      logger.warn(
        `[codex-outbound-fallback] cache-preservation guard rejected the translated request shape (${target.provider}/${resolvedModel}); dispatching without added cache breakpoints: ${
          error instanceof Error ? error.name : "unknown error"
        }`,
      );
    }

    // Ruling #3: derive the Codex-side session-affinity key so consecutive
    // turns of the same Codex conversation can route to the same Anthropic
    // account. Only the anthropic target has a session-affinity seam to feed;
    // Vertex has none.
    const affinityKey =
      target.provider === "anthropic"
        ? codexAnthropicAffinityKey(parsed.value)
        : undefined;

    const attemptStartedAt = Date.now();
    const dispatched = await dispatchCodexOutboundTarget({
      ctx,
      target: { provider: target.provider, model: resolvedModel },
      claudeRequest,
      loopbackPort,
      internalDispatch,
      affinityKey,
    });
    if (dispatched.ok === false) {
      recordFallbackAttempt({
        provider: target.provider,
        model: resolvedModel,
        status: "failure",
        errorMessage:
          dispatched.error instanceof Error
            ? dispatched.error.message
            : String(dispatched.error),
        durationMs: Date.now() - attemptStartedAt,
        direction: "codex-outbound",
      });
      continue;
    }

    let codecStream: CodexResponseStream;
    try {
      codecStream = await createAnthropicFallbackStream(
        dispatched.response,
        resolvedModel,
        translated.toolKindByName,
      );
    } catch (error) {
      // Pre-commit failure (createAnthropicFallbackStream's own preflight,
      // codexToAnthropicFallback.ts:220-517): safe to try the next target.
      recordFallbackAttempt({
        provider: target.provider,
        model: resolvedModel,
        status: "failure",
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - attemptStartedAt,
        direction: "codex-outbound",
      });
      dispatched.releaseInternal();
      continue;
    }

    // COMMIT POINT: createAnthropicFallbackStream resolved, so this leg
    // never throws again past this point — every later failure is
    // serialized into the stream itself. The leg-health record fires now,
    // and this function unconditionally returns success from here on,
    // never falling back to try a different target.
    //
    // Spec: "Call tracer.setRequestOrigin('codex-fallback') at the point the
    // new outbound path enters the Anthropic dispatch." Set only here, once a
    // target has actually been dispatched and will serve the turn, so a
    // request that exhausts every target and ends as a native Codex error
    // keeps its root span's origin at "native" rather than being mutated on
    // an attempt that was later abandoned.
    tracer?.setRequestOrigin("codex-fallback");
    recordFallbackAttempt({
      provider: target.provider,
      model: resolvedModel,
      status: "success",
      durationMs: Date.now() - attemptStartedAt,
      direction: "codex-outbound",
    });

    const responseHeaders = buildCodexOutboundFallbackResponseHeaders(
      ctx,
      target.provider,
    );
    const response = wrapCodexOutboundResponseStream(
      codecStream,
      responseHeaders,
      (result) => {
        const served = dispatched.finalizeAttribution();
        const { account, accountType } = served;
        // Read the child's requestId BEFORE releasing: this mirrors
        // openaiProxyRoutes.ts's own internal loopback exactly. The anthropic
        // target's /v1/messages call logs its own final entry, carrying real
        // usage, under `dispatched.childRequestId` as ITS `requestId`. Naming
        // it here as this (outer) entry's `usageOwnerRequestId` is what makes
        // `proxyAnalysis.ts`'s billing pass skip the outer entry and count the
        // upstream call exactly once, via the inner entry — set unconditionally
        // (every outcome), since a cancelled/errored outer turn does not
        // un-happen the inner call the loopback already made.
        // `requestedModel` stays the Codex model writeFinalLog sets; these
        // override the Codex-pool defaults so a Vertex-served turn is priced
        // as the Claude model on Vertex, not as an OpenAI model.
        const accountingExtra: CodexFinalLogExtra = {
          ...served,
          ...(dispatched.childRequestId
            ? {
                accountingScope: "client",
                usageOwnerRequestId: dispatched.childRequestId,
              }
            : {}),
        };
        dispatched.releaseInternal();
        try {
          if (result.kind === "completed") {
            tracer?.setModelSubstitution(model, resolvedModel, target.provider);
            tracer?.setServedAccount(account, accountType);
            const usage = toUsageContext(result.envelope.usage);
            // A loopback child records this call's tokens and cost itself, so
            // this outer entry carries neither, as the OpenAI bridge's does.
            const delegated = dispatched.childRequestId !== undefined;
            if (usage) {
              tracer?.setUsage(
                usage,
                delegated ? { recordMetrics: false } : undefined,
              );
            }
            // A failed stream is a failed turn (502), as on the native path.
            const failed = result.envelope.status === "failed";
            void recordFinalOutcome(undefined, failed ? 502 : 200, {
              ...accountingExtra,
              terminalOutcome: failed ? "stream_error" : "completed",
              ...(failed
                ? {
                    errorType: "outbound_fallback_stream_failed",
                    errorMessage:
                      result.envelope.error?.message ??
                      "codex-outbound fallback stream ended in failure",
                  }
                : {}),
              ...(usage && !delegated
                ? outboundFallbackUsageLogFields(usage)
                : {}),
            });
          } else if (result.kind === "cancelled") {
            tracer?.setServedAccount(account, accountType);
            void recordFinalOutcome(undefined, 499, {
              ...accountingExtra,
              errorType: "client_cancelled",
              errorMessage: "Client cancelled Codex request",
              terminalOutcome: "client_cancelled",
            });
          } else {
            tracer?.setServedAccount(account, accountType);
            void recordFinalOutcome(undefined, 502, {
              ...accountingExtra,
              errorType: "outbound_fallback_stream_error",
              errorMessage:
                result.error instanceof Error
                  ? result.error.message
                  : String(result.error),
              terminalOutcome: "stream_error",
            });
          }
        } catch {
          // Accounting must never throw across the response boundary.
        }
      },
    );
    return { kind: "success", response };
  }

  return { kind: "not_attempted" };
}

/** Core pooled handler for POST /backend-api/codex/responses. */
export async function handleCodexResponsesRequest(
  ctx: ServerContext,
  runtimeConfigProvider?: ProxyRuntimeConfigProvider,
  loopbackPort?: number,
  internalDispatch?: (request: Request) => Response | Promise<Response>,
): Promise<Response> {
  if (ctx.metadata?.[CODEX_FALLBACK_METADATA_KEY] !== true) {
    void logBodyCapture({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      phase: "client_request",
      model: codexCaptureModel(ctx),
      stream: true,
      headers: ctx.headers,
      body: ctx.body,
      contentType: "application/json",
      ...resolveProxyLogTraceContext({ requestId: ctx.requestId }),
    });
  }
  const response = await executeCodexResponsesRequest(
    ctx,
    runtimeConfigProvider,
    loopbackPort,
    internalDispatch,
  );
  return ctx.metadata?.[CODEX_FALLBACK_METADATA_KEY] === true
    ? response
    : captureCodexResponse(ctx, response, "client_response");
}

function codexCaptureModel(ctx: ServerContext): string {
  const body = ctx.body as Record<string, unknown> | undefined;
  return typeof body?.model === "string" ? body.model : "-";
}

/** Observe bytes through the existing bounded pass-through; cancellation still reaches upstream. */
function captureCodexResponse(
  ctx: ServerContext,
  response: Response,
  phase: string,
  account?: CodexRuntimeAccount,
  attempt?: number,
): Response {
  if (!isProxyBodyCaptureEnabled()) {
    return response;
  }
  const metadata = {
    timestamp: new Date().toISOString(),
    requestId: ctx.requestId,
    phase,
    model: codexCaptureModel(ctx),
    stream: true,
    headers: Object.fromEntries(response.headers.entries()),
    contentType: response.headers.get("content-type") ?? undefined,
    responseStatus: response.status,
    account: account?.label,
    accountType: account ? CODEX_ACCOUNT_TYPE : undefined,
    attempt,
    ...resolveProxyLogTraceContext({ requestId: ctx.requestId }),
  };
  if (!response.body || isBorrowedRequest()) {
    void logBodyCapture(metadata);
    return response;
  }
  const observed = createRawStreamCapture();
  void observed.capture
    .then((capture) =>
      logBodyCapture({
        ...metadata,
        timestamp: new Date().toISOString(),
        body: capture.text,
        bodySize: capture.totalBytes,
        sourceTruncated: capture.truncated,
      }),
    )
    .catch(() => undefined);
  return new Response(response.body.pipeThrough(observed.stream), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Serve one native `/backend-api/codex/responses` turn.
 *
 * Owns the whole hop: account selection and rotation, the upstream request,
 * the SSE relay back to the caller, and the terminal accounting that turns the
 * observed wire usage into request-log and tracer records. Usage counts the
 * provider did not report are carried as unobserved rather than zero, so a
 * silent cache breakdown is never recorded as a cache miss.
 */
async function executeCodexResponsesRequest(
  ctx: ServerContext,
  // Read by the outbound-fallback insertion points below (stage-c-trigger.md)
  // to gate/target a Codex-outbound fallback attempt when the native Codex
  // pool itself fails.
  runtimeConfigProvider?: ProxyRuntimeConfigProvider,
  // Threaded through from `createCodexProxyRoutes` to the anthropic-target
  // loopback leg of the outbound-fallback dispatcher (mirrors the
  // OpenAI->Anthropic bridge's `loopbackPort`/`internalDispatch`).
  loopbackPort?: number,
  internalDispatch?: (request: Request) => Response | Promise<Response>,
): Promise<Response> {
  const requestStartTime = Date.now();
  let body = (ctx.body ?? {}) as Record<string, unknown>;
  let bodyStr: string;
  let preparedContext:
    | ProxyPreparedContext<Record<string, unknown>>
    | undefined;
  let contextPreflight: ProxyContextEvidence | undefined;
  let budgetLease: ProxyTokenBudgetLease | undefined;
  let budgetDispatched = false;
  const settleBudget = async (actualTokens?: number): Promise<void> => {
    if (!budgetLease) {
      return;
    }
    try {
      if (budgetDispatched) {
        await settleProxyTokenBudget(budgetLease, actualTokens);
        if (budgetLease.snapshot.settlement === "unconfirmed") {
          emitProxyOtelEvent("token_budget", {
            requestId: ctx.requestId,
            event: "settlement_unconfirmed",
          });
        }
      } else {
        await budgetLease.cancelBeforeDispatch();
      }
    } catch (error) {
      emitProxyOtelEvent("token_budget", {
        requestId: ctx.requestId,
        event: "settlement_unconfirmed",
        errorCode:
          getProxyTokenBudgetError(error)?.code ??
          "PROXY_TOKEN_BUDGET_UNAVAILABLE",
      });
    }
  };
  const model =
    typeof (body as Record<string, unknown>).model === "string"
      ? ((body as Record<string, unknown>).model as string)
      : "-";

  // A Codex call made as an inner Anthropic fallback is an upstream attempt,
  // not an independently final client request. The parent fallback owns the
  // final status and can still recover with a later provider.
  const isFallbackRequest =
    ctx.metadata?.[CODEX_FALLBACK_METADATA_KEY] === true;
  const reasoning = (body as Record<string, unknown>).reasoning;
  const reasoningEffort =
    reasoning &&
    typeof reasoning === "object" &&
    "effort" in reasoning &&
    typeof reasoning.effort === "string"
      ? reasoning.effort
      : undefined;

  let tracer: ProxyTracer | undefined;
  try {
    tracer = ProxyTracer.startRequest(
      {
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        model,
        stream: true,
        toolCount: Array.isArray((body as Record<string, unknown>).tools)
          ? ((body as Record<string, unknown>).tools as unknown[]).length
          : 0,
        provider: "openai",
        userAgent: ctx.headers["user-agent"],
        recordRequestMetrics: !isFallbackRequest,
        recordUsageMetrics: true,
      },
      ctx.headers,
    );
  } catch {
    // Instrumentation must not change provider request handling.
  }

  const writeFinalLog = (
    account: CodexRuntimeAccount | undefined,
    responseStatus: number,
    extra: CodexFinalLogExtra = {},
  ): Promise<void> =>
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model,
      requestedModel: model,
      contextPreflight,
      tokenBudget: budgetLease ? { ...budgetLease.snapshot } : undefined,
      stream: true,
      toolCount: Array.isArray((body as Record<string, unknown>).tools)
        ? ((body as Record<string, unknown>).tools as unknown[]).length
        : 0,
      account: account?.label ?? "",
      ...(account ? { accountKey: account.key } : {}),
      accountType: account ? CODEX_ACCOUNT_TYPE : "",
      // This is the cost provider. accountKey and the response header identify
      // the actual Codex pool that supplied the credential.
      provider: "openai",
      inputIncludesCachedTokens: true,
      ...tracer?.getTraceContext(),
      ...(reasoningEffort ? { reasoningEffort } : {}),
      firstUsefulOutputStatus:
        extra.firstUsefulOutputMs !== undefined ? "observed" : "not_observed",
      ...buildClientAttribution(ctx.headers),
      responseStatus,
      responseTimeMs: Date.now() - requestStartTime,
      ...extra,
    });

  let finalOutcomeRecorded = false;
  const recordFinalOutcome = async (
    account: CodexRuntimeAccount | undefined,
    responseStatus: number,
    extra: CodexFinalLogExtra = {},
  ): Promise<void> => {
    await settleBudget(
      extra.inputTokens !== undefined && extra.outputTokens !== undefined
        ? extra.inputTokens + extra.outputTokens
        : undefined,
    );
    if (finalOutcomeRecorded) {
      return;
    }
    finalOutcomeRecorded = true;
    if (isProxyRequestFinalized(ctx.requestId)) {
      // Runtime owns the client final, but this route still owns its span.
      const status = ctx.abortSignal?.aborted
        ? ctx.abortSignal.reason?.name === "TimeoutError"
          ? 504
          : 499
        : responseStatus;
      try {
        tracer?.end(status, Date.now() - requestStartTime);
      } catch {
        /* best effort */
      }
      return;
    }
    try {
      if (extra.errorType) {
        tracer?.setError(
          extra.errorType,
          extra.errorMessage ?? extra.errorType,
        );
      }
      tracer?.end(responseStatus, Date.now() - requestStartTime);
    } catch {
      // End bookkeeping is best effort; the client outcome remains authoritative.
    }
    if (isFallbackRequest) {
      return;
    }
    if (responseStatus >= 400) {
      recordFinalError(
        responseStatus,
        account?.label,
        account ? CODEX_ACCOUNT_TYPE : undefined,
        {
          requestId: ctx.requestId,
          ...(account ? { accountKey: account.key } : {}),
          errorType: extra.errorType,
          terminalOutcome: extra.terminalOutcome ?? "handler_error",
          message: extra.errorMessage,
          errorCode: extra.errorCode,
        },
      );
    } else {
      recordFinalSuccess(
        account?.label,
        account ? CODEX_ACCOUNT_TYPE : undefined,
      );
    }
    await writeFinalLog(account, responseStatus, extra);
  };

  const writeAttempt = (
    account: CodexRuntimeAccount,
    attempt: number,
    startedAt: number,
    responseStatus: number,
    extra: CodexAttemptLogExtra = {},
  ): void => {
    void logRequestAttempt({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      attempt,
      ...tracer?.getTraceContext(),
      ...(isFallbackRequest
        ? { parentRequestId: ctx.requestId.replace(/:codex-fallback$/, "") }
        : {}),
      ...(reasoningEffort ? { reasoningEffort } : {}),
      method: ctx.method,
      path: ctx.path,
      model,
      requestedModel: model,
      contextPreflight,
      tokenBudget: budgetLease ? { ...budgetLease.snapshot } : undefined,
      stream: true,
      toolCount: Array.isArray((body as Record<string, unknown>).tools)
        ? ((body as Record<string, unknown>).tools as unknown[]).length
        : 0,
      account: account.label,
      accountKey: account.key,
      accountType: CODEX_ACCOUNT_TYPE,
      provider: "openai",
      responseStatus,
      responseTimeMs: Date.now() - requestStartTime,
      attemptDurationMs: Date.now() - startedAt,
      ...extra,
    }).catch(() => undefined);
  };

  const dispatch = async (): Promise<Response> => {
    try {
      preparedContext = prepareProxyRequestContext({
        provider: "codex",
        model,
        body,
      });
      contextPreflight = preparedContext.evidence;
      body = preparedContext.body;
      bodyStr = JSON.stringify(body);
    } catch (error) {
      if (!(error instanceof ProxyContextPreflightError)) {
        throw error;
      }
      contextPreflight = error.evidence;
      await recordFinalOutcome(undefined, error.status, {
        errorType: "context_preflight",
        errorCode: error.code,
        errorMessage: error.message,
        retryable: false,
        terminalOutcome: "handler_error",
      });
      return buildCodexErrorResponse(error.status, error.message, error.code);
    }
    const accounts = await loadCodexProxyAccounts();
    const cancelRequest = async (
      account?: CodexRuntimeAccount,
    ): Promise<Response> => {
      await recordFinalOutcome(account, 499, {
        errorType: "client_cancelled",
        errorMessage: "Client cancelled Codex request",
        terminalOutcome: "client_cancelled",
      });
      return buildCodexErrorResponse(499, "Client cancelled Codex request");
    };
    if (ctx.abortSignal?.aborted) {
      return cancelRequest();
    }
    if (accounts.length === 0) {
      const outbound = await attemptCodexOutboundFallback({
        ctx,
        body,
        model,
        isFallbackRequest,
        runtimeConfigProvider,
        loopbackPort,
        internalDispatch,
        tracer,
        recordFinalOutcome,
        failureInput: { failureClass: "no_accounts" },
      });
      if (outbound.kind === "success") {
        // No Codex account was ever selected on this path, so budgetLease is
        // always undefined here — settleBudget() is a defensive no-op. Kept
        // for consistency with the other three insertion points below.
        await settleBudget();
        budgetLease = undefined;
        budgetDispatched = false;
        return outbound.response;
      }
      if (outbound.kind === "request_too_large") {
        await recordFinalOutcome(undefined, 413, {
          errorType: "request_too_large",
          errorMessage: outbound.message,
          terminalOutcome: "handler_error",
        });
        return buildCodexErrorResponse(
          413,
          outbound.message,
          "request_too_large",
        );
      }
      await recordFinalOutcome(undefined, 401, {
        errorType: "no_accounts",
        errorMessage: "No Codex accounts",
      });
      return buildCodexErrorResponse(
        401,
        "No Codex accounts configured. Run `neurolink auth login codex`.",
      );
    }

    const now = Date.now();
    const ordered = orderCodexAccounts(accounts, now);
    const eligible = ordered.filter(
      (a) => !(a.coolingUntil !== undefined && a.coolingUntil > now),
    );

    if (eligible.length === 0) {
      // Every account is cooling; surface the soonest recovery as retry-after.
      const soonest = ordered.reduce<number | undefined>((min, a) => {
        if (a.coolingUntil === undefined) {
          return min;
        }
        return min === undefined
          ? a.coolingUntil
          : Math.min(min, a.coolingUntil);
      }, undefined);
      const retryAfterSec = soonest
        ? Math.max(1, Math.ceil((soonest - now) / 1000))
        : 60;
      const outbound = await attemptCodexOutboundFallback({
        ctx,
        body,
        model,
        isFallbackRequest,
        runtimeConfigProvider,
        loopbackPort,
        internalDispatch,
        tracer,
        recordFinalOutcome,
        failureInput: { failureClass: "pool_exhausted" },
      });
      if (outbound.kind === "success") {
        // No Codex account was ever selected on this path, so budgetLease is
        // always undefined here — settleBudget() is a defensive no-op. Kept
        // for consistency with the other three insertion points below.
        await settleBudget();
        budgetLease = undefined;
        budgetDispatched = false;
        return outbound.response;
      }
      if (outbound.kind === "request_too_large") {
        await recordFinalOutcome(undefined, 413, {
          errorType: "request_too_large",
          errorMessage: outbound.message,
          terminalOutcome: "handler_error",
        });
        return buildCodexErrorResponse(
          413,
          outbound.message,
          "request_too_large",
        );
      }
      const resetAt = soonest ? new Date(soonest).toISOString() : undefined;
      // A refresh that failed transiently, or a 401 with no refresh token to
      // retry with, parks the account as "auth". Reporting that as spent quota
      // would tell the user the plan is exhausted when it is not.
      if (ordered.every((account) => account.coolingReason === "auth")) {
        await recordFinalOutcome(undefined, 503, {
          errorType: "all_accounts_auth_cooling",
          errorMessage: "All Codex accounts are cooling after an auth failure",
        });
        return buildCodexPoolCoolingResponse(
          resetAt
            ? `Codex authentication is temporarily unavailable for every account. Retry after ${resetAt}, or run \`neurolink auth login codex\` if it persists.`
            : "Codex authentication is temporarily unavailable for every account. Retry shortly, or run `neurolink auth login codex` if it persists.",
          retryAfterSec,
          "server_error",
        );
      }
      await recordFinalOutcome(undefined, 429, {
        errorType: "all_accounts_cooling",
        errorMessage: "All Codex accounts are rate-limited",
      });
      return buildCodexPoolCoolingResponse(
        resetAt
          ? `Codex quota exhausted: all accounts are rate-limited. Resets at ${resetAt}.`
          : "Codex quota exhausted: all accounts are rate-limited.",
        retryAfterSec,
        "insufficient_quota",
      );
    }

    let attempt = 0;
    let lastErrorMessage = "All Codex accounts failed";
    let lastErrorStatus = 502;
    // Set with every lastErrorStatus so the outbound-fallback classifier sees
    // the code of the same attempt, never a stale one from an earlier account.
    let lastErrorCode: string | undefined;
    let lastFailure: CodexFinalLogExtra = { errorType: "all_accounts_failed" };
    let lastAttemptedAccount: CodexRuntimeAccount | undefined;

    for (const account of eligible) {
      try {
        tracer?.setAccountSelection({
          strategy: "codex-quota-order",
          accountsTotal: accounts.length,
          accountsHealthy: eligible.length,
          selectedAccount: account.label,
          accountType: CODEX_ACCOUNT_TYPE,
        });
      } catch {
        // Account attribution cannot affect routing.
      }
      let authRetried = false;

      // Same-account loop only re-runs once, for a post-401 token refresh.
      for (;;) {
        if (ctx.abortSignal?.aborted) {
          return cancelRequest(lastAttemptedAccount);
        }
        await settleBudget();
        budgetLease = undefined;
        budgetDispatched = false;
        try {
          budgetLease = await reserveProxyTokenBudget({
            provider: "codex",
            accountKey: account.key,
            sessionKey: getProxyTokenBudgetSessionKey(new Headers(ctx.headers)),
            requestId: ctx.requestId,
            reservationTokens: preparedContext.totalTokensReservation,
            estimateProvenance:
              "estimated_input_plus_serving_model_output_reserve",
          });
        } catch (error) {
          const budgetError = getProxyTokenBudgetError(error);
          if (!budgetError) {
            throw error;
          }
          await recordFinalOutcome(account, budgetError.status, {
            errorType: "token_budget",
            errorCode: budgetError.code,
            errorMessage: budgetError.message,
            retryable: false,
            terminalOutcome: "handler_error",
          });
          return buildCodexErrorResponse(
            budgetError.status,
            budgetError.message,
            budgetError.code,
          );
        }
        if (ctx.abortSignal?.aborted) {
          return cancelRequest(account);
        }
        attempt += 1;
        const attemptStartedAt = Date.now();
        lastAttemptedAccount = account;
        recordAttempt(account.label, CODEX_ACCOUNT_TYPE);
        let upstream: Response;
        try {
          const upstreamHeaders = buildCodexUpstreamHeaders(
            ctx.headers,
            account,
          );
          void logBodyCapture({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            phase: "upstream_request",
            model,
            stream: true,
            body: bodyStr,
            headers: upstreamHeaders,
            contentType: "application/json",
            account: account.label,
            accountType: CODEX_ACCOUNT_TYPE,
            attempt,
            ...tracer?.getTraceContext(),
          });
          budgetDispatched = true;
          upstream = await fetch(CODEX_RESPONSES_URL, {
            method: "POST",
            headers: upstreamHeaders,
            body: bodyStr,
            signal: ctx.abortSignal
              ? AbortSignal.any([
                  ctx.abortSignal,
                  AbortSignal.timeout(CODEX_UPSTREAM_TIMEOUT_MS),
                ])
              : AbortSignal.timeout(CODEX_UPSTREAM_TIMEOUT_MS),
          });
        } catch (error) {
          if (ctx.abortSignal?.aborted) {
            writeAttempt(account, attempt, attemptStartedAt, 499, {
              errorType: "client_cancelled",
              errorMessage: "Client cancelled Codex request",
              retryable: false,
            });
            return cancelRequest(account);
          }
          // A transport failure message is derived from local state — resolved
          // hostnames, socket paths, Node internals — and says nothing the caller
          // can act on. Keep the detail in the log and return a fixed string, so
          // internal topology never reaches the client.
          logger.debug(
            `Codex upstream fetch failed (${account.label}): ${sanitizeForLog(
              error instanceof Error ? error.message : String(error),
            )}`,
          );
          const errorMessage = summarizeCodexUpstreamError(
            error instanceof Error ? error.message : String(error),
            "Codex upstream request failed",
          );
          const errorCode = getCodexTransportErrorCode(error);
          const transportScope = codexTransportScope(error);
          recordAttemptError(account.label, CODEX_ACCOUNT_TYPE, 502);
          writeAttempt(account, attempt, attemptStartedAt, 502, {
            errorType: "network_error",
            errorMessage,
            ...(errorCode ? { errorCode } : {}),
            transportScope,
            // These codes prove failure before HTTP dispatch. Socket resets,
            // EPIPE and generic timeouts may follow dispatch and must not replay.
            retryable: [
              "UND_ERR_CONNECT_TIMEOUT",
              "ECONNREFUSED",
              "ENOTFOUND",
              "EAI_AGAIN",
            ].includes(errorCode ?? ""),
          });
          lastFailure = {
            errorType: "network_error",
            errorMessage,
            errorCode,
            transportScope,
          };
          if (
            ![
              "UND_ERR_CONNECT_TIMEOUT",
              "ECONNREFUSED",
              "ENOTFOUND",
              "EAI_AGAIN",
            ].includes(errorCode ?? "")
          ) {
            const outbound = await attemptCodexOutboundFallback({
              ctx,
              body,
              model,
              isFallbackRequest,
              runtimeConfigProvider,
              loopbackPort,
              internalDispatch,
              tracer,
              recordFinalOutcome,
              failureInput: {
                failureClass: "non_retryable_transport",
                transportErrorCode: errorCode,
              },
            });
            if (outbound.kind === "success") {
              // This Codex account's budget lease (reserved for the attempt
              // that just failed transport-level) belongs to a request this
              // turn is no longer serving via Codex at all — hold it open no
              // longer than necessary rather than leaving it pending for the
              // unrelated fallback stream's full duration.
              await settleBudget();
              budgetLease = undefined;
              budgetDispatched = false;
              return outbound.response;
            }
            if (outbound.kind === "request_too_large") {
              await recordFinalOutcome(account, 413, {
                errorType: "request_too_large",
                errorMessage: outbound.message,
                terminalOutcome: "handler_error",
              });
              return buildCodexErrorResponse(
                413,
                outbound.message,
                "request_too_large",
              );
            }
            await recordFinalOutcome(account, 502, {
              ...lastFailure,
              errorMessage,
            });
            return buildCodexErrorResponse(
              502,
              "Codex upstream request failed",
            );
          }
          lastErrorMessage = "Codex upstream request failed";
          lastErrorStatus = 502;
          lastErrorCode = lastFailure.errorCode;
          break; // rotate to next account
        }

        upstream = captureCodexResponse(
          ctx,
          upstream,
          "upstream_response",
          account,
          attempt,
        );
        if (upstream.ok) {
          const quota = parseCodexRateLimitHeaders(upstream.headers);
          if (quota) {
            saveAccountQuota(account.key, quota).catch(() => undefined);
          }
          // A prior cooldown that has expired is cleared on success. The
          // compare-and-swap guards against wiping a longer cooldown that another
          // in-flight request set while this one was upstream.
          if (account.expiredCooldownUntil !== undefined) {
            clearAccountCooldown(
              account.key,
              account.expiredCooldownUntil,
            ).catch(() => undefined);
          }
          publishCodexHeaders(ctx, account, attempt, quota);
          writeAttempt(account, attempt, attemptStartedAt, upstream.status);
          const headers: Record<string, string> = {
            "content-type":
              upstream.headers.get("content-type") ?? "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
            ...(ctx.responseHeaders ?? {}),
          };

          if (!upstream.body) {
            recordAttemptError(account.label, CODEX_ACCOUNT_TYPE, 502);
            writeAttempt(account, attempt, attemptStartedAt, 502, {
              errorType: "incomplete_stream",
              errorMessage: "Codex returned no response stream",
              retryable: false,
            });
            await recordFinalOutcome(account, 502, {
              terminalOutcome: "stream_error",
              errorType: "incomplete_stream",
              errorMessage: "Codex returned no response stream",
            });
            return new Response(upstream.body, {
              status: upstream.status,
              headers,
            });
          }
          const {
            stream: usageTap,
            usage: usageSeen,
            evidence,
          } = createCodexUsageTap();
          const relay = new Response(upstream.body.pipeThrough(usageTap), {
            status: upstream.status,
            headers,
          });
          registerProxyResponseObserver(ctx.metadata, {
            onTerminal: ({ outcome, error, observedBodyBytes }) => {
              return usageSeen
                .then((usage) => {
                  const semantic = evidence();
                  const completedFrameDelivered =
                    semantic.completed &&
                    observedBodyBytes >= semantic.terminalBytes;
                  const failed =
                    semantic.errorType ||
                    ((outcome === "completed" || outcome === "bodyless") &&
                      !semantic.completed);
                  const usageExtra = usage
                    ? {
                        inputTokens: usage.inputTokensObserved
                          ? usage.inputTokens
                          : undefined,
                        outputTokens: usage.outputTokensObserved
                          ? usage.outputTokens
                          : undefined,
                        cacheReadTokens: usage.cacheReadTokensObserved
                          ? usage.cacheReadTokens
                          : undefined,
                        cacheCreationTokens: usage.cacheCreationTokensObserved
                          ? usage.cacheCreationTokens
                          : undefined,
                        reasoningTokens: usage.reasoningTokensObserved
                          ? usage.reasoningTokens
                          : undefined,
                      }
                    : {};
                  if (
                    usage?.inputTokensObserved &&
                    usage.outputTokensObserved
                  ) {
                    try {
                      tracer?.setUsage({
                        ...usage,
                        reasoningTokens: usage.reasoningTokensObserved
                          ? usage.reasoningTokens
                          : undefined,
                        cacheReadTokensObserved:
                          usage.cacheReadTokensObserved === true,
                        cacheCreationTokensObserved:
                          usage.cacheCreationTokensObserved === true,
                        inputIncludesCachedTokens: true,
                      });
                    } catch {
                      // Pricing/metrics must never change the stream outcome.
                    }
                  }
                  const timing =
                    semantic.firstUsefulOutputAt === undefined ||
                    semantic.observationIncomplete
                      ? {
                          firstUsefulOutputStatus:
                            semantic.completed &&
                            !semantic.observationIncomplete
                              ? ("no_useful_output" as const)
                              : ("not_observed" as const),
                        }
                      : {
                          firstUsefulOutputStatus: "observed" as const,
                          firstUsefulOutputEvent:
                            semantic.firstUsefulOutputEvent,
                          firstUsefulOutputMs: Math.max(
                            0,
                            semantic.firstUsefulOutputAt - requestStartTime,
                          ),
                        };
                  if (failed) {
                    recordAttemptError(account.label, CODEX_ACCOUNT_TYPE, 502);
                    writeAttempt(account, attempt, attemptStartedAt, 502, {
                      // An internal fallback has no separate final row. Keep
                      // its observed usage on this attempt when a later
                      // provider owns the client final.
                      ...usageExtra,
                      inputIncludesCachedTokens: true,
                      errorType: semantic.errorType ?? "incomplete_stream",
                      errorCode: semantic.errorCode,
                      errorMessage:
                        semantic.errorMessage ??
                        "Codex stream ended without a completion event",
                      retryable: false,
                    });
                    return recordFinalOutcome(account, 502, {
                      ...usageExtra,
                      ...timing,
                      terminalOutcome: "stream_error",
                      errorType: semantic.errorType ?? "incomplete_stream",
                      errorCode: semantic.errorCode,
                      errorMessage:
                        semantic.errorMessage ??
                        "Codex stream ended without a completion event",
                    });
                  }
                  if (
                    outcome === "completed" ||
                    outcome === "bodyless" ||
                    (outcome === "client_cancelled" && completedFrameDelivered)
                  ) {
                    return recordFinalOutcome(account, upstream.status, {
                      terminalOutcome: "completed",
                      ...usageExtra,
                      ...timing,
                    });
                  }
                  if (outcome === "stream_error") {
                    recordAttemptError(account.label, CODEX_ACCOUNT_TYPE, 502);
                    writeAttempt(account, attempt, attemptStartedAt, 502, {
                      errorType: "stream_error",
                      errorCode: getCodexTransportErrorCode(error),
                      errorMessage: summarizeCodexUpstreamError(
                        error instanceof Error ? error.message : "",
                        "Codex upstream stream failed",
                      ),
                      retryable: false,
                    });
                  }
                  return recordFinalOutcome(
                    account,
                    outcome === "client_cancelled" ? 499 : 502,
                    {
                      errorType:
                        outcome === "client_cancelled"
                          ? "client_cancelled"
                          : "stream_error",
                      errorMessage:
                        outcome === "client_cancelled"
                          ? "Client cancelled Codex stream"
                          : summarizeCodexUpstreamError(
                              error instanceof Error ? error.message : "",
                              "Codex upstream stream failed",
                            ),
                      ...(outcome === "stream_error"
                        ? { errorCode: getCodexTransportErrorCode(error) }
                        : {}),
                      terminalOutcome: outcome,
                      ...usageExtra,
                      ...timing,
                    },
                  );
                })
                .catch(() => undefined);
            },
          });
          return relay;
        }

        const errText = await upstream.text().catch(() => "");

        // 401/403 → try a forced token refresh once, then rotate.
        if (
          (upstream.status === 401 || upstream.status === 403) &&
          !authRetried &&
          account.refreshToken
        ) {
          const errorMessage = summarizeCodexUpstreamError(
            errText,
            "Codex authentication rejected upstream",
          );
          recordAttemptError(
            account.label,
            CODEX_ACCOUNT_TYPE,
            upstream.status,
          );
          writeAttempt(account, attempt, attemptStartedAt, upstream.status, {
            errorType: "authentication_error",
            errorMessage,
            retryable: true,
          });
          authRetried = true;
          const staleTokens = {
            accessToken: account.token,
            refreshToken: account.refreshToken,
            expiresAt: account.expiresAt ?? 0,
          };
          try {
            const refreshed = await refreshCodexTokenOnce(
              account.key,
              account.refreshToken,
            );
            account.token = refreshed.accessToken;
            account.refreshToken =
              refreshed.refreshToken ?? account.refreshToken;
            account.expiresAt = refreshed.expiresAt ?? account.expiresAt;
            account.accountId = resolveCodexAccountId(refreshed.accessToken);
            continue; // retry same account with the fresh token
          } catch (error) {
            if (isPermanentCodexRefreshFailure(error)) {
              // Compare-and-swap: the pool is rebuilt per request with no shared
              // state, so a concurrent request may already have rotated this
              // credential. Disabling unconditionally would kill the account that
              // the other request just healed.
              const disabled = await tokenStore.markDisabledIfCurrent(
                account.key,
                staleTokens,
                "refresh_invalid",
              );
              if (disabled) {
                logger.always(
                  `[proxy] codex account=${account.label} disabled until re-authentication. Run: neurolink auth login codex --label ${account.label}`,
                );
              }
              lastFailure = {
                errorType: "authentication_error",
                errorCode: "refresh_invalid",
              };
              lastErrorStatus = 401;
              lastErrorCode = lastFailure.errorCode;
              lastErrorMessage =
                "Codex token refresh failed; re-login required";
              break;
            }
            // No verdict on the credential — cool briefly and try the next
            // account, so a 5xx or a timeout cannot cost the user a login.
            await saveAccountCooldown(
              account.key,
              Date.now() + CODEX_AUTH_COOLDOWN_MS,
              "auth",
            ).catch(() => undefined);
            logger.debug(
              `[proxy] codex account=${account.label} refresh failed transiently; cooling and rotating`,
            );
            lastFailure = {
              errorType: "auth_refresh_unavailable",
              errorCode: getCodexTransportErrorCode(error),
            };
            lastErrorStatus = 503;
            lastErrorCode = lastFailure.errorCode;
            lastErrorMessage = "Codex token refresh temporarily unavailable";
            break;
          }
        }

        // 429 → cooldown + rotate.
        if (upstream.status === 429) {
          const quota = parseCodexRateLimitHeaders(upstream.headers);
          if (quota) {
            saveAccountQuota(account.key, quota).catch(() => undefined);
          }
          const retryAfterMs = parseRetryAfterMs(
            upstream.headers.get("retry-after"),
          );
          const now = Date.now();
          const bodyQuota = parseCodexQuotaError(errText, now);
          const plan = planCodexCooldown(quota, retryAfterMs, now, errText);
          await saveAccountCooldown(
            account.key,
            plan.coolingUntil,
            plan.reason,
          ).catch(() => undefined);
          const rateLimitKind =
            plan.reason === "transient" ? "transient" : "quota";
          const errorMessage = summarizeCodexUpstreamError(
            errText,
            "Codex account rate-limited",
          );
          recordAttemptError(
            account.label,
            CODEX_ACCOUNT_TYPE,
            upstream.status,
            rateLimitKind,
          );
          writeAttempt(account, attempt, attemptStartedAt, upstream.status, {
            errorType: "rate_limit_error",
            errorMessage,
            retryable: rateLimitKind === "transient",
            rateLimitKind,
            cooldownReason: plan.reason,
            ...(bodyQuota
              ? {
                  errorCode: bodyQuota.errorCode,
                  quotaResetAt: bodyQuota.resetAt || undefined,
                  quotaScope: bodyQuota.scope,
                }
              : {}),
          });
          lastFailure = {
            errorType: "rate_limit_error",
            errorCode: bodyQuota?.errorCode,
          };
          lastErrorStatus = 429;
          lastErrorCode = lastFailure.errorCode;
          lastErrorMessage = "Codex account rate-limited";
          break; // rotate
        }

        // Other non-ok → record and rotate.
        if (upstream.status === 401 || upstream.status === 403) {
          // Reached only when the account has no refresh token to retry with, so
          // it will fail identically on the next request. Park it briefly instead
          // of letting it stay first in line with unknown quota.
          await saveAccountCooldown(
            account.key,
            Date.now() + CODEX_AUTH_COOLDOWN_MS,
            "auth",
          ).catch(() => undefined);
        }
        const errorMessage = summarizeCodexUpstreamError(
          errText,
          "Codex error",
        );
        const errorType =
          upstream.status === 401 || upstream.status === 403
            ? "authentication_error"
            : "api_error";
        recordAttemptError(account.label, CODEX_ACCOUNT_TYPE, upstream.status);
        writeAttempt(account, attempt, attemptStartedAt, upstream.status, {
          errorType,
          errorMessage,
          retryable: upstream.status >= 500,
        });
        lastFailure = { errorType };
        lastErrorStatus = upstream.status >= 500 ? 502 : upstream.status;
        lastErrorCode = getProxyUpstreamFailure({
          responseBody: errText,
        })?.code;
        lastErrorMessage = errorMessage;
        break; // rotate
      }
    }

    const outbound = await attemptCodexOutboundFallback({
      ctx,
      body,
      model,
      isFallbackRequest,
      runtimeConfigProvider,
      loopbackPort,
      internalDispatch,
      tracer,
      recordFinalOutcome,
      failureInput: {
        failureClass: "loop_fallthrough",
        lastStatus: lastErrorStatus,
        lastErrorCode,
      },
    });
    if (outbound.kind === "success") {
      // Same reasoning as the transport-catch insertion point above: settle
      // the exhausted Codex account's budget lease immediately rather than
      // holding it open for the unrelated fallback stream's duration.
      await settleBudget();
      budgetLease = undefined;
      budgetDispatched = false;
      return outbound.response;
    }
    if (outbound.kind === "request_too_large") {
      await recordFinalOutcome(lastAttemptedAccount, 413, {
        errorType: "request_too_large",
        errorMessage: outbound.message,
        terminalOutcome: "handler_error",
      });
      return buildCodexErrorResponse(
        413,
        outbound.message,
        "request_too_large",
      );
    }
    await recordFinalOutcome(lastAttemptedAccount, lastErrorStatus, {
      ...lastFailure,
      errorMessage: lastFailure.errorMessage ?? lastErrorMessage,
    });
    return buildCodexErrorResponse(lastErrorStatus, lastErrorMessage);
  };
  try {
    return await dispatch();
  } catch (error) {
    await settleBudget();
    try {
      tracer?.end(502, Date.now() - requestStartTime);
    } catch {
      // Shared HTTP error handling owns the client outcome and final log.
    }
    throw error;
  }
}

/** Accept exact positive limits advertised by successful Codex model discovery. */
function registerCodexDiscoveredLimits(body: string): void {
  if (Buffer.byteLength(body, "utf8") > 2 * 1024 * 1024) {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("models" in parsed) ||
    !Array.isArray(parsed.models)
  ) {
    return;
  }
  for (const candidate of parsed.models.slice(0, 1024)) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const model = candidate.slug ?? candidate.id;
    if (typeof model !== "string" || model.length === 0 || model.length > 256) {
      continue;
    }
    const context = candidate.context_window;
    const output = candidate.max_output_tokens;
    if (Number.isSafeInteger(context) && context > 0) {
      registerRuntimeContextWindow("codex", model, context);
    }
    const knownContext = getRuntimeContextWindow("codex", model);
    if (
      Number.isSafeInteger(output) &&
      output > 0 &&
      (knownContext === undefined || output < knownContext)
    ) {
      registerRuntimeOutputCeiling("codex", model, output);
    } else {
      // Rediscovery may shrink the context or stop advertising an output cap.
      // Do not preserve a stale ceiling that can make every input invalid.
      clearRuntimeOutputCeiling("codex", model);
    }
  }
}

/**
 * Relay Codex model discovery upstream.
 *
 * The CLI refreshes its model list on every invocation. Only `/responses` was
 * registered, so that GET 404'd and the CLI printed a refresh failure before
 * falling back to a default model — quietly ignoring the model the user had
 * configured.
 *
 * This relays rather than synthesises, unlike the Claude and OpenAI `/v1/models`
 * routes, which build their lists locally from the model router. Codex model
 * availability is a property of the upstream account (plan tier, rollout), not
 * of anything this proxy knows, so a synthesised list would be a guess that
 * looks authoritative.
 *
 * Read-only with respect to ROUTING: no cooldown is recorded and no quota is
 * consumed, so a discovery call cannot influence which account real traffic
 * lands on. It is not literally side-effect free — a token refreshed below is
 * persisted, exactly as the proactive refresh in `loadCodexProxyAccounts`
 * persists one. What discovery deliberately never does is *penalise* an
 * account: it cannot cool one and cannot disable one. A read-only probe must
 * not be able to cost the user a login.
 */
async function handleCodexModelsRequest(ctx: ServerContext): Promise<Response> {
  const accounts = await loadCodexProxyAccounts();
  if (accounts.length === 0) {
    return buildCodexErrorResponse(
      401,
      "No Codex accounts configured. Run `neurolink auth login codex`.",
    );
  }

  const now = Date.now();
  const ordered = orderCodexAccounts(accounts, now);
  // A cooling account is rate-limited for completions, not barred from
  // answering what models exist. Healthy accounts go first, but a cooling one
  // is still a candidate rather than a reason to fail discovery outright.
  const isCooling = (a: (typeof ordered)[number]): boolean =>
    a.coolingUntil !== undefined && a.coolingUntil > now;
  const candidates = [
    ...ordered.filter((a) => !isCooling(a)),
    ...ordered.filter(isCooling),
  ];

  // Forward the CLI's own query — it sends client_version, and upstream
  // *requires* it: without it ChatGPT answers 400 with a pydantic
  // "Field required" on ('query','client_version'). Rebuild from ctx.query,
  // not ctx.path: path carries no query string, so reading it there silently
  // dropped the parameter and produced exactly that 400.
  const params = new URLSearchParams(ctx.query ?? {});
  const query = params.toString();
  const url = query ? `${CODEX_MODELS_URL}?${query}` : CODEX_MODELS_URL;

  let lastErrorStatus = 502;
  let lastErrorMessage = "Codex model discovery upstream failed";

  for (const account of candidates) {
    // One forced refresh per account, then move on. A token can be rejected
    // upstream while still inside its local expiry window, so relaying that
    // 401 straight back left discovery broken until the token expired locally
    // — the CLI would fall back to a default model on every invocation in the
    // meantime.
    let authRetried = false;
    for (;;) {
      let upstream: Response;
      try {
        upstream = await fetch(url, {
          method: "GET",
          headers: buildCodexUpstreamHeaders(ctx.headers ?? {}, account),
          // Bound the upstream call, as the responses route does. Without a
          // signal a stalled connection holds the proxy request open with no
          // ceiling, and the CLI blocks on model discovery at startup.
          signal: AbortSignal.any([
            ...(ctx.abortSignal ? [ctx.abortSignal] : []),
            AbortSignal.timeout(CODEX_UPSTREAM_TIMEOUT_MS),
          ]),
        });
      } catch (error) {
        lastErrorStatus = 502;
        lastErrorMessage = `Codex model discovery upstream failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        break; // rotate to the next account
      }

      if (upstream.status === 401 || upstream.status === 403) {
        if (!authRetried && account.refreshToken) {
          authRetried = true;
          try {
            const refreshed = await refreshCodexTokenOnce(
              account.key,
              account.refreshToken,
            );
            account.token = refreshed.accessToken;
            account.refreshToken =
              refreshed.refreshToken ?? account.refreshToken;
            account.expiresAt = refreshed.expiresAt ?? account.expiresAt;
            account.accountId = resolveCodexAccountId(refreshed.accessToken);
            continue; // retry this account with the fresh token
          } catch {
            // No cooldown and no disable, unlike the responses path: the
            // verdict a completion draws from a failed refresh is earned by a
            // request the user actually made. Discovery fires on every CLI
            // invocation, so letting it disable an account would turn a
            // background probe into a forced re-login.
            lastErrorStatus = 401;
            lastErrorMessage = "Codex token refresh failed; re-login required";
            break; // rotate
          }
        }
        lastErrorStatus = upstream.status;
        lastErrorMessage = "Codex model discovery rejected upstream";
        break; // rotate
      }

      // Every other status — including a 400 — is upstream's real answer to a
      // well-formed request and is relayed unchanged. A 400 here means the
      // query was not forwarded correctly, and hiding it behind a retry would
      // bury the exact regression this route was added to fix.
      const body = await upstream.text();
      if (upstream.ok) {
        registerCodexDiscoveredLimits(body);
      }
      const contentType =
        upstream.headers.get("content-type") ?? "application/json";
      return new Response(body, {
        status: upstream.status,
        headers: { "content-type": contentType },
      });
    }
  }

  // A discovery failure must not look like a missing route, or the next
  // person debugging it re-opens this same issue.
  return buildCodexErrorResponse(lastErrorStatus, lastErrorMessage);
}

/**
 * Route-creation-time-only check: the Codex-outbound-fallback dispatcher's
 * `anthropic` target needs the in-process loopback (`loopbackPort` and/or
 * `internalDispatch`) to reach the Anthropic pool, and `createAllRoutes` /
 * `registerAllRoutes` (`src/lib/server/routes/index.ts`) has no option that
 * threads either through — only the CLI proxy command
 * (`cli/commands/proxy.ts`) passes them directly to this function today. A
 * consumer that enables the feature with an `anthropic` target through the
 * generic SDK route surface would otherwise fail every such request silently
 * behind `attemptCodexOutboundFallback`'s "no loopback port configured"
 * warning, one per request, with nothing at startup explaining why. This
 * logs ONE clear warning here instead, at the point the routes are built,
 * rather than adding a new public option (ruling: don't grow
 * `CreateRoutesOptions` for this — document the limitation and warn).
 * A `vertex`-only configuration never reads `loopbackPort`, so it is exempt.
 */
function warnIfAnthropicOutboundFallbackUnreachable(
  runtimeConfigProvider: ProxyRuntimeConfigProvider | undefined,
  loopbackPort: number | undefined,
  internalDispatch:
    | ((request: Request) => Response | Promise<Response>)
    | undefined,
): void {
  if (
    !runtimeConfigProvider ||
    loopbackPort !== undefined ||
    internalDispatch
  ) {
    return;
  }
  let snapshot: ReturnType<ProxyRuntimeConfigProvider>;
  try {
    snapshot = runtimeConfigProvider();
  } catch {
    // Same fail-open contract as the request-time reader below: a provider
    // that throws at creation time is not this check's problem to surface.
    return;
  }
  if (!snapshot.codexOutboundFallbackEnabled) {
    return;
  }
  const hasAnthropicTarget = (snapshot.codexOutboundFallbackTargets ?? []).some(
    (target) => target.provider === "anthropic",
  );
  if (!hasAnthropicTarget) {
    return;
  }
  logger.warn(
    "[codex-outbound-fallback] enabled with an anthropic target, but createCodexProxyRoutes " +
      "was called without loopbackPort or internalDispatch — the anthropic leg cannot dispatch " +
      "and every such request will fail at attempt time. This SDK route surface " +
      "(createAllRoutes/registerAllRoutes) does not thread the in-process loopback through; " +
      "only the CLI proxy command wires it. See docs/features/codex-proxy-support.md.",
  );
}

/**
 * Create Codex proxy routes.
 *
 * @param basePath - Base path prefix (default "").
 * @param runtimeConfigProvider - Optional runtime config snapshot reader.
 *   Gates the Codex-outbound fallback dispatcher at all four insertion
 *   points in `dispatch()`: omitting it (or a snapshot with the feature
 *   disabled / no targets configured) reproduces today's behavior exactly.
 * @param loopbackPort - The in-process HTTP port the outbound-fallback leg's
 *   Anthropic-pool loopback request targets (mirrors `createOpenAIProxyRoutes`'s
 *   bridge). Required only for an `anthropic` target; the `vertex` target
 *   dispatches via `executeVertexAnthropicFallback` and never reads it.
 * @param internalDispatch - Optional in-process fetch (`(request) =>
 *   app.fetch(request)`), so the outbound-fallback loopback never re-enters
 *   the public listener. Falls back to a real `fetch` against
 *   `loopbackPort` when omitted.
 * @returns RouteGroup with the Codex backend Responses endpoint.
 */
export function createCodexProxyRoutes(
  basePath: string = "",
  runtimeConfigProvider?: ProxyRuntimeConfigProvider,
  loopbackPort?: number,
  internalDispatch?: (request: Request) => Response | Promise<Response>,
): RouteGroup {
  warnIfAnthropicOutboundFallbackUnreachable(
    runtimeConfigProvider,
    loopbackPort,
    internalDispatch,
  );
  return {
    prefix: `${basePath}/backend-api/codex`,
    routes: [
      {
        method: "POST",
        path: `${basePath}/backend-api/codex/responses`,
        description: "Codex ChatGPT-backend Responses API (account pool)",
        handler: (ctx: ServerContext) =>
          handleCodexResponsesRequest(
            ctx,
            runtimeConfigProvider,
            loopbackPort,
            internalDispatch,
          ),
      },
      {
        method: "GET",
        path: `${basePath}/backend-api/codex/models`,
        description: "Codex model discovery, relayed upstream (account pool)",
        handler: (ctx: ServerContext) => handleCodexModelsRequest(ctx),
      },
    ],
  };
}

export const __testHooks = {
  loadCodexProxyAccounts,
  orderCodexAccounts,
  buildCodexUpstreamHeaders,
  planCodexCooldown,
  refreshCodexTokenOnce,
  refreshCodexTokenOnceWithDependencies,
  codexRefreshInFlightSize: (): number => codexRefreshInFlight.size,
  setOutboundFallbackTimeoutMsForTests: (ms: number | null): void => {
    codexOutboundFallbackTimeoutOverrideMs = ms;
  },
  wrapCodexOutboundResponseStream,
};
