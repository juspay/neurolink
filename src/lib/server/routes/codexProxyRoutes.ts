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
import {
  registerProxyResponseObserver,
  isProxyRequestFinalized,
} from "../../proxy/proxyActivity.js";
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
import { resolveProxyLogTraceContext } from "../../proxy/proxyTraceContext.js";
import { isBorrowedRequest } from "../../proxy/shareContext.js";
import { ProxyTracer } from "../../proxy/proxyTracer.js";
import { parseRetryAfterMs } from "../../proxy/routingPolicy.js";
import {
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
} from "../../proxy/usageStats.js";
import type {
  AccountQuota,
  CodexAttemptLogExtra,
  CodexFinalLogExtra,
  CodexQuotaError,
  CodexRefreshTokenStore,
  CodexRuntimeAccount,
  CodexTokenRefresher,
  RateLimitCoolingReason,
  RouteGroup,
  ServerContext,
  ProxyContextEvidence,
  ProxyPreparedContext,
  ProxyTokenBudgetLease,
} from "../../types/index.js";
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
 * Build a terminal Codex Responses SSE stream for a quota-exhaustion failure
 * that never reached an upstream request (every pooled account is cooling).
 * A bare non-2xx status with no body reads to the Codex CLI as a dropped
 * connection, so it shows "Reconnecting... waiting for network" forever
 * instead of a real error. Emitting a well-formed `response.failed` event —
 * the same terminal shape the CLI already parses out of a live stream —
 * lets it render the actual failure instead.
 */
function buildCodexQuotaExhaustedResponse(
  message: string,
  retryAfterSec?: number,
): Response {
  const payload = {
    type: "response.failed",
    response: {
      error: {
        type: "insufficient_quota",
        code: "insufficient_quota",
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

/** Core pooled handler for POST /backend-api/codex/responses. */
export async function handleCodexResponsesRequest(
  ctx: ServerContext,
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
  const response = await executeCodexResponsesRequest(ctx);
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

async function executeCodexResponsesRequest(
  ctx: ServerContext,
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
      await recordFinalOutcome(undefined, 429, {
        errorType: "all_accounts_cooling",
        errorMessage: "All Codex accounts are rate-limited",
      });
      const resetAt = soonest ? new Date(soonest).toISOString() : undefined;
      return buildCodexQuotaExhaustedResponse(
        resetAt
          ? `Codex quota exhausted: all accounts are rate-limited. Resets at ${resetAt}.`
          : "Codex quota exhausted: all accounts are rate-limited.",
        retryAfterSec,
      );
    }

    let attempt = 0;
    let lastErrorMessage = "All Codex accounts failed";
    let lastErrorStatus = 502;
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
                        cacheReadTokens: usage.cacheReadTokens,
                        cacheCreationTokens: usage.cacheCreationTokens,
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
        lastErrorMessage = errorMessage;
        break; // rotate
      }
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
 * Create Codex proxy routes.
 *
 * @param basePath - Base path prefix (default "").
 * @returns RouteGroup with the Codex backend Responses endpoint.
 */
export function createCodexProxyRoutes(basePath: string = ""): RouteGroup {
  return {
    prefix: `${basePath}/backend-api/codex`,
    routes: [
      {
        method: "POST",
        path: `${basePath}/backend-api/codex/responses`,
        description: "Codex ChatGPT-backend Responses API (account pool)",
        handler: (ctx: ServerContext) => handleCodexResponsesRequest(ctx),
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
};
