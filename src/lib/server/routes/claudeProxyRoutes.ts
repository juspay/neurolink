/**
 * Claude-Compatible Proxy Routes
 *
 * Exposes Anthropic-compatible /v1/messages, /v1/models, and /v1/messages/count_tokens
 * endpoints. ALL requests are routed through ctx.neurolink.generate() / ctx.neurolink.stream()
 * -- no direct HTTP calls to Anthropic.
 *
 * An optional ModelRouter can remap incoming model names to different
 * provider/model pairs (e.g. "claude-sonnet-4-20250514" -> vertex/gemini-2.5-pro).
 * Without a router, models are passed through to the Anthropic provider.
 */

import type { RouteGroup, ServerContext } from "../types.js";
import type { ModelRouter } from "../../proxy/modelRouter.js";
import {
  parseClaudeRequest,
  serializeClaudeResponse,
  ClaudeStreamSerializer,
  buildClaudeError,
  generateToolUseId,
} from "../../proxy/claudeFormat.js";
import type { ClaudeRequest, InternalResult } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import {
  recordRequest,
  recordSuccess,
  recordError,
  recordCooldown,
} from "../../proxy/usageStats.js";
import {
  logRequest,
  logFullRequestResponse,
  logStreamError,
} from "../../proxy/requestLogger.js";
import {
  parseQuotaHeaders,
  saveAccountQuota,
} from "../../proxy/accountQuota.js";
import {
  needsRefresh,
  refreshToken,
  persistTokens,
} from "../../proxy/tokenRefresh.js";
import type {
  RuntimeAccountState,
  ProxyPassthroughAccount,
} from "../../types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Header names whose values must be masked in debug logs. */
const SENSITIVE_HEADERS = new Set(["authorization", "x-api-key"]);

/** Headers that must never be forwarded upstream to Anthropic. */
const BLOCKED_UPSTREAM_HEADERS = new Set([
  "cookie",
  "proxy-authorization",
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
]);

/** Return a shallow copy of `headers` with sensitive values redacted. */
function redactSensitiveHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase()) && value.length > 8) {
      redacted[key] = value.substring(0, 8) + "...";
    } else if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      redacted[key] = "***";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** Fill-first: index of the current primary account. Only advances when
 *  the current account hits a 429 or auth failure that puts it on cooldown. */
let primaryAccountIndex = 0;

const MAX_AUTH_RETRIES = 5;
const MAX_CONSECUTIVE_REFRESH_FAILURES = 15;

/** Decision 8: Cooldowns only for 401 and 429. */
const AUTH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes for 401
const RATE_LIMIT_BACKOFF_BASE_MS = 1000; // 1 second base for 429
const RATE_LIMIT_BACKOFF_CAP_MS = 10 * 60 * 1000; // 10 minute cap for 429
/** Timeout for upstream requests to Anthropic. Generous to allow long-running
 *  streaming responses to start, but prevents infinite hangs. */
const UPSTREAM_FETCH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const accountRuntimeState = new Map<string, RuntimeAccountState>();

/** Track whether we've run the one-time startup prune. */
let startupPruneDone = false;

/** Advance the primary account index when the current primary is put on cooldown.
 *  This is what makes fill-first work: we stick to one account until it's unusable.
 *  Only advances when the account being cooled IS the current primary; otherwise
 *  it's already a fallback and advancing would disrupt the fill-first ordering. */
function advancePrimaryIfCurrent(
  accountKey: string,
  enabledCount: number,
  primaryAccountKey: string | undefined,
): void {
  if (enabledCount <= 1) {
    return;
  }
  // Only advance if the cooled account is the current primary
  if (accountKey !== primaryAccountKey) {
    return;
  }
  primaryAccountIndex = (primaryAccountIndex + 1) % enabledCount;
}

// ---------------------------------------------------------------------------
// Legacy credential refresh helper (extracted to reduce block nesting)
// ---------------------------------------------------------------------------

async function tryLoadLegacyAccount(
  creds: {
    oauth?: { accessToken?: string; refreshToken?: string; expiresAt?: number };
  },
  legacyCredPath: string,
): Promise<ProxyPassthroughAccount | undefined> {
  if (!creds.oauth?.accessToken) {
    return undefined;
  }

  let legacyToken = creds.oauth.accessToken;
  let legacyRefresh = creds.oauth.refreshToken;
  let legacyExpiry = creds.oauth.expiresAt;
  const legacyExpired = legacyExpiry ? legacyExpiry < Date.now() : false;

  if (!legacyExpired) {
    return {
      key: "anthropic:legacy-default",
      label: "default",
      token: legacyToken,
      refreshToken: legacyRefresh,
      expiresAt: legacyExpiry,
      type: "oauth",
      persistTarget: { credPath: legacyCredPath },
    };
  }

  if (!legacyRefresh) {
    logger.always(
      "[proxy] skipping legacy account (expired, no refresh token)",
    );
    return undefined;
  }

  const tmp = {
    token: legacyToken,
    refreshToken: legacyRefresh,
    expiresAt: legacyExpiry,
    label: "default",
  };
  const ok = await refreshToken(tmp);
  if (!ok.success) {
    logger.always(
      `[proxy] skipping legacy account (expired, refresh failed: ${ok.error?.slice(0, 200) ?? "unknown"})`,
    );
    return undefined;
  }

  legacyToken = tmp.token;
  legacyRefresh = tmp.refreshToken;
  legacyExpiry = tmp.expiresAt;
  await persistTokens(legacyCredPath, tmp);
  logger.always("[proxy] refreshed legacy account at startup");

  return {
    key: "anthropic:legacy-default",
    label: "default",
    token: legacyToken,
    refreshToken: legacyRefresh,
    expiresAt: legacyExpiry,
    type: "oauth",
    persistTarget: { credPath: legacyCredPath },
  };
}

export type { ClaudeProxyDeps } from "../../types/index.js";

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create Claude-compatible proxy routes.
 *
 * Every request flows through ctx.neurolink.generate() or ctx.neurolink.stream().
 * No direct fetch() calls to api.anthropic.com.
 *
 * @param modelRouter - Optional model router for remapping model names.
 * @param basePath    - Base path prefix (default: "" since Claude API uses /v1/...).
 * @returns RouteGroup with Claude-compatible endpoints.
 */
