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
import { logRequest } from "../../proxy/requestLogger.js";
import { parseRetryAfterMs } from "../../proxy/routingPolicy.js";
import type {
  AccountCoolingReason,
  AccountQuota,
  CodexRuntimeAccount,
  RouteGroup,
  ServerContext,
  RequestLogEntry,
} from "../../types/index.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { logger } from "../../utils/logger.js";

const CODEX_UPSTREAM_TIMEOUT_MS = 15 * 60 * 1000; // 15 min, matches Claude path
const DEFAULT_TRANSIENT_COOLDOWN_MS = 60_000;
const MAX_TRANSIENT_COOLDOWN_MS = 15 * 60 * 1000;
/** Brief park after a refresh attempt that never reached a verdict. */
const CODEX_AUTH_COOLDOWN_MS = 60_000;

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

/** Refresh an account's token at most once at a time. */
async function refreshCodexTokenOnce(
  key: string,
  refreshToken: string,
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
    const latest = await tokenStore.peekTokens(key).catch(() => null);
    const current = latest?.refreshToken ?? refreshToken;
    const refreshed = await refreshCodexToken(current);
    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? current,
      expiresAt: refreshed.expiresAt,
    };
  })().finally(() => {
    codexRefreshInFlight.delete(key);
  });
  codexRefreshInFlight.set(key, pending);
  return pending;
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
function buildCodexErrorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: { type: "proxy_error", message } }),
    { status, headers: { "content-type": "application/json" } },
  );
}

/**
 * Load the Codex account pool from the token store, refreshing expired OAuth
 * tokens and hydrating cooldown + quota state from disk.
 */
