/**
 * On-Demand Account Usage Fetch
 *
 * Manual refetch path for account limits: queries Anthropic's OAuth usage
 * endpoint (the same call Claude Code's /usage makes) to get FRESH session /
 * weekly / model-scoped windows for an account without consuming any tokens
 * and without starting a 5h session window.
 *
 * This complements — never replaces — the passive header capture in
 * accountQuota.ts: `usageToQuota` normalizes the endpoint payload into the
 * same `AccountQuota` shape so refreshed data flows through the existing
 * save/merge/cooldown chain.
 *
 * Only OAuth (Bearer) accounts have subscription windows; api_key accounts
 * are skipped and keep their header-derived absolute limits.
 */

import { logger } from "../utils/logger.js";
import { tokenStore } from "../auth/tokenStore.js";
import {
  CLAUDE_CLI_USER_AGENT,
  OAUTH_BETA_HEADERS,
} from "../auth/anthropicOAuth.js";
import {
  needsRefresh,
  refreshTokenFromLatest,
  isPermanentRefreshFailure,
  persistTokens,
} from "./tokenRefresh.js";
import { isAccountAllowed } from "./accountSelection.js";
import type {
  AccountAllowlist,
  AccountQuota,
  AccountQuotaWindow,
  AccountUsageFetchResult,
  AnthropicUsageLimit,
  AnthropicUsageResponse,
  ProxyPassthroughAccount,
} from "../types/index.js";

export const ANTHROPIC_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

const USAGE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Enumerate stored Anthropic accounts for a usage refresh.
 * Read-only: no token refresh, no disable side effects — those decisions
 * belong to the caller (fetchAccountUsage / the routing path respectively).
 */
export async function listAnthropicAccountsForUsage(
  allowlist?: AccountAllowlist,
): Promise<ProxyPassthroughAccount[]> {
  const accounts: ProxyPassthroughAccount[] = [];
  const compoundKeys = await tokenStore.listByPrefix("anthropic:");
  for (const key of compoundKeys) {
    if (!isAccountAllowed(key, allowlist)) {
      continue;
    }
    if (await tokenStore.isDisabled(key)) {
      continue;
    }
    const tokens = await tokenStore.loadTokens(key);
    if (!tokens) {
      continue;
    }
    // Full suffix after the first ":" — a label may itself contain colons,
    // and the quota store and `auth list` rendering key by the full label.
    const separatorIndex = key.indexOf(":");
    accounts.push({
      key,
      label: separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      type: tokens.tokenType === "Bearer" ? "oauth" : "api_key",
      persistTarget: { providerKey: key },
    });
  }
  return accounts;
}