export function createClaudeProxyRoutes(
  modelRouter?: ModelRouter,
  basePath: string = "",
  accountStrategy: "round-robin" | "fill-first" = "fill-first",
): RouteGroup {
  return {
    prefix: `${basePath}/v1`,
    routes: [
      // =====================================================================
      // POST /v1/messages -- Main chat completions endpoint
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/v1/messages`,
        handler: async (ctx: ServerContext) => {
          const body = ctx.body as ClaudeRequest | undefined;

          // 1. Validate
          if (!body?.model || !body?.messages) {
            return buildClaudeError(
              400,
              "Missing required fields: model, messages",
            );
          }

          // 2. Resolve model via router (or pass through to anthropic)
          const route = modelRouter?.resolve(body.model) ?? {
            provider: "anthropic",
            model: body.model,
          };

          try {
            // 3. Route based on target provider
            const isClaudeTarget =
              route.provider === "anthropic" || route.provider === null;

            if (isClaudeTarget) {
              // ─── PASSTHROUGH MODE (Claude → Claude) ───────────────
              const fs = await import("fs");
              const os = await import("os");
              const accounts: ProxyPassthroughAccount[] = [];
              const legacyCredPath = `${(os as typeof import("os")).homedir()}/.neurolink/anthropic-credentials.json`;

              // 1. Compound keys from TokenStore
              // Skip accounts with expired tokens and no refresh token.
              // For expired tokens WITH a refresh token, attempt ONE refresh
              // before adding — if it fails, skip the account entirely.
              const { tokenStore } = await import("../../auth/tokenStore.js");

              // Decision 10D: Auto-prune dead entries once on first request (startup)
              if (!startupPruneDone) {
                await tokenStore.pruneExpired();
                startupPruneDone = true;
              }

              const compoundKeys = await tokenStore.listByPrefix("anthropic:");
              for (const key of compoundKeys) {
                // Decision 10D + Hot-reload: Skip disabled accounts UNLESS credentials changed
                if (await tokenStore.isDisabled(key)) {
                  const existingState = getOrCreateRuntimeState(key);
                  // Check if credentials were refreshed/re-authed since disable.
                  // On cold start, lastToken is empty — don't treat that as a
                  // credential change; only compare on subsequent reloads.
                  const tokens = await tokenStore.loadTokens(key);
                  const hasTrackedTokens =
                    existingState.lastToken !== undefined &&
                    existingState.lastToken !== "";
                  const tokenChanged =
                    tokens &&
                    hasTrackedTokens &&
                    (existingState.lastToken !== tokens.accessToken ||
                      existingState.lastRefreshToken !== tokens.refreshToken);
                  if (tokenChanged) {
                    // Credentials changed — auto-enable and use this account
                    await tokenStore.markEnabled(key);
                    logger.always(
                      `[proxy] account=${key.split(":")[1] ?? key} re-enabled (credentials changed)`,
                    );
                    existingState.permanentlyDisabled = false;
                    existingState.coolingUntil = undefined;
                    existingState.backoffLevel = 0;
                    existingState.consecutiveRefreshFailures = 0;
                  } else {
                    logger.debug(
                      `[proxy] skipping disabled account=${key.split(":")[1] ?? key}`,
                    );
                    existingState.permanentlyDisabled = true;
                    continue;
                  }
                }

                const tokens = await tokenStore.loadTokens(key);
                if (!tokens) {
                  continue;
                }

                let accessToken = tokens.accessToken;
                let refreshTok = tokens.refreshToken;
                let expiresAt = tokens.expiresAt;

                // Check if token is expired
                const isExpired = expiresAt ? expiresAt < Date.now() : false;

                if (isExpired) {
                  const label = key.split(":")[1] ?? key;
                  // Check if already marked dead from a previous request
                  const existingState = getOrCreateRuntimeState(key);
                  if (existingState.permanentlyDisabled) {
                    // Already known dead — skip silently (no log spam)
                    continue;
                  }

                  if (!refreshTok) {
                    logger.always(
                      `[proxy] skipping account=${label} (expired, no refresh token)`,
                    );
                    await disableAccountUntilReauth(
                      { key, label, token: accessToken, type: "oauth" },
                      existingState,
                    );
                    continue;
                  }
                  // Try ONE refresh before adding
                  const tempAccount = {
                    token: accessToken,
                    refreshToken: refreshTok,
                    expiresAt,
                    label,
                  };
                  const refreshed = await refreshToken(tempAccount);
                  if (!refreshed.success) {
                    logger.always(
                      `[proxy] skipping account=${label} (expired, refresh failed: ${refreshed.error?.slice(0, 200) ?? "unknown"})`,
                    );
                    await disableAccountUntilReauth(
                      { key, label, token: accessToken, type: "oauth" },
                      existingState,
                    );
                    continue;
                  }
                  // Refresh succeeded — use new token and persist
                  accessToken = tempAccount.token;
                  refreshTok = tempAccount.refreshToken;
                  expiresAt = tempAccount.expiresAt;
                  await tokenStore.saveTokens(key, {
                    accessToken,
                    refreshToken: refreshTok,
                    expiresAt: expiresAt ?? Date.now() + 3600_000,
                    tokenType: "Bearer",
                  });
                  logger.always(
                    `[proxy] refreshed expired account=${key.split(":")[1] ?? key} at startup`,
                  );
                }

                // Detect whether this is an API key or an OAuth token.
                // Use the stored tokenType (set at auth time) rather than a
                // prefix heuristic — both API keys (sk-ant-api03-…) and OAuth
                // access tokens (sk-ant-oat01-…) share the "sk-ant-" prefix.
                const accountType: "oauth" | "api_key" =
                  tokens.tokenType === "Bearer" ? "oauth" : "api_key";

                accounts.push({
                  key,
                  label: key.split(":")[1] ?? key,
                  token: accessToken,
                  refreshToken: refreshTok,
                  expiresAt,
                  type: accountType,
                  persistTarget: { providerKey: key },
                });
              }

              // 2. Legacy credentials file (only if no usable compound account was loaded)
              if (accounts.length === 0) {
                try {
                  const creds = JSON.parse(
                    (fs as typeof import("fs")).readFileSync(
                      legacyCredPath,
                      "utf8",
                    ),
                  ) as {
                    oauth?: {
                      accessToken?: string;
                      refreshToken?: string;
                      expiresAt?: number;
                    };
                  };
                  const legacyAccount = await tryLoadLegacyAccount(
                    creds,
                    legacyCredPath,
                  );
                  if (legacyAccount) {
                    accounts.push(legacyAccount);
                  }
                } catch {
                  // no-op: file absent or invalid
                }
              }

              // 3. Env var — only use as fallback when no OAuth accounts are available.
              if (process.env.ANTHROPIC_API_KEY && accounts.length === 0) {
                accounts.push({
                  key: "anthropic:env",
                  label: "env",
                  token: process.env.ANTHROPIC_API_KEY,
                  type: "api_key",
                });
              }

              if (accounts.length === 0) {
                return buildClaudeError(401, "No Anthropic credentials found");
              }

              // Sync in-memory runtime state with current token material.
              for (const account of accounts) {
                const state = getOrCreateRuntimeState(account.key);
                const tokenChanged =
                  state.lastToken !== account.token ||
                  state.lastRefreshToken !== account.refreshToken;
                if (tokenChanged) {
                  if (state.permanentlyDisabled) {
                    logger.always(
                      `[proxy] account=${account.label} credentials changed, re-enabling`,
                    );
                  }
                  state.coolingUntil = undefined;
                  state.backoffLevel = 0;
                  state.consecutiveRefreshFailures = 0;
                  state.permanentlyDisabled = false;
                }
                state.lastToken = account.token;
                state.lastRefreshToken = account.refreshToken;
              }

              const enabledAccounts = accounts.filter((account) => {
                return !getOrCreateRuntimeState(account.key)
                  .permanentlyDisabled;
              });

              if (enabledAccounts.length === 0) {
                return buildClaudeError(
                  401,
                  formatReauthMessage(accounts.map((account) => account.label)),
                );
              }

              // Order accounts based on the configured strategy.
              // - fill-first: always start with the primary account;
              //   only fall over when the primary is cooling down (429/401).
              // - round-robin: rotate the starting index on every request
              //   so traffic is spread evenly across accounts.
              const orderedAccounts = [...enabledAccounts];
              if (orderedAccounts.length > 1) {
                if (accountStrategy === "round-robin") {
                  // Advance the index on every request for even distribution
                  const idx = primaryAccountIndex % orderedAccounts.length;
                  primaryAccountIndex =
                    (primaryAccountIndex + 1) % orderedAccounts.length;
                  if (idx > 0) {
                    const head = orderedAccounts.splice(0, idx);
                    orderedAccounts.push(...head);
                  }
                } else {
                  // fill-first (default): clamp primaryAccountIndex
                  const idx = primaryAccountIndex % orderedAccounts.length;
                  if (idx > 0) {
                    const head = orderedAccounts.splice(0, idx);
                    orderedAccounts.push(...head);
                  }
                }
              }

              let lastError: unknown;
              let sawRateLimit = false;
              let sawNetworkError = false;
              let sawTransientFailure = false;
              let authFailureMessage: string | null = null;
              const bodyStr = JSON.stringify(body);
              const requestStart = Date.now();
              const toolCount = Array.isArray(body.tools)
                ? body.tools.length
                : 0;
              const url = "https://api.anthropic.com/v1/messages?beta=true";
              const clientHeaders = ctx.headers ?? {};

              for (const account of orderedAccounts) {
                const accountState = getOrCreateRuntimeState(account.key);
                if (
                  accountState.coolingUntil &&
                  accountState.coolingUntil > Date.now()
                ) {
                  continue;
                }

                const logAttempt = (
                  status: number,
                  errorType?: string,
                  errorMessage?: string,
                ): void => {
                  logRequest({
                    timestamp: new Date().toISOString(),
                    requestId: ctx.requestId,
                    method: ctx.method,
                    path: ctx.path,
                    model: body.model,
                    stream: !!body.stream,
                    toolCount,
                    account: account.label,
                    accountType: account.type,
                    responseStatus: status,
                    responseTimeMs: Date.now() - requestStart,
                    ...(errorType ? { errorType } : {}),
                    ...(errorMessage ? { errorMessage } : {}),
                  });
                };

                // Auto-refresh expiring access tokens once before making the request.
                if (needsRefresh(account)) {
                  const refreshed = await refreshToken(account);
                  if (refreshed.success) {
                    if (account.persistTarget) {
                      await persistTokens(account.persistTarget, account);
                    }
                    accountState.consecutiveRefreshFailures = 0;
                  } else {
                    accountState.consecutiveRefreshFailures += 1;
                    lastError = `token refresh failed for account=${account.label}: ${refreshed.error?.slice(0, 200) ?? "unknown"}`;
                    logger.debug(
                      `[proxy] preflight refresh failed account=${account.label} failures=${accountState.consecutiveRefreshFailures}`,
                    );
                    if (
                      accountState.consecutiveRefreshFailures >=
                      MAX_CONSECUTIVE_REFRESH_FAILURES
                    ) {
                      await disableAccountUntilReauth(account, accountState);
                      authFailureMessage = formatReauthMessage(account.label);
                      logAttempt(
                        401,
                        "authentication_error",
                        String(lastError),
                      );
                      continue;
                    }
                  }
                }

                const isOAuth = account.type === "oauth";

                // Decision 6: Passthrough client headers, fill gaps only.
                // Start with a copy of incoming client headers, then set
                // defaults for anything the client didn't send. Always
                // override auth + content-type.
                const headers: Record<string, string> = {};
                for (const [hk, hv] of Object.entries(clientHeaders)) {
                  const lower = hk.toLowerCase();
                  if (
                    typeof hv === "string" &&
                    !BLOCKED_UPSTREAM_HEADERS.has(lower)
                  ) {
                    headers[lower] = hv;
                  }
                }

                // Always set (override) — auth and content-type are proxy-controlled
                headers["content-type"] = "application/json";
                if (isOAuth) {
                  headers["authorization"] = `Bearer ${account.token}`;
                } else {
                  headers["x-api-key"] = account.token;
                  delete headers["authorization"];
                }

                // Defaults: only set when client didn't send them
                if (!headers["user-agent"]) {
                  headers["user-agent"] = "claude-cli/2.1.80 (external, cli)";
                }
                if (!headers["anthropic-version"]) {
                  headers["anthropic-version"] = "2023-06-01";
                }

                // Ensure oauth beta is always present in the beta list
                const existingBetas = headers["anthropic-beta"] ?? "";
                if (!existingBetas) {
                  headers["anthropic-beta"] = "oauth-2025-04-20";
                } else if (!existingBetas.includes("oauth")) {
                  headers["anthropic-beta"] =
                    `${existingBetas},oauth-2025-04-20`;
                }

                logger.always(
                  `[proxy] → account=${account.label} (${account.type})`,
                );
                recordRequest(account.label, account.type);

                // Log full request for debugging (written to ~/.neurolink/logs/proxy-debug-*.jsonl)
                const fetchStartMs = Date.now();

                let response: Response;
                try {
                  response = await fetch(url, {
                    method: "POST",
                    headers,
                    body: bodyStr,
                    signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
                  });
                } catch (fetchErr) {
                  if (!isRetryableNetworkError(fetchErr)) {
                    throw fetchErr;
                  }
                  // Decision 8: Network errors — immediate rotation, no cooldown
                  sawNetworkError = true;
                  recordError(account.label, account.type, 502);
                  const errorCode = getErrorCode(fetchErr) ?? "unknown";
                  const errorMessage =
                    fetchErr instanceof Error
                      ? fetchErr.message
                      : String(fetchErr);
                  lastError = errorMessage;
                  logger.always(
                    `[proxy] fetch error account=${account.label} code=${errorCode} (rotating): ${errorMessage}`,
                  );
                  logAttempt(502, "network_error", errorMessage);
                  continue;
                }

                // Check 429 (with Retry-After + exponential backoff) → continue.
                if (response.status === 429) {
                  sawRateLimit = true;
                  const retryAfter = response.headers.get("retry-after");
                  let cooldownMs = 0;
                  if (retryAfter) {
                    const seconds = parseInt(retryAfter, 10);
                    if (!Number.isNaN(seconds)) {
                      cooldownMs = seconds * 1000;
                    } else {
                      const date = new Date(retryAfter);
                      if (!Number.isNaN(date.getTime())) {
                        cooldownMs = Math.max(
                          date.getTime() - Date.now(),
                          1000,
                        );
                      }
                    }
                  }
                  const level = accountState.backoffLevel;
                  const baseCooldown =
                    cooldownMs > 0 ? cooldownMs : RATE_LIMIT_BACKOFF_BASE_MS;
                  const backoffMs = Math.min(
                    baseCooldown * Math.pow(2, level),
                    RATE_LIMIT_BACKOFF_CAP_MS,
                  );
                  accountState.coolingUntil = Date.now() + backoffMs;
                  accountState.backoffLevel += 1;
                  advancePrimaryIfCurrent(
                    account.key,
                    enabledAccounts.length,
                    orderedAccounts[0]?.key,
                  );
                  recordError(account.label, account.type, 429);
                  recordCooldown(
                    account.label,
                    account.type,
                    accountState.coolingUntil,
                    accountState.backoffLevel,
                  );
                  lastError = await response.text();
                  logger.always(
                    `[proxy] ← 429 account=${account.label} backoff-level=${accountState.backoffLevel} cooldown=${Math.round(backoffMs / 1000)}s`,
                  );
                  logAttempt(429, "rate_limit_error", String(lastError));
                  continue;
                }

                // On 401 for refreshable OAuth: refresh token and retry before failing over.
                if (
                  response.status === 401 &&
                  account.type === "oauth" &&
                  account.refreshToken
                ) {
                  recordError(account.label, account.type, 401);
                  let authRetrySucceeded = false;
                  let authRetryError = "received 401 from Anthropic";

                  for (
                    let authRetry = 0;
                    authRetry < MAX_AUTH_RETRIES;
                    authRetry++
                  ) {
                    logger.always(
                      `[proxy] ← 401 account=${account.label} refreshing (attempt ${authRetry + 1}/${MAX_AUTH_RETRIES})`,
                    );
                    const refreshSucceeded = await refreshToken(account);
                    if (!refreshSucceeded.success) {
                      accountState.consecutiveRefreshFailures += 1;
                      authRetryError = `refresh failed for account=${account.label} attempt ${authRetry + 1}/${MAX_AUTH_RETRIES}: ${refreshSucceeded.error?.slice(0, 200) ?? "unknown"}`;
                      lastError = authRetryError;
                      logger.always(
                        `[proxy] ⚠ account=${account.label} refresh failed on attempt ${authRetry + 1}`,
                      );
                      if (
                        accountState.consecutiveRefreshFailures >=
                        MAX_CONSECUTIVE_REFRESH_FAILURES
                      ) {
                        await disableAccountUntilReauth(account, accountState);
                        authFailureMessage = formatReauthMessage(account.label);
                        break;
                      }
                      if (authRetry < MAX_AUTH_RETRIES - 1) {
                        await sleep(2000);
                      }
                      continue;
                    }

                    if (account.persistTarget) {
                      await persistTokens(account.persistTarget, account);
                    }
                    headers.authorization = `Bearer ${account.token}`;

                    try {
                      const retryResp = await fetch(url, {
                        method: "POST",
                        headers,
                        body: bodyStr,
                        signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
                      });
                      if (retryResp.ok) {
                        authRetrySucceeded = true;
                        accountState.consecutiveRefreshFailures = 0;
                        accountState.backoffLevel = 0;
                        accountState.coolingUntil = undefined;
                        logger.always(
                          `[proxy] ← 200 account=${account.label} (after ${authRetry + 1} refresh(es))`,
                        );
                        recordSuccess(account.label, account.type);
                        logAttempt(retryResp.status);
                        // Capture quota headers after successful auth-retry

                        {
                          const retryQuota = parseQuotaHeaders(
                            retryResp.headers,
                          );
                          // eslint-disable-next-line max-depth
                          if (retryQuota) {
                            saveAccountQuota(account.label, retryQuota).catch(
                              () => {},
                            );
                          }
                        }
                        // eslint-disable-next-line max-depth
                        if (body.stream && retryResp.body) {
                          const retryReader = retryResp.body.getReader();
                          const retryStream = new ReadableStream({
                            async pull(controller) {
                              try {
                                const { done, value } =
                                  await retryReader.read();
                                if (done) {
                                  controller.close();
                                  return;
                                }
                                controller.enqueue(value);
                              } catch (streamErr) {
                                const errMsg =
                                  streamErr instanceof Error
                                    ? streamErr.message
                                    : String(streamErr);
                                logger.always(
                                  `[proxy] mid-stream error (auth-retry) account=${account.label}: ${errMsg}`,
                                );
                                logStreamError({
                                  timestamp: new Date().toISOString(),
                                  requestId: ctx.requestId,
                                  account: account.label,
                                  model: body.model,
                                  errorMessage: errMsg,
                                  durationMs: Date.now() - fetchStartMs,
                                });
                                const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${errMsg}` } })}\n\n`;
                                controller.enqueue(
                                  new TextEncoder().encode(errorEvent),
                                );
                                controller.close();
                              }
                            },
                            cancel() {
                              retryReader.cancel();
                            },
                          });
                          const responseHeaders: Record<string, string> = {
                            "content-type": "text/event-stream",
                            "cache-control": "no-cache",
                            connection: "keep-alive",
                          };
                          // eslint-disable-next-line max-depth
                          for (const h of [
                            "retry-after",
                            "anthropic-ratelimit-requests-remaining",
                            "anthropic-ratelimit-requests-limit",
                            "anthropic-ratelimit-tokens-remaining",
                            "anthropic-ratelimit-tokens-limit",
                          ]) {
                            const val = retryResp.headers.get(h);
                            // eslint-disable-next-line max-depth
                            if (val) {
                              responseHeaders[h] = val;
                            }
                          }
                          return new Response(retryStream, {
                            status: retryResp.status,
                            headers: responseHeaders,
                          });
                        }
                        return retryResp.json();
                      }

                      const retryStatus = retryResp.status;
                      const retryBody = await retryResp.text();
                      authRetryError = `retry ${authRetry + 1}/${MAX_AUTH_RETRIES} failed with status ${retryStatus}`;
                      lastError = retryBody;
                      logger.debug(
                        `[proxy] retry ${authRetry + 1} failed: ${retryStatus} ${retryBody.substring(0, 120)}`,
                      );
                      recordError(account.label, account.type, retryStatus);

                      if (retryStatus === 429) {
                        sawRateLimit = true;
                        const retryAfter = retryResp.headers.get("retry-after");
                        const parsedRetryAfter = parseInt(retryAfter ?? "", 10);
                        const cooldownMs = Number.isNaN(parsedRetryAfter)
                          ? 60_000
                          : Math.max(1, parsedRetryAfter) * 1000;
                        accountState.coolingUntil = Date.now() + cooldownMs;
                        advancePrimaryIfCurrent(
                          account.key,
                          enabledAccounts.length,
                          orderedAccounts[0]?.key,
                        );
                        recordCooldown(
                          account.label,
                          account.type,
                          accountState.coolingUntil,
                          accountState.backoffLevel,
                        );
                        break;
                      }

                      if (
                        retryStatus === 401 ||
                        retryStatus === 402 ||
                        retryStatus === 403
                      ) {
                        // eslint-disable-next-line max-depth
                        if (authRetry < MAX_AUTH_RETRIES - 1) {
                          await sleep(1000);
                        }
                        continue;
                      }

                      if (isTransientHttpFailure(retryStatus, retryBody)) {
                        // Decision 8: No cooldown for transient errors — rotate immediately
                        sawTransientFailure = true;
                        break;
                      }

                      logAttempt(
                        retryStatus,
                        "api_error",
                        summarizeErrorMessage(retryBody),
                      );
                      try {
                        return JSON.parse(retryBody);
                      } catch {
                        return buildClaudeError(retryStatus, retryBody);
                      }
                    } catch (retryFetchErr) {
                      // Decision 8: No cooldown for network errors — rotate immediately
                      sawNetworkError = true;
                      recordError(account.label, account.type, 502);
                      const message =
                        retryFetchErr instanceof Error
                          ? retryFetchErr.message
                          : String(retryFetchErr);
                      authRetryError = `network error on retry ${authRetry + 1}: ${message}`;
                      lastError = authRetryError;
                      logger.debug(`[proxy] ${authRetryError}`);
                      break;
                    }
                  }

                  if (!authRetrySucceeded) {
                    if (!accountState.permanentlyDisabled) {
                      if (
                        !accountState.coolingUntil ||
                        accountState.coolingUntil <= Date.now()
                      ) {
                        accountState.coolingUntil =
                          Date.now() + AUTH_COOLDOWN_MS;
                      }
                      recordCooldown(
                        account.label,
                        account.type,
                        accountState.coolingUntil,
                        accountState.backoffLevel,
                      );
                    }
                    lastError = authRetryError;
                    logger.always(
                      `[proxy] ⚠ account=${account.label} auth retries exhausted, cooldown=5min`,
                    );
                    logAttempt(401, "authentication_error", authRetryError);
                    continue;
                  }
                }

                if (!response.ok) {
                  const errBody = await response.text();

                  // Log full error for debugging
                  const errRespHeaders: Record<string, string> = {};
                  response.headers.forEach((v, k) => {
                    errRespHeaders[k] = v;
                  });
                  logFullRequestResponse({
                    timestamp: new Date().toISOString(),
                    requestId: ctx.requestId,
                    account: account.label,
                    model: body.model,
                    stream: !!body.stream,
                    requestHeaders: redactSensitiveHeaders(headers),
                    requestBody: {
                      model: body.model,
                      max_tokens: body.max_tokens,
                      stream: body.stream,
                      system: Array.isArray(body.system)
                        ? `[${(body.system as unknown[]).length} blocks]`
                        : typeof body.system,
                      messages: Array.isArray(body.messages)
                        ? `[${body.messages.length} messages]`
                        : "?",
                      tools: Array.isArray(body.tools)
                        ? `[${body.tools.length} tools]`
                        : "none",
                      tool_choice: body.tool_choice,
                      thinking: body.thinking,
                    },
                    requestBodySize: bodyStr.length,
                    responseStatus: response.status,
                    responseHeaders: errRespHeaders,
                    responseBody: errBody.substring(0, 2000),
                    responseBodySize: errBody.length,
                    durationMs: Date.now() - fetchStartMs,
                  });

                  // Request-shape errors (do not retry).
                  if (isInvalidRequestError(response.status, errBody)) {
                    logger.always(
                      `[proxy] ← ${response.status} request-shape error (no retry)`,
                    );
                    logAttempt(
                      response.status,
                      "invalid_request_error",
                      summarizeErrorMessage(errBody),
                    );
                    try {
                      return JSON.parse(errBody);
                    } catch {
                      return buildClaudeError(response.status, errBody);
                    }
                  }

                  // Auth failures for OAuth accounts without refresh token.
                  if (
                    (response.status === 401 ||
                      response.status === 402 ||
                      response.status === 403) &&
                    account.type === "oauth" &&
                    !account.refreshToken
                  ) {
                    recordError(account.label, account.type, response.status);
                    accountState.consecutiveRefreshFailures += 1;
                    accountState.coolingUntil = Date.now() + AUTH_COOLDOWN_MS;
                    recordCooldown(
                      account.label,
                      account.type,
                      accountState.coolingUntil,
                      accountState.backoffLevel,
                    );
                    if (
                      accountState.consecutiveRefreshFailures >=
                      MAX_CONSECUTIVE_REFRESH_FAILURES
                    ) {
                      await disableAccountUntilReauth(account, accountState);
                    }
                    authFailureMessage = formatReauthMessage(account.label);
                    logger.always(
                      `[proxy] ← ${response.status} account=${account.label} cooldown=5min`,
                    );
                    lastError = errBody;
                    logAttempt(
                      response.status,
                      "authentication_error",
                      summarizeErrorMessage(errBody),
                    );
                    continue;
                  }

                  // Auth failures for API-key accounts.
                  if (
                    (response.status === 401 ||
                      response.status === 402 ||
                      response.status === 403) &&
                    account.type === "api_key"
                  ) {
                    recordError(account.label, account.type, response.status);
                    authFailureMessage =
                      "Authentication failed for Anthropic API key credentials. Update ANTHROPIC_API_KEY or re-login with OAuth.";
                    accountState.coolingUntil = Date.now() + AUTH_COOLDOWN_MS;
                    recordCooldown(
                      account.label,
                      account.type,
                      accountState.coolingUntil,
                      accountState.backoffLevel,
                    );
                    logger.always(
                      `[proxy] ← ${response.status} account=${account.label} cooldown=5min`,
                    );
                    lastError = errBody;
                    logAttempt(
                      response.status,
                      "authentication_error",
                      summarizeErrorMessage(errBody),
                    );
                    continue;
                  }

                  // 404 is generally model/account specific; return immediately (no cooldown per Decision 8).
                  if (response.status === 404) {
                    recordError(account.label, account.type, response.status);
                    logger.always(`[proxy] ← 404 account=${account.label}`);
                    logAttempt(
                      404,
                      "not_found_error",
                      summarizeErrorMessage(errBody),
                    );
                    try {
                      return JSON.parse(errBody);
                    } catch {
                      return buildClaudeError(404, errBody);
                    }
                  }

                  // Decision 8: Transient upstream failures — immediate rotation, NO cooldown.
                  if (isTransientHttpFailure(response.status, errBody)) {
                    recordError(account.label, account.type, response.status);
                    sawTransientFailure = true;
                    // No cooldown for transient errors (502, 503, etc.) — rotate immediately
                    logger.always(
                      `[proxy] ← ${response.status} account=${account.label} (transient, rotating)`,
                    );
                    lastError = errBody;
                    logAttempt(
                      response.status,
                      "api_error",
                      summarizeErrorMessage(errBody),
                    );
                    continue;
                  }

                  // Other non-ok errors → return as-is.
                  recordError(account.label, account.type, response.status);
                  logger.always(
                    `[proxy] ← ${response.status} account=${account.label}`,
                  );
                  logger.debug(
                    `[claude-proxy] error body: ${errBody.substring(0, 200)}`,
                  );
                  logAttempt(
                    response.status,
                    "api_error",
                    summarizeErrorMessage(errBody),
                  );
                  try {
                    return JSON.parse(errBody);
                  } catch {
                    return buildClaudeError(response.status, errBody);
                  }
                }

                // Success path.
                accountState.backoffLevel = 0;
                accountState.coolingUntil = undefined;
                accountState.consecutiveRefreshFailures = 0;
                recordSuccess(account.label, account.type);
                logger.always(
                  `[proxy] ← ${response.status} account=${account.label}`,
                );
                logAttempt(response.status);

                // Capture quota/utilisation headers (fire-and-forget).
                const quota = parseQuotaHeaders(response.headers);
                if (quota) {
                  saveAccountQuota(account.label, quota).catch(() => {
                    // Non-fatal: quota persistence is best-effort
                  });
                }

                // Log full request + response headers for debugging
                const respHeaders: Record<string, string> = {};
                response.headers.forEach((v, k) => {
                  respHeaders[k] = v;
                });
                logFullRequestResponse({
                  timestamp: new Date().toISOString(),
                  requestId: ctx.requestId,
                  account: account.label,
                  model: body.model,
                  stream: !!body.stream,
                  requestHeaders: redactSensitiveHeaders(headers),
                  requestBody: {
                    model: body.model,
                    max_tokens: body.max_tokens,
                    stream: body.stream,
                    system: Array.isArray(body.system)
                      ? `[${(body.system as unknown[]).length} blocks]`
                      : typeof body.system,
                    messages: Array.isArray(body.messages)
                      ? `[${body.messages.length} messages]`
                      : "?",
                    tools: Array.isArray(body.tools)
                      ? `[${body.tools.length} tools]`
                      : "none",
                    tool_choice: body.tool_choice,
                    thinking: body.thinking,
                    metadata: body.metadata ? "present" : "absent",
                  },
                  requestBodySize: bodyStr.length,
                  responseStatus: response.status,
                  responseHeaders: respHeaders,
                  durationMs: Date.now() - fetchStartMs,
                });

                if (body.stream) {
                  // Bootstrap retry: read first chunk to verify stream is valid.
                  if (response.body) {
                    const reader = response.body.getReader();
                    const firstChunk = await reader.read();

                    if (
                      firstChunk.done ||
                      !firstChunk.value ||
                      firstChunk.value.length === 0
                    ) {
                      // Empty stream — retry with next account.
                      reader.cancel();
                      accountState.coolingUntil = Date.now() + 10_000;
                      recordCooldown(
                        account.label,
                        account.type,
                        accountState.coolingUntil,
                        accountState.backoffLevel,
                      );
                      logger.always(
                        `[proxy] ← empty stream from account=${account.label}, trying next`,
                      );
                      continue;
                    }

                    // Stream is valid — create a new ReadableStream with first chunk prepended.
                    const remainingStream = new ReadableStream({
                      start(controller) {
                        controller.enqueue(firstChunk.value);
                      },
                      async pull(controller) {
                        try {
                          const { done, value } = await reader.read();
                          if (done) {
                            controller.close();
                            return;
                          }
                          controller.enqueue(value);
                        } catch (streamErr) {
                          const errMsg =
                            streamErr instanceof Error
                              ? streamErr.message
                              : String(streamErr);
                          logger.always(
                            `[proxy] mid-stream error account=${account.label}: ${errMsg}`,
                          );
                          logStreamError({
                            timestamp: new Date().toISOString(),
                            requestId: ctx.requestId,
                            account: account.label,
                            model: body.model,
                            errorMessage: errMsg,
                            durationMs: Date.now() - fetchStartMs,
                          });
                          // Send SSE error event so the client gets a meaningful error
                          // instead of a raw connection drop
                          const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${errMsg}` } })}\n\n`;
                          controller.enqueue(
                            new TextEncoder().encode(errorEvent),
                          );
                          controller.close();
                        }
                      },
                      cancel() {
                        reader.cancel();
                      },
                    });

                    // Forward rate limit headers from Anthropic.
                    const responseHeaders: Record<string, string> = {
                      "content-type": "text/event-stream",
                      "cache-control": "no-cache",
                      connection: "keep-alive",
                    };
                    for (const h of [
                      "retry-after",
                      "anthropic-ratelimit-requests-remaining",
                      "anthropic-ratelimit-requests-limit",
                      "anthropic-ratelimit-tokens-remaining",
                      "anthropic-ratelimit-tokens-limit",
                    ]) {
                      const val = response.headers.get(h);
                      if (val) {
                        responseHeaders[h] = val;
                      }
                    }

                    return new Response(remainingStream, {
                      status: response.status,
                      headers: responseHeaders,
                    });
                  }
                  return buildClaudeError(
                    502,
                    "No response body from upstream",
                  );
                }

                // Non-streaming: return JSON directly.
                return response.json();
              }

              // All accounts exhausted — compute earliest recovery time.
              const earliestRecovery = orderedAccounts.reduce(
                (min, account) => {
                  const coolingUntil = getOrCreateRuntimeState(
                    account.key,
                  ).coolingUntil;
                  return coolingUntil ? Math.min(min, coolingUntil) : min;
                },
                Infinity,
              );
              const retryAfterSec = Number.isFinite(earliestRecovery)
                ? Math.max(1, Math.ceil((earliestRecovery - Date.now()) / 1000))
                : 60;

              // Try fallback chain (alternative providers)
              const chain = modelRouter?.getFallbackChain() ?? [];
              for (const fallback of chain) {
                try {
                  logger.always(
                    `[proxy] fallback → ${fallback.provider}/${fallback.model}`,
                  );
                  const parsed = parseClaudeRequest(body);
                  const opts = {
                    input: {
                      text: parsed.prompt,
                      ...(parsed.images.length > 0
                        ? { images: parsed.images }
                        : {}),
                    },
                    provider: fallback.provider,
                    model: fallback.model,
                    systemPrompt: parsed.systemPrompt,
                    maxTokens: parsed.maxTokens,
                    ...(parsed.temperature !== undefined
                      ? { temperature: parsed.temperature }
                      : {}),
                    ...(parsed.topP !== undefined ? { topP: parsed.topP } : {}),
                    ...(parsed.topK !== undefined ? { topK: parsed.topK } : {}),
                    ...(parsed.stopSequences?.length
                      ? { stopSequences: parsed.stopSequences }
                      : {}),
                    tools: parsed.tools,
                    ...(parsed.toolChoice
                      ? { toolChoice: parsed.toolChoice }
                      : {}),
                    ...(parsed.thinkingConfig
                      ? { thinkingConfig: parsed.thinkingConfig }
                      : {}),
                    ...(parsed.conversationMessages?.length
                      ? {
                          conversationMessages:
                            parsed.conversationMessages.slice(0, -1),
                        }
                      : {}),
                    maxSteps: 1,
                  };
                  if (body.stream) {
                    const streamResult = await ctx.neurolink.stream(
                      opts as unknown as Parameters<
                        typeof ctx.neurolink.stream
                      >[0],
                    );
                    const serializer = new ClaudeStreamSerializer(
                      body.model,
                      0,
                    );
                    async function* sseGenerator(): AsyncIterable<string> {
                      for (const frame of serializer.start()) {
                        yield frame;
                      }
                      for await (const chunk of streamResult.stream) {
                        const text = extractText(chunk);
                        if (text) {
                          for (const frame of serializer.pushDelta(text)) {
                            yield frame;
                          }
                        }
                      }
                      // Emit tool_use blocks if model wants to call tools
                      if (streamResult.toolCalls?.length) {
                        for (const tc of streamResult.toolCalls) {
                          const toolName =
                            (tc as { toolName?: string }).toolName ??
                            (tc as { name?: string }).name ??
                            "unknown";
                          const toolArgs =
                            (tc as { args?: unknown }).args ??
                            (tc as { parameters?: unknown }).parameters ??
                            {};
                          for (const frame of serializer.pushToolUse(
                            generateToolUseId(),
                            toolName,
                            toolArgs,
                          )) {
                            yield frame;
                          }
                        }
                      }
                      const reason = streamResult.finishReason ?? "end_turn";
                      for (const frame of serializer.finish(0, reason)) {
                        yield frame;
                      }
                    }
                    return sseGenerator();
                  }
                  const streamResult = await ctx.neurolink.stream(
                    opts as unknown as Parameters<
                      typeof ctx.neurolink.stream
                    >[0],
                  );
                  let collectedText = "";
                  for await (const chunk of streamResult.stream) {
                    const text = extractText(chunk);
                    if (text) {
                      collectedText += text;
                    }
                  }
                  const internal: InternalResult = {
                    content: collectedText,
                    model: streamResult.model,
                    finishReason: streamResult.finishReason ?? "end_turn",
                    reasoning: undefined,
                    usage: streamResult.usage
                      ? {
                          input:
                            (streamResult.usage as { input?: number }).input ??
                            0,
                          output:
                            (streamResult.usage as { output?: number })
                              .output ?? 0,
                          total:
                            (streamResult.usage as { total?: number }).total ??
                            0,
                        }
                      : undefined,
                    toolCalls:
                      streamResult.toolCalls as InternalResult["toolCalls"],
                  };
                  return serializeClaudeResponse(internal, body.model);
                } catch (fallbackErr) {
                  logger.debug(
                    `[proxy] fallback ${fallback.provider}/${fallback.model} failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
                  );
                  continue;
                }
              }

              // If no explicit fallback chain is configured, try SDK auto-provider fallback.
              if (chain.length === 0) {
                try {
                  logger.always("[proxy] fallback → auto-provider");
                  const parsed = parseClaudeRequest(body);
                  const opts = {
                    input: {
                      text: parsed.prompt,
                      ...(parsed.images.length > 0
                        ? { images: parsed.images }
                        : {}),
                    },
                    systemPrompt: parsed.systemPrompt,
                    maxTokens: parsed.maxTokens,
                    ...(parsed.temperature !== undefined
                      ? { temperature: parsed.temperature }
                      : {}),
                    ...(parsed.topP !== undefined ? { topP: parsed.topP } : {}),
                    ...(parsed.topK !== undefined ? { topK: parsed.topK } : {}),
                    ...(parsed.stopSequences?.length
                      ? { stopSequences: parsed.stopSequences }
                      : {}),
                    tools: parsed.tools,
                    ...(parsed.toolChoice
                      ? { toolChoice: parsed.toolChoice }
                      : {}),
                    ...(parsed.thinkingConfig
                      ? { thinkingConfig: parsed.thinkingConfig }
                      : {}),
                    ...(parsed.conversationMessages?.length
                      ? {
                          conversationMessages:
                            parsed.conversationMessages.slice(0, -1),
                        }
                      : {}),
                    maxSteps: 1,
                  };
                  if (body.stream) {
                    const streamResult = await ctx.neurolink.stream(
                      opts as unknown as Parameters<
                        typeof ctx.neurolink.stream
                      >[0],
                    );
                    const serializer = new ClaudeStreamSerializer(
                      body.model,
                      0,
                    );
                    async function* sseGenerator(): AsyncIterable<string> {
                      for (const frame of serializer.start()) {
                        yield frame;
                      }
                      for await (const chunk of streamResult.stream) {
                        const text = extractText(chunk);
                        if (text) {
                          for (const frame of serializer.pushDelta(text)) {
                            yield frame;
                          }
                        }
                      }
                      // Emit tool_use blocks if model wants to call tools
                      if (streamResult.toolCalls?.length) {
                        for (const tc of streamResult.toolCalls) {
                          const toolName =
                            (tc as { toolName?: string }).toolName ??
                            (tc as { name?: string }).name ??
                            "unknown";
                          const toolArgs =
                            (tc as { args?: unknown }).args ??
                            (tc as { parameters?: unknown }).parameters ??
                            {};
                          for (const frame of serializer.pushToolUse(
                            generateToolUseId(),
                            toolName,
                            toolArgs,
                          )) {
                            yield frame;
                          }
                        }
                      }
                      const reason = streamResult.finishReason ?? "end_turn";
                      for (const frame of serializer.finish(0, reason)) {
                        yield frame;
                      }
                    }
                    return sseGenerator();
                  }
                  const streamResult = await ctx.neurolink.stream(
                    opts as unknown as Parameters<
                      typeof ctx.neurolink.stream
                    >[0],
                  );
                  let collectedText = "";
                  for await (const chunk of streamResult.stream) {
                    const text = extractText(chunk);
                    if (text) {
                      collectedText += text;
                    }
                  }
                  const internal: InternalResult = {
                    content: collectedText,
                    model: streamResult.model,
                    finishReason: streamResult.finishReason ?? "end_turn",
                    reasoning: undefined,
                    usage: streamResult.usage
                      ? {
                          input:
                            (streamResult.usage as { input?: number }).input ??
                            0,
                          output:
                            (streamResult.usage as { output?: number })
                              .output ?? 0,
                          total:
                            (streamResult.usage as { total?: number }).total ??
                            0,
                        }
                      : undefined,
                    toolCalls:
                      streamResult.toolCalls as InternalResult["toolCalls"],
                  };
                  return serializeClaudeResponse(internal, body.model);
                } catch (fallbackErr) {
                  logger.debug(
                    `[proxy] fallback auto-provider failed: ${
                      fallbackErr instanceof Error
                        ? fallbackErr.message
                        : String(fallbackErr)
                    }`,
                  );
                }
              }

              if (authFailureMessage && !sawRateLimit) {
                return buildClaudeError(401, authFailureMessage);
              }

              if ((sawNetworkError || sawTransientFailure) && !sawRateLimit) {
                return buildClaudeError(
                  502,
                  `All Anthropic accounts failed due to transient upstream/network errors. Last error: ${
                    lastError instanceof Error
                      ? lastError.message
                      : String(lastError ?? "unknown")
                  }`,
                );
              }

              if (!sawRateLimit) {
                return buildClaudeError(
                  502,
                  `All Anthropic accounts failed. Last error: ${
                    lastError instanceof Error
                      ? lastError.message
                      : String(lastError ?? "unknown")
                  }`,
                );
              }

              // All accounts AND all fallbacks exhausted — return 429 with Retry-After
              logger.always(
                `[proxy] all accounts rate-limited, retry in ${retryAfterSec}s`,
              );
              const errorBody = buildClaudeError(
                429,
                `All accounts rate-limited. Earliest recovery in ${retryAfterSec}s.`,
                "overloaded_error",
              );
              return new Response(JSON.stringify(errorBody), {
                status: 429,
                headers: {
                  "content-type": "application/json",
                  "retry-after": String(retryAfterSec),
                },
              });
            } else {
              // ─── TRANSLATION MODE (Claude → Other Provider) ───────
              // Parse into NeuroLink format, call generate/stream, serialize back
              const parsed = parseClaudeRequest(body);
              const historyMessages = parsed.conversationMessages.slice(0, -1);

              const options: Record<string, unknown> = {
                input: {
                  text: parsed.prompt,
                  ...(parsed.images.length > 0
                    ? { images: parsed.images }
                    : {}),
                },
                provider: route.provider,
                model: route.model,
                systemPrompt: parsed.systemPrompt,
                maxTokens: parsed.maxTokens,
                ...(parsed.temperature !== undefined
                  ? { temperature: parsed.temperature }
                  : {}),
                ...(parsed.topP !== undefined ? { topP: parsed.topP } : {}),
                ...(parsed.topK !== undefined ? { topK: parsed.topK } : {}),
                ...(parsed.stopSequences?.length
                  ? { stopSequences: parsed.stopSequences }
                  : {}),
                ...(parsed.thinkingConfig
                  ? { thinkingConfig: parsed.thinkingConfig }
                  : {}),
                tools: parsed.tools,
                ...(parsed.toolChoice ? { toolChoice: parsed.toolChoice } : {}),
                maxSteps: 1,
                ...(historyMessages.length > 0
                  ? { conversationMessages: historyMessages }
                  : {}),
              };

              if (body.stream) {
                const streamResult = await ctx.neurolink.stream(
                  options as Parameters<typeof ctx.neurolink.stream>[0],
                );
                const serializer = new ClaudeStreamSerializer(body.model, 0);
                const KEEPALIVE_INTERVAL_MS = 15_000; // 15 seconds

                // Return a ReadableStream that emits SSE keep-alive comments
                // every ~15s independently of upstream chunk arrival, so
                // intermediaries don't drop the connection during stalls.
                const encoder = new TextEncoder();
                let translationKeepAliveTimer:
                  | ReturnType<typeof setInterval>
                  | undefined;
                let translationCancelled = false;
                // Hold a reference to the upstream async iterator so
                // we can abort it when the client disconnects.
                let upstreamIterator: AsyncIterator<unknown> | undefined;
                const translationStream = new ReadableStream<Uint8Array>({
                  async start(controller) {
                    // Emit start frames
                    for (const frame of serializer.start()) {
                      controller.enqueue(encoder.encode(frame));
                    }

                    // Keep-alive interval — fires even when upstream is stalled
                    translationKeepAliveTimer = setInterval(() => {
                      try {
                        controller.enqueue(encoder.encode(": keep-alive\n\n"));
                      } catch {
                        // Controller already closed — ignore
                      }
                    }, KEEPALIVE_INTERVAL_MS);

                    try {
                      const iterable =
                        streamResult.stream as AsyncIterable<unknown>;
                      upstreamIterator = iterable[Symbol.asyncIterator]();
                      // Manually drive the async iterator so we can cancel it
                      while (true) {
                        if (translationCancelled) {
                          break;
                        }
                        const { value: chunk, done } =
                          await upstreamIterator.next();
                        if (done) {
                          break;
                        }
                        if (translationCancelled) {
                          break;
                        }
                        const text = extractText(chunk);
                        if (text) {
                          for (const frame of serializer.pushDelta(text)) {
                            controller.enqueue(encoder.encode(frame));
                          }
                        }
                      }
                      // Emit tool_use blocks if model wants to call tools
                      if (
                        !translationCancelled &&
                        streamResult.toolCalls?.length
                      ) {
                        for (const tc of streamResult.toolCalls) {
                          const toolName =
                            (tc as { toolName?: string }).toolName ??
                            (tc as { name?: string }).name ??
                            "unknown";
                          const toolArgs =
                            (tc as { args?: unknown }).args ??
                            (tc as { parameters?: unknown }).parameters ??
                            {};
                          for (const frame of serializer.pushToolUse(
                            generateToolUseId(),
                            toolName,
                            toolArgs,
                          )) {
                            controller.enqueue(encoder.encode(frame));
                          }
                        }
                      }
                      if (!translationCancelled) {
                        const reason = streamResult.finishReason ?? "end_turn";
                        for (const frame of serializer.finish(0, reason)) {
                          controller.enqueue(encoder.encode(frame));
                        }
                      }
                    } catch (streamErr) {
                      if (translationCancelled) {
                        return;
                      }
                      const errMsg =
                        streamErr instanceof Error
                          ? streamErr.message
                          : String(streamErr);
                      logger.always(
                        `[proxy] mid-stream error (translation mode): ${errMsg}`,
                      );
                      const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${errMsg}` } })}\n\n`;
                      controller.enqueue(encoder.encode(errorEvent));
                    } finally {
                      if (translationKeepAliveTimer) {
                        clearInterval(translationKeepAliveTimer);
                      }
                      if (!translationCancelled) {
                        controller.close();
                      }
                    }
                  },
                  cancel() {
                    translationCancelled = true;
                    if (translationKeepAliveTimer) {
                      clearInterval(translationKeepAliveTimer);
                      translationKeepAliveTimer = undefined;
                    }
                    // Propagate cancellation to the upstream provider stream
                    if (upstreamIterator?.return) {
                      upstreamIterator.return(undefined).catch((cancelErr) => {
                        logger.debug(
                          `[proxy] upstream cancel error: ${cancelErr instanceof Error ? cancelErr.message : String(cancelErr)}`,
                        );
                      });
                    }
                  },
                });

                return new Response(translationStream, {
                  headers: {
                    "content-type": "text/event-stream",
                    "cache-control": "no-cache",
                    connection: "keep-alive",
                  },
                });
              }

              const streamResult = await ctx.neurolink.stream(
                options as Parameters<typeof ctx.neurolink.stream>[0],
              );
              let collectedText = "";
              for await (const chunk of streamResult.stream) {
                const text = extractText(chunk);
                if (text) {
                  collectedText += text;
                }
              }
              const internal: InternalResult = {
                content: collectedText,
                model: streamResult.model,
                finishReason: streamResult.finishReason ?? "end_turn",
                reasoning: undefined,
                usage: streamResult.usage
                  ? {
                      input:
                        (streamResult.usage as { input?: number }).input ?? 0,
                      output:
                        (streamResult.usage as { output?: number }).output ?? 0,
                      total:
                        (streamResult.usage as { total?: number }).total ?? 0,
                    }
                  : undefined,
                toolCalls:
                  streamResult.toolCalls as InternalResult["toolCalls"],
              };
              return serializeClaudeResponse(internal, body.model);
            }
          } catch (error) {
            logger.error(
              `[claude-proxy] Generation error for ${body.model}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            return buildClaudeError(
              502,
              `Generation failed: ${
                error instanceof Error ? error.message : "unknown error"
              }`,
            );
          }
        },
        description:
          "Claude-compatible messages endpoint routed through NeuroLink",
        tags: ["claude-proxy", "messages"],
        streaming: { enabled: true, contentType: "text/event-stream" },
      },

      // =====================================================================
      // GET /v1/models -- List available models
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/v1/models`,
        handler: async (_ctx: ServerContext) => {
          const models = [
            "claude-sonnet-4-20250514",
            "claude-sonnet-4-5-20250929",
            "claude-haiku-4-5-20241022",
            "claude-opus-4-20250514",
          ];

          return {
            object: "list",
            data: models.map((id) => ({
              id,
              object: "model",
              created: 1700000000,
              owned_by: "anthropic",
            })),
          };
        },
        description: "List available Claude models",
        tags: ["claude-proxy", "models"],
      },

      // =====================================================================
      // POST /v1/messages/count_tokens -- Token counting endpoint
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/v1/messages/count_tokens`,
        handler: async (ctx: ServerContext) => {
          const body = ctx.body as
            | { model?: string; messages?: Array<{ content: unknown }> }
            | undefined;

          if (!body?.model || !body?.messages) {
            return buildClaudeError(
              400,
              "Missing required fields: model, messages",
            );
          }

          // Simple estimation using character-to-token heuristic
          const text = body.messages
            .map((m) =>
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
            )
            .join(" ");

          return { input_tokens: Math.ceil(text.length / 4) };
        },
        description: "Count tokens for a messages request",
        tags: ["claude-proxy", "tokens"],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from a stream chunk (handles various chunk formats).
 */
function extractText(chunk: unknown): string | null {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk && typeof chunk === "object") {
    const c = chunk as Record<string, unknown>;

    // NeuroLink StreamResult chunk format: { content: string }
    if (typeof c.content === "string") {
      return c.content;
    }

    // Vercel AI SDK text delta format
    if (c.type === "text-delta" && typeof c.textDelta === "string") {
      return c.textDelta;
    }

    // Direct text field
    if (typeof c.text === "string") {
      return c.text;
    }
  }

  return null;
}

function getOrCreateRuntimeState(accountKey: string): RuntimeAccountState {
  const existing = accountRuntimeState.get(accountKey);
  if (existing) {
    return existing;
  }
  const initial: RuntimeAccountState = {
    coolingUntil: undefined,
    backoffLevel: 0,
    consecutiveRefreshFailures: 0,
    permanentlyDisabled: false,
  };
  accountRuntimeState.set(accountKey, initial);
  return initial;
}

async function disableAccountUntilReauth(
  account: ProxyPassthroughAccount,
  state: RuntimeAccountState,
): Promise<void> {
  state.permanentlyDisabled = true;
  state.coolingUntil = undefined;
  state.backoffLevel = 0;

  // Decision 7 (usage): Persist disabled state to disk so it survives restarts
  try {
    const { tokenStore } = await import("../../auth/tokenStore.js");
    await tokenStore.markDisabled(account.key, "refresh_failed");
  } catch (e) {
    logger.debug(
      `[proxy] failed to persist disabled state for ${account.label}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  logger.always(
    `[proxy] account=${account.label} disabled until re-authentication. Run: neurolink auth login anthropic --method oauth`,
  );
}

