/**
 * Codex account enumeration + usage/quota normalisation.
 *
 * Mirrors `accountUsage.ts` (Anthropic) for the Codex pool. Codex reports two
 * rate-limit windows — `primary` (short) and `secondary` (weekly) — which we
 * map onto the shared AccountQuota session/weekly fields so the same routing,
 * cooldown, and display code works for both providers.
 */

import { tokenStore } from "../auth/tokenStore.js";
import type { CodexProxyStatusAccountIdentity } from "../types/index.js";
import { normalizeAnthropicAccountKey } from "./accountSelection.js";
import {
  CODEX_ORIGINATOR,
  CODEX_USAGE_URL,
  CODEX_USER_AGENT,
  decodeCodexAccessToken,
  resolveCodexAccountId,
} from "../auth/codexOAuth.js";
import { logger } from "../utils/logger.js";
import type {
  AccountQuota,
  AccountQuotaWindow,
  CodexRateLimitWindow,
  CodexRateLimits,
  CodexUsageFetchResult,
  CodexUsageResponse,
  ProxyPassthroughAccount,
} from "../types/index.js";

export const CODEX_ACCOUNT_PREFIX = "codex:";

/** Keep an account label in the Codex namespace used by its token store. */
export function normalizeCodexAccountKey(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith(CODEX_ACCOUNT_PREFIX)
    ? trimmed
    : `${CODEX_ACCOUNT_PREFIX}${trimmed}`;
}

/** Resolve the provider-qualified key used to render a proxy status row. */
export function resolveProxyStatusAccountIdentity(
  label: string,
  type: string,
  persistedKey?: string,
): CodexProxyStatusAccountIdentity {
  // Current counter snapshots persist the provider-qualified key. Prefer it
  // over the display type so a future type rename cannot move an account into
  // the wrong cooldown/disabled namespace.
  if (persistedKey?.toLowerCase().startsWith("anthropic:")) {
    return {
      provider: "anthropic",
      key: normalizeAnthropicAccountKey(persistedKey),
    };
  }
  if (persistedKey?.startsWith(CODEX_ACCOUNT_PREFIX)) {
    return { provider: "codex", key: persistedKey };
  }
  if (type === "oauth" || type === "api_key") {
    return { provider: "anthropic", key: normalizeAnthropicAccountKey(label) };
  }
  if (type === "codex-oauth") {
    return { provider: "codex", key: normalizeCodexAccountKey(label) };
  }
  return { provider: "other", key: null };
}

/** Enumerate Codex OAuth accounts from the token store for usage refresh. */
export async function listCodexAccountsForUsage(): Promise<
  ProxyPassthroughAccount[]
> {
  const keys = await tokenStore.listByPrefix(CODEX_ACCOUNT_PREFIX);
  const accounts: ProxyPassthroughAccount[] = [];
  for (const key of keys) {
    if (await tokenStore.isDisabled(key)) {
      continue;
    }
    const tokens = await tokenStore.loadTokens(key);
    if (!tokens) {
      continue;
    }
    const label = key.slice(CODEX_ACCOUNT_PREFIX.length) || key;
    accounts.push({
      key,
      label,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      type: tokens.tokenType === "Bearer" ? "oauth" : "api_key",
    });
  }
  return accounts;
}

function toFraction(percent: number | null | undefined): number {
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return 0;
  }
  // Codex reports 0-100; clamp and normalise to 0-1.
  return Math.min(1, Math.max(0, percent / 100));
}

function windowResetEpochSeconds(
  window: CodexRateLimitWindow | null | undefined,
  nowSeconds: number,
): number {
  if (!window) {
    return 0;
  }
  if (
    typeof window.resets_at === "number" &&
    Number.isFinite(window.resets_at) &&
    window.resets_at > 0
  ) {
    // Tolerate ms epochs (~year 2100 ceiling in seconds).
    return window.resets_at > 4_102_444_800
      ? Math.floor(window.resets_at / 1000)
      : window.resets_at;
  }
  const relative =
    typeof window.resets_in_seconds === "number"
      ? window.resets_in_seconds
      : window.reset_after;
  if (
    typeof relative === "number" &&
    Number.isFinite(relative) &&
    relative > 0
  ) {
    return nowSeconds + Math.floor(relative);
  }
  return 0;
}