async function requestUsage(
  token: string,
): Promise<{ response?: Response; networkError?: string }> {
  try {
    const response = await fetch(ANTHROPIC_USAGE_URL, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "anthropic-beta": OAUTH_BETA_HEADERS,
        "user-agent": CLAUDE_CLI_USER_AGENT,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(USAGE_FETCH_TIMEOUT_MS),
    });
    return { response };
  } catch (err) {
    return { networkError: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch fresh usage windows for one account. Return-not-throw.
 * Refreshes an expiring/expired token first (de-duped, rotation-safe), and
 * retries once through a forced refresh on a 401.
 */
export async function fetchAccountUsage(
  account: ProxyPassthroughAccount,
): Promise<AccountUsageFetchResult> {
  if (account.type !== "oauth") {
    return {
      ok: false,
      reason: "not_oauth",
      error: "api_key accounts have no subscription usage windows",
    };
  }

  const runRefresh = async (): Promise<AccountUsageFetchResult | null> => {
    const result = await refreshTokenFromLatest(account, account.persistTarget);
    if (result.success) {
      if (account.persistTarget) {
        await persistTokens(account.persistTarget, account);
      }
      return null;
    }
    if (isPermanentRefreshFailure(result)) {
      return {
        ok: false,
        reason: "auth",
        error: "reauth required (refresh token rejected)",
        status: result.status,
      };
    }
    const tokenExpired = account.expiresAt
      ? account.expiresAt <= Date.now()
      : false;
    return tokenExpired
      ? {
          ok: false,
          reason: "auth",
          error: "token expired and refresh failed",
          status: result.status,
        }
      : null; // token still valid — attempt the fetch with it
  };

  let refreshedThisCall = false;
  if (needsRefresh(account)) {
    refreshedThisCall = true;
    const failure = await runRefresh();
    if (failure) {
      return failure;
    }
  }

  let { response, networkError } = await requestUsage(account.token);

  if (response?.status === 401 && account.refreshToken && !refreshedThisCall) {
    const failure = await runRefresh();
    if (failure) {
      return failure;
    }
    ({ response, networkError } = await requestUsage(account.token));
  }

  if (!response) {
    return {
      ok: false,
      reason: "network",
      error: networkError ?? "network failure",
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.debug(`[account-usage] usage fetch failed for ${account.label}`, {
      status: response.status,
      body: body.slice(0, 300),
    });
    return {
      ok: false,
      reason:
        response.status === 401 || response.status === 403 ? "auth" : "http",
      error: `usage endpoint returned HTTP ${response.status}`,
      status: response.status,
    };
  }

  try {
    const usage = (await response.json()) as AnthropicUsageResponse;
    return { ok: true, usage };
  } catch (err) {
    return {
      ok: false,
      reason: "parse",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Normalization (pure CPU — unit-testable, no I/O)
// ---------------------------------------------------------------------------

const REJECTED_SEVERITIES = new Set([
  "rejected",
  "exceeded",
  "over_limit",
  "blocked",
]);

/**
 * "rejected" iff the window is fully used or the provider severity marks it
 * exhausted; anything unknown stays "allowed". Conservative on purpose: a
 * wrong "rejected" would park an account, a wrong "allowed" just delays
 * parking until the passive capture or the reset. Raw severity is preserved
 * on the window so nothing is lost.
 */
function deriveWindowStatus(
  percent: number | null | undefined,
  severity: string | null | undefined,
): string {
  const sev = severity?.trim().toLowerCase();
  if (
    (typeof percent === "number" && percent >= 100) ||
    (sev !== undefined && REJECTED_SEVERITIES.has(sev))
  ) {
    return "rejected";
  }
  return "allowed";
}

/** ISO-8601 → unix seconds; 0 when absent/unparseable (matches headers). */
function isoToEpochSeconds(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

function toFraction(percent: number | null | undefined): number | undefined {
  return typeof percent === "number" && Number.isFinite(percent)
    ? percent / 100
    : undefined;
}

function mapUsageLimit(entry: AnthropicUsageLimit): AccountQuotaWindow {
  const window: AccountQuotaWindow = {
    kind: entry.kind ?? "unknown",
    used: toFraction(entry.percent) ?? 0,
    status: deriveWindowStatus(entry.percent, entry.severity),
    resetsAt: isoToEpochSeconds(entry.resets_at),
  };
  if (entry.group !== undefined) {
    window.group = entry.group;
  }
  if (entry.severity !== null && entry.severity !== undefined) {
    window.severity = entry.severity;
  }
  if (entry.is_active !== null && entry.is_active !== undefined) {
    window.isActive = entry.is_active;
  }
  const scopeModel = entry.scope?.model?.display_name;
  if (scopeModel) {
    window.scopeModel = scopeModel;
  }
  const scopeSurface = entry.scope?.surface;
  if (scopeSurface) {
    window.scopeSurface = scopeSurface;
  }
  return window;
}

/**
 * Normalize a usage-endpoint payload into the `AccountQuota` shape used by
 * the passive header path, so a refresh writes through the exact same
 * save/merge/cooldown chain.
 *
 * `prior` supplies fields the usage payload cannot express (fallback and
 * upgrade-path signals) so `isQuotaOverageAvailable` behaves identically
 * before and after a refresh. `unifiedStatus` is deliberately never set:
 * fabricating it would let the reconcile path treat a refresh like a
 * unified-rejected 429.
 */
export function usageToQuota(
  usage: AnthropicUsageResponse,
  opts: { now: number; prior?: AccountQuota | null },
): AccountQuota | null {
  const limits = Array.isArray(usage.limits) ? usage.limits : [];
  if (!usage.five_hour && !usage.seven_day && limits.length === 0) {
    return null;
  }

  const { now, prior } = opts;
  const windows = limits.map(mapUsageLimit);
  const sessionLimit = limits.find((entry) => entry.kind === "session");
  const weeklyLimit = limits.find((entry) => entry.kind === "weekly_all");

  const sessionPct =
    usage.five_hour?.utilization ?? sessionLimit?.percent ?? undefined;
  const weeklyPct =
    usage.seven_day?.utilization ?? weeklyLimit?.percent ?? undefined;

  // A refresh must never replace a known reset with 0: the payload omits
  // `resets_at` for untouched windows, and a zero reset would stop
  // reconcileCooldownFromQuota from parking a rejected window and make the
  // routing metrics treat it as non-ticking. A stale prior reset degrades
  // gracefully (past resets are ignored / freshened downstream).
  const sessionResetAt =
    isoToEpochSeconds(usage.five_hour?.resets_at) ||
    isoToEpochSeconds(sessionLimit?.resets_at) ||
    (prior?.sessionResetAt ?? 0);
  const weeklyResetAt =
    isoToEpochSeconds(usage.seven_day?.resets_at) ||
    isoToEpochSeconds(weeklyLimit?.resets_at) ||
    (prior?.weeklyResetAt ?? 0);

  const overageEnabled = usage.extra_usage?.is_enabled;
  const overageStatus =
    overageEnabled === true
      ? "allowed"
      : overageEnabled === false
        ? "rejected"
        : (prior?.overageStatus ?? "unknown");

  const quota: AccountQuota = {
    sessionUsed: toFraction(sessionPct) ?? prior?.sessionUsed ?? 0,
    sessionStatus: deriveWindowStatus(sessionPct, sessionLimit?.severity),
    sessionResetAt,
    weeklyUsed: toFraction(weeklyPct) ?? prior?.weeklyUsed ?? 0,
    weeklyStatus: deriveWindowStatus(weeklyPct, weeklyLimit?.severity),
    weeklyResetAt,
    fallbackPercentage: prior?.fallbackPercentage ?? 0,
    overageStatus,
    lastUpdated: now,
    windows,
    windowsUpdatedAt: now,
    source: "usage-api",
  };
  if (prior?.fallbackStatus !== undefined) {
    quota.fallbackStatus = prior.fallbackStatus;
  }
  if (prior?.upgradePaths !== undefined) {
    quota.upgradePaths = prior.upgradePaths;
  }
  return quota;
}