function formatReauthMessage(labels: string | string[]): string {
  const value = Array.isArray(labels) ? labels.join(", ") : labels;
  return `Account(s) require re-authentication: ${value}. Run: neurolink auth login anthropic --method oauth`;
}

function summarizeErrorMessage(
  message: string,
  maxLength: number = 180,
): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength)}...`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get low-level network error code from an unknown error shape.
 */
function getErrorCode(error: unknown): string | undefined {
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

/**
 * Determine whether a thrown fetch error is a transient connectivity issue.
 */
function isRetryableNetworkError(error: unknown): boolean {
  const code = getErrorCode(error);

  // Check non-retryable codes FIRST — before the string-based heuristic
  // which could false-positive on error messages containing these strings.
  const NON_RETRYABLE_CODES = ["ENOTFOUND"];
  if (code && NON_RETRYABLE_CODES.includes(code)) {
    return false;
  }

  if (
    code &&
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "EHOSTUNREACH",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_CONNECT",
      "UND_ERR_SOCKET",
      "UND_ERR_HEADERS_TIMEOUT",
    ].includes(code)
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  // Exclude ENOTFOUND from string-based heuristic — DNS failures are permanent
  // and rotating accounts won't help since they all hit the same host.
  if (normalized.includes("enotfound")) {
    return false;
  }

  return (
    normalized.includes("econnrefused") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout") ||
    normalized.includes("connection error") ||
    normalized.includes("connect error") ||
    normalized.includes("fetch failed") ||
    normalized.includes("socket hang up")
  );
}

const TRANSIENT_HTTP_STATUSES = new Set([
  408, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 529,
]);

type ParsedClaudeError = {
  errorType?: string;
  message?: string;
};

/**
 * Parse a Claude error payload when available.
 */
export function parseClaudeErrorBody(errBody: string): ParsedClaudeError {
  try {
    const parsed = JSON.parse(errBody) as {
      type?: unknown;
      error?: { type?: unknown; message?: unknown };
    };
    if (
      parsed &&
      parsed.type === "error" &&
      parsed.error &&
      typeof parsed.error === "object"
    ) {
      return {
        errorType:
          typeof parsed.error.type === "string" ? parsed.error.type : undefined,
        message:
          typeof parsed.error.message === "string"
            ? parsed.error.message
            : undefined,
      };
    }
  } catch {
    // ignore parse errors; caller will use heuristics
  }
  return {};
}

/**
 * Detect malformed request errors that should not trigger account/provider failover.
 */
export function isInvalidRequestError(
  status: number,
  errBody: string,
): boolean {
  if (status === 422) {
    return true;
  }
  const parsed = parseClaudeErrorBody(errBody);
  return (
    parsed.errorType === "invalid_request_error" ||
    errBody.includes("invalid_request_error")
  );
}

/**
 * Detect transient upstream failures that should trigger account/provider failover.
 *
 * Includes Cloudflare 52x statuses and Anthropic 400/api_error wrappers that
 * carry transient HTML responses (e.g. 520 pages) inside `error.message`.
 */
export function isTransientHttpFailure(
  status: number,
  errBody: string,
): boolean {
  if (TRANSIENT_HTTP_STATUSES.has(status)) {
    return true;
  }

  if (status !== 400) {
    return false;
  }

  const parsed = parseClaudeErrorBody(errBody);
  if (parsed.errorType === "overloaded_error") {
    return true;
  }

  if (parsed.errorType !== "api_error") {
    return false;
  }

  const normalized = (parsed.message ?? errBody).toLowerCase();
  return (
    normalized.includes("<!doctype html") ||
    normalized.includes("error code 520") ||
    normalized.includes("web server is returning an unknown error") ||
    normalized.includes("cloudflare") ||
    normalized.includes("internal server error")
  );
}