function deriveWindowStatus(usedFraction: number): string {
  return usedFraction >= 1 ? "rejected" : "allowed";
}

function toQuotaWindow(
  kind: string,
  group: string,
  window: CodexRateLimitWindow | null | undefined,
  nowSeconds: number,
): AccountQuotaWindow | null {
  if (!window) {
    return null;
  }
  const used = toFraction(window.used_percent);
  return {
    kind,
    group,
    used,
    status: deriveWindowStatus(used),
    resetsAt: windowResetEpochSeconds(window, nowSeconds),
    isActive: true,
  };
}

/** Normalise a Codex rate-limit block into the shared AccountQuota shape. */
export function codexRateLimitsToQuota(
  rateLimits: CodexRateLimits | null | undefined,
  now: number = Date.now(),
): AccountQuota {
  const nowSeconds = Math.floor(now / 1000);
  const primary = rateLimits?.primary ?? null;
  const secondary = rateLimits?.secondary ?? null;
  const sessionUsed = toFraction(primary?.used_percent);
  const weeklyUsed = toFraction(secondary?.used_percent);
  const windows: AccountQuotaWindow[] = [];
  const primaryWindow = toQuotaWindow(
    "session",
    "session",
    primary,
    nowSeconds,
  );
  const secondaryWindow = toQuotaWindow(
    "weekly_all",
    "weekly",
    secondary,
    nowSeconds,
  );
  if (primaryWindow) {
    windows.push(primaryWindow);
  }
  if (secondaryWindow) {
    windows.push(secondaryWindow);
  }
  return {
    sessionUsed,
    sessionStatus: deriveWindowStatus(sessionUsed),
    sessionResetAt: windowResetEpochSeconds(primary, nowSeconds),
    weeklyUsed,
    weeklyStatus: deriveWindowStatus(weeklyUsed),
    weeklyResetAt: windowResetEpochSeconds(secondary, nowSeconds),
    // Codex has no overage/fallback concept; keep neutral defaults.
    fallbackPercentage: 0,
    overageStatus: "rejected",
    lastUpdated: now,
    windows: windows.length > 0 ? windows : undefined,
    windowsUpdatedAt: windows.length > 0 ? now : undefined,
    source: "usage-api",
  };
}

/**
 * Parse Codex rate-limit information from response headers. The ChatGPT backend
 * returns a JSON rate-limit blob in `x-codex-ratelimit` / `x-codex-active-limit`
 * on some responses; parse defensively and return null when absent.
 */
export function parseCodexRateLimitHeaders(
  headers: Headers,
  now: number = Date.now(),
): AccountQuota | null {
  const raw =
    headers.get("x-codex-ratelimit") ??
    headers.get("x-codex-active-limit") ??
    null;
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CodexRateLimits | CodexUsageResponse;
    const rateLimits =
      "rate_limits" in parsed && parsed.rate_limits
        ? parsed.rate_limits
        : (parsed as CodexRateLimits);
    return codexRateLimitsToQuota(rateLimits, now);
  } catch {
    return null;
  }
}

/** Fetch the usage/limits window for one Codex account. */
export async function fetchCodexAccountUsage(
  account: ProxyPassthroughAccount,
  options: { timeoutMs?: number } = {},
): Promise<CodexUsageFetchResult> {
  if (account.type !== "oauth") {
    return { ok: false, reason: "not_oauth" };
  }
  const accountId = resolveCodexAccountId(account.token);
  try {
    const response = await fetch(CODEX_USAGE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${account.token}`,
        ...(accountId ? { "chatgpt-account-id": accountId } : {}),
        originator: CODEX_ORIGINATOR,
        "User-Agent": CODEX_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: "auth" };
    }
    if (!response.ok) {
      return { ok: false, reason: "http" };
    }
    const usage = (await response.json()) as CodexUsageResponse;
    return { ok: true, quota: codexRateLimitsToQuota(usage.rate_limits) };
  } catch (error) {
    logger.debug(
      `Codex usage fetch failed for ${account.label}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { ok: false, reason: "network" };
  }
}

/** Decode plan type from an account's access token (display convenience). */
export function codexAccountPlanType(
  account: ProxyPassthroughAccount,
): string | undefined {
  return decodeCodexAccessToken(account.token).planType;
}