async function loadCodexProxyAccounts(): Promise<CodexRuntimeAccount[]> {
  const keys = await tokenStore.listByPrefix(CODEX_ACCOUNT_PREFIX);
  const [cooldowns, quotas] = await Promise.all([
    loadAccountCooldowns(),
    loadAccountQuotas(),
  ]);
  const now = Date.now();
  const accounts: CodexRuntimeAccount[] = [];

  for (const key of keys) {
    if (await tokenStore.isDisabled(key)) {
      continue;
    }
    const tokens = await tokenStore.loadTokens(key);
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
        await tokenStore.saveTokens(key, {
          accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: expiresAt ?? Date.now() + 3_600_000,
          tokenType: "Bearer",
          scope: tokens.scope,
        });
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
 * Order accounts fill-first by quota: eligible (not cooling) first, then least
 * session utilization, treating unknown quota as "probe first" so a fresh
 * account gets observed rather than starved.
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
    const aUsed = a.quota ? a.quota.sessionUsed : -1;
    const bUsed = b.quota ? b.quota.sessionUsed : -1;
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

/**
 * Classify a 429 into a cooldown plan. Codex reports primary (session) and
 * secondary (weekly) windows; a rejected window cools until its reset, a plain
 * burst limit cools briefly and clamps to 15 min.
 */
function planCodexCooldown(
  quota: AccountQuota | null,
  retryAfterMs: number,
  now: number,
): { coolingUntil: number; reason: AccountCoolingReason } {
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
  const delay = Math.min(
    MAX_TRANSIENT_COOLDOWN_MS,
    Math.max(retryAfterMs, DEFAULT_TRANSIENT_COOLDOWN_MS),
  );
  return { coolingUntil: now + delay, reason: "transient" };
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
  if (quota) {
    ctx.responseHeaders["x-neurolink-quota-session-left-pct"] = String(
      Math.round((1 - quota.sessionUsed) * 100),
    );
    ctx.responseHeaders["x-neurolink-weekly-left-pct"] = String(
      Math.round((1 - quota.weeklyUsed) * 100),
    );
  }
}

/** Core pooled handler for POST /backend-api/codex/responses. */
export async function handleCodexResponsesRequest(
  ctx: ServerContext,
): Promise<Response> {
  const requestStartTime = Date.now();
  const body = ctx.body ?? {};
  const bodyStr = JSON.stringify(body);
  const model =
    typeof (body as Record<string, unknown>).model === "string"
      ? ((body as Record<string, unknown>).model as string)
      : "-";

  const writeLog = (
    account: string,
    responseStatus: number,
    extra: Partial<
      Pick<
        RequestLogEntry,
        | "errorType"
        | "errorMessage"
        | "provider"
        | "inputTokens"
        | "outputTokens"
        | "cacheReadTokens"
        | "cacheCreationTokens"
      >
    > = {},
  ): Promise<void> =>
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model,
      stream: true,
      toolCount: Array.isArray((body as Record<string, unknown>).tools)
        ? ((body as Record<string, unknown>).tools as unknown[]).length
        : 0,
      account,
      accountType: "codex-oauth",
      ...buildClientAttribution(ctx.headers),
      responseStatus,
      responseTimeMs: Date.now() - requestStartTime,
      ...extra,
    });

  const accounts = await loadCodexProxyAccounts();
  if (accounts.length === 0) {
    await writeLog("", 401, {
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
      return min === undefined ? a.coolingUntil : Math.min(min, a.coolingUntil);
    }, undefined);
    const retryAfterSec = soonest
      ? Math.max(1, Math.ceil((soonest - now) / 1000))
      : 60;
    await writeLog("", 429, {
      errorType: "all_accounts_cooling",
      errorMessage: "All Codex accounts are rate-limited",
    });
    return new Response(
      JSON.stringify({
        error: {
          type: "rate_limit_error",
          message: "All Codex accounts are currently rate-limited",
        },
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfterSec),
        },
      },
    );
  }

  let attempt = 0;
  let lastErrorMessage = "All Codex accounts failed";
  let lastErrorStatus = 502;

  for (const account of eligible) {
    attempt += 1;
    let authRetried = false;

    // Same-account loop only re-runs once, for a post-401 token refresh.
    for (;;) {
      let upstream: Response;
      try {
        upstream = await fetch(CODEX_RESPONSES_URL, {
          method: "POST",
          headers: buildCodexUpstreamHeaders(ctx.headers, account),
          body: bodyStr,
          signal: AbortSignal.timeout(CODEX_UPSTREAM_TIMEOUT_MS),
        });
      } catch (error) {
        // A transport failure message is derived from local state — resolved
        // hostnames, socket paths, Node internals — and says nothing the caller
        // can act on. Keep the detail in the log and return a fixed string, so
        // internal topology never reaches the client.
        logger.debug(
          `Codex upstream fetch failed (${account.label}): ${sanitizeForLog(
            error instanceof Error ? error.message : String(error),
          )}`,
        );
        lastErrorMessage = "Codex upstream request failed";
        lastErrorStatus = 502;
        break; // rotate to next account
      }

      if (upstream.ok) {
        const quota = parseCodexRateLimitHeaders(upstream.headers);
        if (quota) {
          saveAccountQuota(account.key, quota).catch(() => undefined);
        }
        // A prior cooldown that has expired is cleared on success. The
        // compare-and-swap guards against wiping a longer cooldown that another
        // in-flight request set while this one was upstream.
        if (account.expiredCooldownUntil !== undefined) {
          clearAccountCooldown(account.key, account.expiredCooldownUntil).catch(
            () => undefined,
          );
        }
        publishCodexHeaders(ctx, account, attempt, quota);
        await writeLog(account.label, upstream.status);
        const headers: Record<string, string> = {
          "content-type":
            upstream.headers.get("content-type") ?? "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          ...(ctx.responseHeaders ?? {}),
        };

        // Tap the relay for token usage. The log above is written first and
        // unconditionally so a request is never lost when a client hangs up
        // mid-stream; this emits a second record for the same requestId
        // carrying the counts, which proxyAnalysis merges. If the stream shape
        // is not recognised, usage resolves null and nothing extra is written —
        // i.e. exactly the previous behaviour.
        if (!upstream.body) {
          return new Response(upstream.body, {
            status: upstream.status,
            headers,
          });
        }
        const { stream: usageTap, usage: usageSeen } = createCodexUsageTap();
        usageSeen
          .then((usage) => {
            if (!usage) {
              return;
            }
            return writeLog(account.label, upstream.status, {
              provider: "openai",
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              cacheReadTokens: usage.cacheReadTokens,
              cacheCreationTokens: usage.cacheCreationTokens,
            });
          })
          .catch(() => undefined);

        return new Response(upstream.body.pipeThrough(usageTap), {
          status: upstream.status,
          headers,
        });
      }

      const errText = await upstream.text().catch(() => "");

      // 401/403 → try a forced token refresh once, then rotate.
      if (
        (upstream.status === 401 || upstream.status === 403) &&
        !authRetried &&
        account.refreshToken
      ) {
        authRetried = true;
        const staleTokens = {
          accessToken: account.token,
          refreshToken: account.refreshToken,
          expiresAt: account.expiresAt ?? 0,
        };
        try {
          const refreshed = await refreshCodexToken(account.refreshToken);
          account.token = refreshed.accessToken;
          account.refreshToken = refreshed.refreshToken ?? account.refreshToken;
          account.expiresAt = refreshed.expiresAt ?? account.expiresAt;
          account.accountId = resolveCodexAccountId(refreshed.accessToken);
          await tokenStore.saveTokens(account.key, {
            accessToken: account.token,
            refreshToken: account.refreshToken,
            expiresAt: account.expiresAt ?? Date.now() + 3_600_000,
            tokenType: "Bearer",
          });
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
            lastErrorStatus = 401;
            lastErrorMessage = "Codex token refresh failed; re-login required";
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
        const plan = planCodexCooldown(quota, retryAfterMs, Date.now());
        await saveAccountCooldown(
          account.key,
          plan.coolingUntil,
          plan.reason,
        ).catch(() => undefined);
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
      lastErrorStatus = upstream.status >= 500 ? 502 : upstream.status;
      lastErrorMessage = sanitizeForLog(errText).slice(0, 200) || "Codex error";
      break; // rotate
    }
  }

  await writeLog("", lastErrorStatus, {
    errorType: "all_accounts_failed",
    errorMessage: lastErrorMessage,
  });
  return buildCodexErrorResponse(lastErrorStatus, lastErrorMessage);
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
          signal: AbortSignal.timeout(CODEX_UPSTREAM_TIMEOUT_MS),
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
            const refreshed = await refreshCodexToken(account.refreshToken);
            account.token = refreshed.accessToken;
            account.refreshToken =
              refreshed.refreshToken ?? account.refreshToken;
            account.expiresAt = refreshed.expiresAt ?? account.expiresAt;
            account.accountId = resolveCodexAccountId(refreshed.accessToken);
            await tokenStore.saveTokens(account.key, {
              accessToken: account.token,
              refreshToken: account.refreshToken,
              expiresAt: account.expiresAt ?? Date.now() + 3_600_000,
              tokenType: "Bearer",
            });
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
  codexRefreshInFlightSize: (): number => codexRefreshInFlight.size,
};
