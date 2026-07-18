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

import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  buildStableClaudeCodeBillingHeader,
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_OAUTH_BETAS,
  getOrCreateClaudeCodeIdentity,
  parseClaudeCodeUserId,
} from "../../auth/anthropicOAuth.js";
import {
  clearAccountCooldown,
  loadAccountCooldowns,
  saveAccountCooldown,
} from "../../proxy/accountCooldown.js";
import {
  anthropicAccountKeysEqual,
  ENV_ANTHROPIC_ACCOUNT_KEY,
  isAccountAllowed,
  LEGACY_ANTHROPIC_ACCOUNT_KEY,
  shouldLoadFallbackCredential,
} from "../../proxy/accountSelection.js";
import {
  getUnifiedRateLimitStatus,
  loadAccountQuotas,
  parseQuotaHeaders,
  saveAccountQuota,
} from "../../proxy/accountQuota.js";
import {
  buildClaudeError,
  ClaudeStreamSerializer,
  generateToolUseId,
  parseClaudeRequest,
  serializeClaudeResponse,
} from "../../proxy/claudeFormat.js";
import {
  buildAnthropicModelsListResponse,
  buildTranslationOptions,
  extractText,
  extractToolArgs,
  extractUsageFromStreamResult,
  handleTranslatedJsonRequest,
  handleTranslatedStreamRequest,
  hasTranslatedOutput,
} from "../../proxy/proxyTranslationEngine.js";
import { tracers } from "../../telemetry/tracers.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { ProxyTracer, recordFallbackAttempt } from "../../proxy/proxyTracer.js";
import { createRawStreamCapture } from "../../proxy/rawStreamCapture.js";
import { relocateClientSystemIntoMessages } from "../../proxy/systemRelocation.js";
import {
  logBodyCapture,
  logRequest,
  logRequestAttempt,
} from "../../proxy/requestLogger.js";
import { createSSEInterceptor } from "../../proxy/sseInterceptor.js";
import {
  createStreamTerminalOutcomeTracker,
  mergeStreamTerminalOutcome,
  preflightAnthropicStream,
} from "../../proxy/streamOutcome.js";
import {
  isPermanentRefreshFailure,
  needsRefresh,
  persistTokens,
  refreshToken,
} from "../../proxy/tokenRefresh.js";
import {
  buildProxyTranslationPlan,
  parseRetryAfterMs,
} from "../../proxy/routingPolicy.js";
import type { ProxyTranslationPlan } from "../../types/index.js";
import { writeJsonSnapshotAtomically } from "../../proxy/snapshotPersistence.js";
import {
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
} from "../../proxy/usageStats.js";
import type {
  AccountAllowlist,
  AccountCooldownPlan,
  AccountQuota,
  AnthropicAttemptLogger,
  AnthropicAuthRetryResult,
  AnthropicLoopState,
  AnthropicNonOkResult,
  AnthropicSuccessResult,
  AnthropicUpstreamBodyBuilder,
  AnthropicUpstreamFetchResult,
  ClaudeFinalRequestLogger,
  ClaudeLoggedErrorBuilder,
  ClaudeRequest,
  ClaudeRequestRuntimeContext,
  ClaudeProxyRouteRuntimeOptions,
  ClaudeSnapshot,
  ClaudeSnapshotBody,
  InternalResult,
  LoadedClaudeAccountContext,
  ModelRouterInterface,
  ParsedClaudeError,
  ParsedClaudeRequest,
  PreparedAnthropicAccountAttempt,
  ProxyBodyCaptureLogger,
  ProxyPassthroughAccount,
  ResponseInfoContext,
  RouteGroup,
  RuntimeAccountState,
  ServerContext,
  StreamResult,
  StreamTerminalOutcome,
  TransientRateLimitRetryBudget,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/async/withTimeout.js";
import { ProviderHealthChecker } from "../../utils/providerHealth.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Headers that must never be forwarded upstream to Anthropic. */
const BLOCKED_UPSTREAM_HEADERS = new Set([
  "cookie",
  "proxy-authorization",
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
]);

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** Fill-first: index of the current primary account. Only advances when
 *  the current account exhausts 429 retries or auth retries fail. */
let primaryAccountIndex = 0;
/** Track account count so we can reset primaryAccountIndex when it changes. */
let lastKnownAccountCount = 0;
const MAX_AUTH_RETRIES = 5;
const MAX_TRANSIENT_SAME_ACCOUNT_RETRIES = 2;
const TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS = [250, 1_000] as const;
const MAX_FALLBACK_NETWORK_RETRIES = 1;
const FALLBACK_STREAM_IDLE_TIMEOUT_MS = 2 * 60 * 1000;

/** Maximum upstream 429 attempts per account before rotating — for a TRANSIENT
 *  burst 429 only (window still "allowed", short retry-after). An exhaustion 429
 *  (5h/7d window "rejected") rotates immediately with zero same-account retries,
 *  because retrying is futile until the window resets. Kept small: retrying a
 *  rate-limited account more than a couple of times only burns the client's
 *  wall-clock and, under fill-first, delays reaching a healthy account. */
const MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES = 2;
/** Max time to sleep between transient 429 retries. Caps large upstream
 *  retry-after values so we don't hold the client connection open for minutes. */
const MAX_RATE_LIMIT_RETRY_DELAY_MS = 30_000;
/** Upper bound on any cooldown, as a sanity clamp against a garbage/huge reset
 *  epoch. Must exceed the 7-day weekly window so a genuine weekly-exhaustion
 *  cooldown is never truncated. */
const MAX_COOLDOWN_MS = 8 * 24 * 60 * 60 * 1000; // 8 days
/** Lower bound on any cooldown so we never busy-loop back onto a spent account. */
const MIN_COOLDOWN_MS = 5_000;
/** Cap for transient (per-minute burst) cooldowns — these recover quickly, so
 *  we should return to the account soon rather than parking it for the full
 *  reset window. */
const TRANSIENT_MAX_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
/** Fallback for authoritative rejected states that do not provide a usable
 * reset or retry-after. These are not transient burst limits. */
const DEFAULT_HARD_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_REFRESH_BASE_COOLDOWN_MS = 30_000;
const AUTH_REFRESH_MAX_COOLDOWN_MS = 5 * 60 * 1000;
/** Timeout for upstream requests to Anthropic. Must be generous enough
 *  to cover the full lifecycle of streaming responses, including extended
 *  thinking from Opus models (which can exceed 5 minutes for large contexts). */
const UPSTREAM_FETCH_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const accountRuntimeState = new Map<string, RuntimeAccountState>();

/** Shared across requests so a concurrent burst gets at most two retries for
 *  the account/window, rather than every request starting its own retry chain. */
const transientRateLimitRetryBudgets = new Map<
  string,
  TransientRateLimitRetryBudget
>();

/** Pace requests that arrive while the last usable account has a short
 * transient cooldown. This converts a local 429/retry storm into a bounded
 * queue and avoids releasing every waiting request at the same millisecond. */
const transientCooldownAdmissionSchedules = new Map<
  string,
  { coolingUntil: number; nextAdmissionAt: number }
>();

/** Track whether we've run the one-time startup prune. */
let startupPruneDone = false;

/** Default cooling period when retries are exhausted and upstream didn't
 *  provide a retry-after header. Short enough to recover quickly, long
 *  enough to avoid immediately hammering the same account. */
const DEFAULT_COOLING_PERIOD_MS = 60_000;
const MAX_TRANSIENT_QUEUE_WAIT_MS = 90_000;
const MAX_TRANSIENT_TOTAL_QUEUE_WAIT_MS = 120_000;
const TRANSIENT_ADMISSION_SPACING_MS = 250;
const MAX_TRANSIENT_ADMISSION_SPREAD_MS = 15_000;

/** Advance the primary account index when the current primary is exhausted
 *  (429 retries exhausted or auth failure). This is what makes fill-first work:
 *  we stick to one account until it's unusable. Only advances when the exhausted
 *  account IS the current primary; otherwise it's already a fallback. */
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

/** Resolve the configured primary's stable key to its current index in the
 *  request's enabledAccounts list. Returns 0 (insertion-order fallback) when
 *  no key is configured or the key cannot be matched (account disabled/
 *  removed). The resolution is per-request because enabledAccounts membership
 *  can shift between requests. */
function resolveHomeIndex(
  enabledAccounts: ProxyPassthroughAccount[],
  primaryAccountKey: string | undefined,
): number {
  if (!primaryAccountKey) {
    return 0;
  }
  const idx = enabledAccounts.findIndex((a) =>
    anthropicAccountKeysEqual(a.key, primaryAccountKey),
  );
  return idx >= 0 ? idx : 0;
}

/** If the configured home primary is no longer cooling, reset
 *  primaryAccountIndex back to its index so traffic returns to the preferred
 *  account once its rate limit window expires. Called at the start of each
 *  request. Home is resolved fresh per call via resolveHomeIndex. */
function maybeResetPrimaryToHome(
  enabledAccounts: ProxyPassthroughAccount[],
  primaryAccountKey: string | undefined,
): void {
  if (enabledAccounts.length <= 1) {
    return;
  }
  const homeIndex = resolveHomeIndex(enabledAccounts, primaryAccountKey);
  if (primaryAccountIndex === homeIndex) {
    return;
  }
  const homeAccount = enabledAccounts[homeIndex];
  const homeState = accountRuntimeState.get(homeAccount.key);
  if (
    !homeState ||
    !homeState.coolingUntil ||
    Date.now() >= homeState.coolingUntil
  ) {
    // Home account is no longer cooling — reset to it
    primaryAccountIndex = homeIndex;
    if (homeState?.coolingUntil) {
      const expiredCooldown = homeState.coolingUntil;
      homeState.coolingUntil = undefined;
      homeState.coolingReason = undefined;
      clearAccountCooldown(homeAccount.key, expiredCooldown).catch(() => {
        // Best-effort cleanup; an expired entry is ignored on the next boot.
      });
      logger.always(
        `[proxy] home primary account=${homeAccount.label} cooling expired, resetting primaryAccountIndex to ${homeIndex}`,
      );
    }
  }
}

/** Check if an account is currently in its cooling window. */
function isAccountCooling(accountKey: string): boolean {
  const state = accountRuntimeState.get(accountKey);
  return !!state?.coolingUntil && Date.now() < state.coolingUntil;
}

function claimTransientRateLimitRetry(
  accountKey: string,
  coolingUntil: number,
  now: number = Date.now(),
): number | undefined {
  let budget = transientRateLimitRetryBudgets.get(accountKey);
  if (!budget || now >= budget.coolingUntil) {
    budget = { coolingUntil, retriesClaimed: 0 };
    transientRateLimitRetryBudgets.set(accountKey, budget);
  } else if (coolingUntil > budget.coolingUntil) {
    budget.coolingUntil = coolingUntil;
  }

  if (budget.retriesClaimed >= MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES) {
    return undefined;
  }
  budget.retriesClaimed += 1;
  return budget.retriesClaimed;
}

function claimTransientCooldownAdmission(
  accountKey: string,
  coolingUntil: number,
  now: number = Date.now(),
): number | undefined {
  if (coolingUntil <= now) {
    return 0;
  }
  if (coolingUntil - now > MAX_TRANSIENT_QUEUE_WAIT_MS) {
    return undefined;
  }

  let schedule = transientCooldownAdmissionSchedules.get(accountKey);
  if (!schedule || now >= schedule.coolingUntil) {
    schedule = { coolingUntil, nextAdmissionAt: coolingUntil };
    transientCooldownAdmissionSchedules.set(accountKey, schedule);
  } else if (coolingUntil > schedule.coolingUntil) {
    schedule.coolingUntil = coolingUntil;
    schedule.nextAdmissionAt = Math.max(schedule.nextAdmissionAt, coolingUntil);
  }

  const admissionAt = Math.max(
    now,
    schedule.coolingUntil,
    schedule.nextAdmissionAt,
  );
  if (admissionAt - schedule.coolingUntil > MAX_TRANSIENT_ADMISSION_SPREAD_MS) {
    return undefined;
  }
  schedule.nextAdmissionAt = admissionAt + TRANSIENT_ADMISSION_SPACING_MS;
  return admissionAt - now;
}

async function waitForTransientAccountAvailability(
  orderedAccounts: ProxyPassthroughAccount[],
): Promise<ProxyPassthroughAccount[]> {
  const deadline = Date.now() + MAX_TRANSIENT_TOTAL_QUEUE_WAIT_MS;
  while (Date.now() < deadline) {
    const available = orderedAccounts.filter(
      (account) => !isAccountCooling(account.key),
    );
    if (available.length > 0) {
      return available;
    }

    const now = Date.now();
    const transientCandidate = orderedAccounts
      .map((account) => ({
        account,
        state: getOrCreateRuntimeState(account.key),
      }))
      .filter(
        ({ state }) =>
          state.coolingReason === "transient" &&
          state.coolingUntil !== undefined &&
          state.coolingUntil > now,
      )
      .sort(
        (a, b) =>
          (a.state.coolingUntil ?? Number.POSITIVE_INFINITY) -
          (b.state.coolingUntil ?? Number.POSITIVE_INFINITY),
      )[0];
    if (!transientCandidate?.state.coolingUntil) {
      return [];
    }

    const waitMs = claimTransientCooldownAdmission(
      transientCandidate.account.key,
      transientCandidate.state.coolingUntil,
      now,
    );
    if (waitMs === undefined || now + waitMs > deadline) {
      return [];
    }
    logger.always(
      `[proxy] all usable accounts are transiently cooling; queueing request for account=${transientCandidate.account.label} in ${waitMs}ms`,
    );
    await sleep(waitMs);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Quota-aware cooldown helpers
// ---------------------------------------------------------------------------

/** Convert an Anthropic unified-window reset (Unix epoch SECONDS, per the
 *  `anthropic-ratelimit-unified-*-reset` headers) into epoch-ms. Tolerates a
 *  value already expressed in ms (some intermediaries normalise it). Returns
 *  undefined for absent/zero/past-or-garbage timestamps so callers can fall
 *  back to retry-after. */
function resetEpochToMs(
  resetEpoch: number | undefined,
  now: number,
): number | undefined {
  if (!resetEpoch || resetEpoch <= 0) {
    return undefined;
  }
  // Heuristic: a value beyond ~year 2100 in seconds (4102444800) is already ms.
  const ms = resetEpoch > 4_102_444_800 ? resetEpoch : resetEpoch * 1000;
  return ms > now ? ms : undefined;
}

/** Clamp a cooldown target epoch-ms into [now+MIN, now+MAX]. */
function clampCooldownUntil(untilMs: number, now: number): number {
  return Math.min(
    Math.max(untilMs, now + MIN_COOLDOWN_MS),
    now + MAX_COOLDOWN_MS,
  );
}

/**
 * Decide how to cool an account after a genuine (non-anti-abuse) 429.
 *
 * The unified subscription limits expose per-window status + reset:
 *   - weekly (7d) "rejected"  → hard cap for the week; cool until the 7d reset.
 *   - session (5h) "rejected" → paced out for this session; cool until the 5h reset.
 * Both mean "retrying this account is futile until its window resets" → rotate
 * immediately (no same-account retries) and park the account until the ACTUAL
 * reset — never the legacy 60s hardcap that let us re-hammer a spent account.
 *
 * Anything else (window still "allowed" but momentarily 429'd — a per-minute
 * burst / acceleration limit) is transient: honor retry-after as a floor,
 * allow a couple of jittered same-account retries, then a short cooldown.
 */
function planCooldownFor429(
  quota: AccountQuota | null,
  retryAfterMs: number,
  now: number,
  unifiedStatus: string | undefined = quota?.unifiedStatus,
): AccountCooldownPlan {
  // Weekly exhaustion takes precedence — it's the longest, hardest ceiling.
  if (quota && quota.weeklyStatus === "rejected") {
    const reset =
      resetEpochToMs(quota.weeklyResetAt, now) ??
      (retryAfterMs > 0 ? now + retryAfterMs : now + DEFAULT_COOLING_PERIOD_MS);
    return {
      reason: "weekly",
      coolingUntil: clampCooldownUntil(reset, now),
      rotateImmediately: true,
    };
  }
  if (quota && quota.sessionStatus === "rejected") {
    const reset =
      resetEpochToMs(quota.sessionResetAt, now) ??
      (retryAfterMs > 0 ? now + retryAfterMs : now + DEFAULT_COOLING_PERIOD_MS);
    return {
      reason: "session",
      coolingUntil: clampCooldownUntil(reset, now),
      rotateImmediately: true,
    };
  }
  // Anthropic may reject the authoritative top-level unified limit while both
  // 5h and 7d sub-window statuses still say "allowed". Treating this as a
  // transient burst retries a known-exhausted account and delays failover.
  if (unifiedStatus?.trim().toLowerCase() === "rejected") {
    const reset =
      retryAfterMs > 0 ? now + retryAfterMs : now + DEFAULT_HARD_COOLDOWN_MS;
    return {
      reason: "unified",
      coolingUntil: clampCooldownUntil(reset, now),
      rotateImmediately: true,
    };
  }
  // Transient burst: cool only for retry-after, floored at MIN_COOLDOWN_MS so a
  // tiny retry-after can't make the account eligible almost immediately, and
  // capped so it recovers quickly.
  const base = retryAfterMs > 0 ? retryAfterMs : DEFAULT_COOLING_PERIOD_MS;
  return {
    reason: "transient",
    coolingUntil:
      now +
      Math.max(MIN_COOLDOWN_MS, Math.min(base, TRANSIENT_MAX_COOLDOWN_MS)),
    rotateImmediately: false,
  };
}

/** Human-readable minutes-until for cooldown log lines. */
function minutesUntil(untilMs: number, now: number): number {
  return Math.max(0, Math.round((untilMs - now) / 60000));
}

/**
 * Proactively cool an account when a SUCCESS response reveals a window has just
 * flipped to "rejected" (the boundary request that spends the last of the quota
 * still returns 200 but reports rejected/next-reset). Parks the account until
 * its reset so the next request skips it instead of discovering the limit via a
 * 429. Never shortens an existing, longer cooldown.
 */
function maybeCoolFromQuota(
  state: RuntimeAccountState,
  quota: AccountQuota,
  now: number,
): boolean {
  let until: number | undefined;
  let reason: RuntimeAccountState["coolingReason"];
  if (quota.weeklyStatus === "rejected") {
    until = resetEpochToMs(quota.weeklyResetAt, now);
    reason = "weekly";
  } else if (quota.sessionStatus === "rejected") {
    until = resetEpochToMs(quota.sessionResetAt, now);
    reason = "session";
  } else if (quota.unifiedStatus === "rejected") {
    until = now + DEFAULT_HARD_COOLDOWN_MS;
    reason = "unified";
  }
  if (until === undefined) {
    return false;
  }
  const clamped = clampCooldownUntil(until, now);
  if (!state.coolingUntil || clamped > state.coolingUntil) {
    state.coolingUntil = clamped;
    state.coolingReason = reason;
    logger.always(
      `[proxy] proactively cooling account (${reason}) ~${minutesUntil(clamped, now)}m from success-response quota (status rejected)`,
    );
    return true;
  }
  return false;
}

/**
 * Seed each account's runtime quota from the persisted snapshots in
 * ~/.neurolink/account-quotas.json (keyed by label). Runtime state is
 * in-memory only, so without this the quota-aware ordering is blind after a
 * proxy restart: all accounts tie, selection falls back to token-store
 * enumeration order, and the first account served becomes self-reinforcing
 * (it alone has data) — starving the others regardless of their resets.
 * Never overwrites fresher in-memory quota; stale disk snapshots degrade
 * gracefully because past reset timestamps are ignored by resetEpochToMs.
 */
async function seedRuntimeQuotasFromDisk(
  accounts: ProxyPassthroughAccount[],
): Promise<void> {
  try {
    const [persistedQuotas, persistedCooldowns] = await Promise.all([
      loadAccountQuotas(),
      loadAccountCooldowns(),
    ]);
    const now = Date.now();
    for (const account of accounts) {
      const state = getOrCreateRuntimeState(account.key);
      if (!state.quota && persistedQuotas[account.label]) {
        state.quota = persistedQuotas[account.label];
      }
      const persistedCooldown = persistedCooldowns[account.key];
      if (
        persistedCooldown?.coolingUntil > now &&
        (!state.coolingUntil ||
          persistedCooldown.coolingUntil > state.coolingUntil)
      ) {
        state.coolingUntil = persistedCooldown.coolingUntil;
        state.coolingReason = persistedCooldown.reason;
      }
    }
  } catch {
    // Non-fatal: seeding is best-effort; ordering falls back to probe-first.
  }
}

/** Quota-aware selection is on by default; disable with
 *  NEUROLINK_PROXY_QUOTA_ROUTING=off|false|0. Only affects the fill-first
 *  strategy (round-robin keeps strict rotation). */
function isQuotaRoutingEnabled(): boolean {
  const v = (process.env.NEUROLINK_PROXY_QUOTA_ROUTING ?? "").toLowerCase();
  return v !== "off" && v !== "false" && v !== "0";
}

/** Session-utilization soft limit above which an account is demoted below
 *  accounts with headroom (never made unusable). The utilization snapshot is
 *  always at least one response stale and requests land in concurrent bursts,
 *  so a small buffer under 100% turns the window-exhaustion handoff proactive
 *  (scheduled between requests) instead of reactive (a burst of 429s).
 *  Override with NEUROLINK_PROXY_SESSION_SOFT_LIMIT (0 < x <= 1; 1 disables). */
function getSessionSoftLimit(): number {
  // Number() rejects partially numeric values ("0.5oops") that parseFloat
  // would silently truncate.
  const raw = Number(process.env.NEUROLINK_PROXY_SESSION_SOFT_LIMIT ?? "");
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.97;
}

/** Width of the bucket within which two session resets count as "the same
 *  time", letting the weekly reset decide. Exact epoch equality never occurs,
 *  and bucketing (unlike pairwise closeness) keeps the comparator transitive.
 *  Override with NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS. */
function getSessionResetToleranceMs(): number {
  // Number() + isInteger rejects partially numeric values ("900000oops")
  // that parseInt would silently truncate.
  const raw = Number(
    process.env.NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS ?? "",
  );
  return Number.isInteger(raw) && raw > 0 ? raw : 15 * 60 * 1000;
}

/**
 * Derive the ordering signals for an account from its latest runtime quota.
 *
 * Reset freshening: a window whose reset epoch has already passed is treated
 * as FRESH (0 used, "allowed", reset unknown) at read time — stale snapshot
 * numbers from before the reset can never saturate or reject an account whose
 * window Anthropic has since renewed. The snapshot itself is refreshed from
 * live response headers the next time the account serves a request.
 */
function accountSortMetrics(
  accountKey: string,
  now: number,
  sessionSoftLimit: number,
  sessionResetToleranceMs: number,
) {
  const st = accountRuntimeState.get(accountKey);
  const q = st?.quota;
  const coolingActive = !!st?.coolingUntil && now < st.coolingUntil;
  // resetEpochToMs returns undefined for absent OR passed resets, so a
  // ticking window is exactly "reset !== undefined".
  const weeklyReset = resetEpochToMs(q?.weeklyResetAt, now);
  const sessionReset = resetEpochToMs(q?.sessionResetAt, now);
  const sessionTicking = sessionReset !== undefined;
  const weeklyTicking = weeklyReset !== undefined;
  const sessionUsed = sessionTicking ? (q?.sessionUsed ?? 0) : 0;
  const weeklyUsed = weeklyTicking ? (q?.weeklyUsed ?? -1) : q ? 0 : -1;
  const sessionStatus = sessionTicking
    ? (q?.sessionStatus ?? "unknown")
    : "allowed";
  const weeklyStatus = weeklyTicking
    ? (q?.weeklyStatus ?? "unknown")
    : "allowed";
  const saturated =
    sessionStatus === "throttled" ||
    (sessionTicking && sessionUsed >= sessionSoftLimit);
  return {
    usable:
      !coolingActive &&
      weeklyStatus !== "rejected" &&
      sessionStatus !== "rejected",
    saturated,
    hasQuota: !!q,
    coolingUntil: st?.coolingUntil ?? 0,
    sessionResetBucket: sessionTicking
      ? Math.floor(sessionReset / sessionResetToleranceMs)
      : Number.POSITIVE_INFINITY,
    sessionReset: sessionReset ?? Number.POSITIVE_INFINITY,
    weeklyReset: weeklyReset ?? Number.POSITIVE_INFINITY,
    weeklyUsed,
  };
}

/**
 * Order accounts to MAXIMIZE quota utilization (fill-first, smart order):
 * spend the overall weekly allowance that expires SOONEST first, so quota
 * cannot disappear while traffic is consuming a newer weekly window. The 5h
 * window remains an availability boundary: a session at its soft limit is
 * temporarily demoted until that session resets.
 *
 * Priority among usable accounts:
 *   1. no quota data yet — probe first: one request reveals its windows and
 *      self-corrects the ordering. (Ranking unknowns last would starve them
 *      forever: never picked → never observed → never comparable.)
 *   2. session headroom before session-saturated (>= soft limit or
 *      "throttled") — do not re-hammer an urgent weekly account while its 5h
 *      capacity is temporarily unavailable.
 *   3. soonest WEEKLY (7d) reset — consume the oldest overall allowance
 *      before it expires.
 *   4. soonest SESSION (5h) reset — decides equal-weekly or fresh-weekly ties,
 *      using tolerance buckets for comparator stability.
 *   5. highest weekly utilization — finish off the one closest to done.
 *   6. configured primary account, then insertion order
 * Saturated pairs are ordered by soonest 5h recovery first, then weekly reset,
 * because neither can consume more quota until session capacity returns.
 * Cooling/rejected accounts sort last, soonest-back-to-service first, as
 * last resort.
 */
function orderAccountsByQuota(
  accounts: ProxyPassthroughAccount[],
  now: number,
  primaryKey: string | undefined,
  sessionSoftLimit: number = getSessionSoftLimit(),
  sessionResetToleranceMs: number = getSessionResetToleranceMs(),
): ProxyPassthroughAccount[] {
  const metrics = (key: string) =>
    accountSortMetrics(key, now, sessionSoftLimit, sessionResetToleranceMs);
  return [...accounts].sort((a, b) => {
    const ma = metrics(a.key);
    const mb = metrics(b.key);
    if (ma.usable !== mb.usable) {
      return ma.usable ? -1 : 1;
    }
    if (!ma.usable && !mb.usable) {
      const au = ma.coolingUntil || Number.POSITIVE_INFINITY;
      const bu = mb.coolingUntil || Number.POSITIVE_INFINITY;
      return au - bu;
    }
    if (ma.hasQuota !== mb.hasQuota) {
      return ma.hasQuota ? 1 : -1;
    }
    if (ma.saturated !== mb.saturated) {
      return ma.saturated ? 1 : -1;
    }
    if (ma.saturated && mb.saturated) {
      if (ma.sessionResetBucket !== mb.sessionResetBucket) {
        return ma.sessionResetBucket - mb.sessionResetBucket;
      }
      if (ma.weeklyReset !== mb.weeklyReset) {
        return ma.weeklyReset - mb.weeklyReset;
      }
    } else {
      if (ma.weeklyReset !== mb.weeklyReset) {
        return ma.weeklyReset - mb.weeklyReset;
      }
      if (ma.sessionResetBucket !== mb.sessionResetBucket) {
        return ma.sessionResetBucket - mb.sessionResetBucket;
      }
    }
    if (ma.weeklyUsed !== mb.weeklyUsed) {
      return mb.weeklyUsed - ma.weeklyUsed;
    }
    if (primaryKey && (a.key === primaryKey) !== (b.key === primaryKey)) {
      return a.key === primaryKey ? -1 : 1;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// OAuth polyfill helpers (extracted to reduce block nesting)
// ---------------------------------------------------------------------------

const snapshotCache = new Map<
  string,
  { snapshot: ClaudeSnapshot; loadedAt: number }
>();
const SNAPSHOT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SNAPSHOT_STABLE_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "anthropic-beta",
  "anthropic-dangerous-direct-browser-access",
  "anthropic-version",
  "sec-fetch-mode",
  "user-agent",
  "x-app",
  "x-stainless-arch",
  "x-stainless-lang",
  "x-stainless-os",
  "x-stainless-package-version",
  "x-stainless-retry-count",
  "x-stainless-runtime",
  "x-stainless-runtime-version",
  "x-stainless-timeout",
  "x-subscription-tier",
]);
const NON_CLAUDE_OAUTH_BETAS = [
  "oauth-2025-04-20",
  "claude-code-20250219",
  "fine-grained-tool-streaming-2025-05-14",
] as const;

function getSnapshotSafeLabel(accountLabel: string): string {
  return accountLabel.replace(/[^a-zA-Z0-9._@-]/g, "_");
}

function getSnapshotPath(accountLabel: string): string {
  return join(
    homedir(),
    ".neurolink",
    "header-snapshots",
    `anthropic_${getSnapshotSafeLabel(accountLabel)}.json`,
  );
}

function applySnapshotHeaders(
  headers: Record<string, string>,
  snapshot: ClaudeSnapshot | null,
): void {
  if (!snapshot?.headers) {
    return;
  }

  for (const [sk, sv] of Object.entries(snapshot.headers)) {
    const lower = sk.toLowerCase();
    if (
      typeof sv === "string" &&
      !headers[lower] &&
      !BLOCKED_UPSTREAM_HEADERS.has(lower) &&
      lower !== "authorization" &&
      lower !== "x-api-key" &&
      lower !== "x-claude-code-session-id"
    ) {
      headers[lower] = sv;
    }
  }
}

async function loadClaudeSnapshot(
  accountLabel: string,
): Promise<ClaudeSnapshot | null> {
  try {
    const safeLabel = getSnapshotSafeLabel(accountLabel);
    const cached = snapshotCache.get(safeLabel);
    if (cached && Date.now() - cached.loadedAt < SNAPSHOT_CACHE_TTL_MS) {
      return cached.snapshot;
    }

    const snapshotPath = getSnapshotPath(accountLabel);
    try {
      await access(snapshotPath);
    } catch {
      return null;
    }

    const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as
      | ClaudeSnapshot
      | { headers?: Record<string, string>; body?: ClaudeSnapshotBody };
    if (!snapshot || typeof snapshot !== "object") {
      return null;
    }

    const normalized: ClaudeSnapshot = {
      accountKey:
        "accountKey" in snapshot && typeof snapshot.accountKey === "string"
          ? snapshot.accountKey
          : `anthropic:${accountLabel}`,
      capturedAt:
        "capturedAt" in snapshot && typeof snapshot.capturedAt === "string"
          ? snapshot.capturedAt
          : new Date(0).toISOString(),
      source: "claude-code",
      headers:
        "headers" in snapshot && snapshot.headers ? snapshot.headers : {},
      ...(snapshot.body ? { body: snapshot.body } : {}),
    };
    if (
      Object.keys(normalized.headers).length === 0 &&
      Object.keys(normalized.body ?? {}).length === 0
    ) {
      return null;
    }

    snapshotCache.set(safeLabel, {
      snapshot: normalized,
      loadedAt: Date.now(),
    });
    return normalized;
  } catch {
    return null;
  }
}

function buildSnapshotHeaders(
  headers: Record<string, string>,
  existingHeaders?: Record<string, string>,
): Record<string, string> {
  const merged = { ...(existingHeaders ?? {}) };
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      typeof value === "string" &&
      SNAPSHOT_STABLE_HEADERS.has(lower) &&
      !BLOCKED_UPSTREAM_HEADERS.has(lower) &&
      lower !== "authorization" &&
      lower !== "x-api-key" &&
      lower !== "x-claude-code-session-id"
    ) {
      merged[lower] = value;
    }
  }
  return merged;
}

function extractSnapshotBody(body: unknown): ClaudeSnapshotBody | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const parsed = body as {
    metadata?: { user_id?: unknown };
    system?: Array<{ text?: string; type?: string }> | string;
  };
  const identity = parseClaudeCodeUserId(parsed.metadata?.user_id);
  const systemBlocks = Array.isArray(parsed.system)
    ? parsed.system
    : typeof parsed.system === "string"
      ? [{ type: "text", text: parsed.system }]
      : [];
  const billingHeader = systemBlocks.find(
    (block) =>
      typeof block?.text === "string" &&
      block.text.includes("x-anthropic-billing-header"),
  )?.text;
  const agentBlock = systemBlocks.find(
    (block) =>
      typeof block?.text === "string" &&
      block.text.includes("Claude Agent SDK"),
  )?.text;

  if (!identity && !billingHeader && !agentBlock) {
    return undefined;
  }

  return {
    ...(identity ? { metadataUserId: identity.metadataUserId } : {}),
    ...(identity ? { sessionId: identity.sessionId } : {}),
    ...(billingHeader ? { billingHeader } : {}),
    ...(agentBlock ? { agentBlock } : {}),
  };
}

function isLikelyClaudeClient(
  headers: Record<string, string>,
  snapshotBody?: ClaudeSnapshotBody,
): boolean {
  return (
    typeof headers["x-claude-code-session-id"] === "string" ||
    headers["user-agent"]?.startsWith("claude-cli/") ||
    !!snapshotBody?.metadataUserId ||
    !!snapshotBody?.billingHeader ||
    !!snapshotBody?.agentBlock
  );
}

function snapshotsMatch(
  existing: ClaudeSnapshot | null,
  next: ClaudeSnapshot,
): boolean {
  if (!existing) {
    return false;
  }

  return (
    JSON.stringify(existing.headers ?? {}) ===
      JSON.stringify(next.headers ?? {}) &&
    JSON.stringify(existing.body ?? {}) === JSON.stringify(next.body ?? {})
  );
}

async function persistClaudeSnapshot(
  accountLabel: string,
  snapshot: ClaudeSnapshot,
): Promise<void> {
  const snapshotPath = getSnapshotPath(accountLabel);
  await writeJsonSnapshotAtomically(snapshotPath, snapshot, 0o600);
  snapshotCache.set(getSnapshotSafeLabel(accountLabel), {
    snapshot,
    loadedAt: Date.now(),
  });
}

async function maybeRefreshClaudeSnapshot(
  accountLabel: string,
  accountKey: string,
  headers: Record<string, string>,
  bodyStr: string,
): Promise<ClaudeSnapshot | null> {
  const existing = await loadClaudeSnapshot(accountLabel);

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(bodyStr);
  } catch {
    return existing;
  }

  const body = extractSnapshotBody(parsedBody);
  if (!isLikelyClaudeClient(headers, body)) {
    return existing;
  }

  const next: ClaudeSnapshot = {
    accountKey,
    capturedAt: new Date().toISOString(),
    source: "claude-code",
    headers: buildSnapshotHeaders(headers, existing?.headers),
    body: {
      ...(existing?.body ?? {}),
      ...(body ?? {}),
      ...(typeof headers["x-claude-code-session-id"] === "string"
        ? { sessionId: headers["x-claude-code-session-id"] }
        : {}),
    },
  };

  if (snapshotsMatch(existing, next)) {
    return existing;
  }

  try {
    await persistClaudeSnapshot(accountLabel, next);
  } catch (error) {
    logger.warn("[proxy] failed to persist Claude snapshot", {
      accountLabel,
      error: error instanceof Error ? error.message : String(error),
    });
    snapshotCache.set(getSnapshotSafeLabel(accountLabel), {
      snapshot: next,
      loadedAt: Date.now(),
    });
  }
  return next;
}

/**
 * Parse response-side details (model, finish reason, invoked tools) from a
 * non-streaming Anthropic reply so they can be recorded on the trace span.
 */
function extractResponseInfo(responseJson: unknown): ResponseInfoContext {
  const info: ResponseInfoContext = {};
  if (!responseJson || typeof responseJson !== "object") {
    return info;
  }
  const r = responseJson as {
    model?: unknown;
    stop_reason?: unknown;
    stop_sequence?: unknown;
    content?: unknown;
  };
  if (typeof r.model === "string") {
    info.responseModel = r.model;
  }
  if (typeof r.stop_reason === "string") {
    info.finishReason = r.stop_reason;
  }
  if (typeof r.stop_sequence === "string") {
    info.stopSequence = r.stop_sequence;
  }
  if (Array.isArray(r.content)) {
    const toolCalls = r.content
      .filter(
        (b): b is { type: string; name?: unknown } =>
          !!b &&
          typeof b === "object" &&
          (b as { type?: unknown }).type === "tool_use",
      )
      .map((b) => String((b as { name?: unknown }).name ?? ""))
      .filter((n) => n.length > 0);
    if (toolCalls.length > 0) {
      info.toolCalls = toolCalls;
    }
  }
  return info;
}

/**
 * Build response-info from streaming telemetry (responding model, finish
 * reason, and the tools the model invoked via tool_use content blocks) so the
 * streaming path records the same gen_ai.response.* attributes as non-streaming.
 */
function responseInfoFromStream(data: {
  model?: string;
  stopReason?: string | null;
  stopSequence?: string | null;
  contentBlocks?: Array<{ type?: string; toolName?: string }>;
}): ResponseInfoContext {
  const info: ResponseInfoContext = {};
  if (data.model) {
    info.responseModel = data.model;
  }
  if (data.stopReason) {
    info.finishReason = data.stopReason;
  }
  if (data.stopSequence) {
    info.stopSequence = data.stopSequence;
  }
  const toolCalls = (data.contentBlocks ?? [])
    .filter((b) => b.type === "tool_use")
    .map((b) => String(b.toolName ?? ""))
    .filter((n) => n.length > 0);
  if (toolCalls.length > 0) {
    info.toolCalls = toolCalls;
  }
  return info;
}

/**
 * Polyfill the request body for OAuth accounts.
 * Claude Code injects a billing header, agent block, and metadata.user_id
 * into the body.  Non-CC clients (Curator, custom apps) don't send these —
 * Anthropic rejects without them.
 */
function polyfillOAuthBody(
  bodyStr: string,
  accountToken: string,
  snapshot: ClaudeSnapshot | null,
  isClaudeClientRequest: boolean,
  preferredSessionId?: string,
): { bodyStr: string; sessionId?: string } {
  try {
    const parsed = JSON.parse(bodyStr);

    // Billing header block synthesized for clients that do not already provide
    // the genuine Claude Code identity shape.
    const agentBlock = {
      type: "text",
      text:
        snapshot?.body?.agentBlock ||
        "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
    };

    // Normalise system to an array, then route by client type.
    //
    // The subscription/OAuth path only accepts a `system` it recognises as the
    // genuine Claude Code prompt. A real CC client sends its own billing + agent
    // identity blocks alongside the canonical prompt, which must pass through
    // unchanged. A custom client (Curator) sends its own arbitrary system prompt
    // with NO agent block; left in `system` it is rejected as
    // `rate_limit_error: "Error"`, so we relocate it into the message stream and
    // send only the recognised billing + agent blocks as `system`.
    if (parsed.system) {
      if (typeof parsed.system === "string") {
        parsed.system = [{ type: "text", text: parsed.system }];
      }
      if (Array.isArray(parsed.system)) {
        // Find existing billing/agent blocks wherever the client placed them.
        const billingIdx = parsed.system.findIndex(
          (b: { text?: string }) =>
            typeof b.text === "string" &&
            b.text.includes("x-anthropic-billing-header"),
        );
        const agentIdx = parsed.system.findIndex(
          (b: { text?: string }) =>
            typeof b.text === "string" && b.text.includes("Claude Agent SDK"),
        );
        const billingBlock = {
          type: "text",
          text: buildStableClaudeCodeBillingHeader(
            parsed.system[billingIdx]?.text ?? snapshot?.body?.billingHeader,
          ),
        };

        const hasClaudeCodeSystemIdentity =
          isClaudeClientRequest && agentIdx >= 0;
        if (hasClaudeCodeSystemIdentity) {
          // Claude Code's subagent billing marker, block order, and cache
          // controls are part of the accepted request shape. Preserve every
          // supplied block exactly; only synthesize a billing block if absent.
          if (billingIdx < 0) {
            parsed.system.unshift(billingBlock);
          }
        } else {
          // Strip generated identity blocks before relocating a custom
          // client's actual system instructions into the message stream.
          const indicesToRemove = [billingIdx, agentIdx]
            .filter((i) => i >= 0)
            .sort((a, b) => b - a);
          for (const idx of indicesToRemove) {
            parsed.system.splice(idx, 1);
          }
          if (parsed.system.length > 0) {
            relocateClientSystemIntoMessages(parsed, parsed.system);
          }
          parsed.system = [billingBlock, agentBlock];
        }
      }
    } else {
      const billingBlock = {
        type: "text",
        text: buildStableClaudeCodeBillingHeader(snapshot?.body?.billingHeader),
      };
      parsed.system = [billingBlock, agentBlock];
    }

    // Inject Claude-Code-shaped metadata.user_id (required for OAuth).
    const tokenPrefix = accountToken.substring(
      0,
      Math.min(20, accountToken.length),
    );
    const identity = getOrCreateClaudeCodeIdentity(tokenPrefix, {
      existingUserId:
        parsed.metadata?.user_id ?? snapshot?.body?.metadataUserId,
      preferredSessionId: preferredSessionId ?? snapshot?.body?.sessionId,
    });
    parsed.metadata = {
      ...parsed.metadata,
      user_id: identity.metadataUserId,
    };

    return { bodyStr: JSON.stringify(parsed), sessionId: identity.sessionId };
  } catch {
    return { bodyStr }; // JSON parse failed — use original body
  }
}

// ---------------------------------------------------------------------------
// Legacy credential refresh helper (extracted to reduce block nesting)
// ---------------------------------------------------------------------------

async function tryLoadLegacyAccount(
  creds: {
    email?: string;
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
  const legacyLabel = creds.email?.trim() || "legacy-default";
  const legacyExpired = legacyExpiry ? legacyExpiry < Date.now() : false;
  const legacyAccount = (): ProxyPassthroughAccount => ({
    key: LEGACY_ANTHROPIC_ACCOUNT_KEY,
    label: legacyLabel,
    token: legacyToken,
    refreshToken: legacyRefresh,
    expiresAt: legacyExpiry,
    type: "oauth",
    persistTarget: { credPath: legacyCredPath },
  });

  if (!legacyExpired) {
    return legacyAccount();
  }

  const state = getOrCreateRuntimeState(LEGACY_ANTHROPIC_ACCOUNT_KEY);
  if (state.permanentlyDisabled) {
    return undefined;
  }
  const persistedCooldown = (await loadAccountCooldowns())[
    LEGACY_ANTHROPIC_ACCOUNT_KEY
  ];
  if (
    persistedCooldown?.coolingUntil > Date.now() &&
    (!state.coolingUntil || persistedCooldown.coolingUntil > state.coolingUntil)
  ) {
    state.coolingUntil = persistedCooldown.coolingUntil;
    state.coolingReason = persistedCooldown.reason;
  }
  if (
    state.coolingReason === "auth" &&
    state.coolingUntil &&
    state.coolingUntil > Date.now()
  ) {
    return legacyAccount();
  }

  if (!legacyRefresh) {
    logger.always(
      "[proxy] skipping legacy account (expired, no refresh token)",
    );
    await disableAccountUntilReauth(
      legacyAccount(),
      state,
      "missing_refresh_token",
    );
    return undefined;
  }

  const tmp = {
    token: legacyToken,
    refreshToken: legacyRefresh,
    expiresAt: legacyExpiry,
    label: legacyLabel,
  };
  const ok = await refreshToken(tmp);
  if (!ok.success) {
    if (isPermanentRefreshFailure(ok)) {
      await disableAccountUntilReauth(
        legacyAccount(),
        state,
        "refresh_invalid",
      );
      return undefined;
    }
    const coolingUntil = await coolAccountAfterTransientRefreshFailure(
      legacyAccount(),
      state,
    );
    logger.always(
      `[proxy] legacy refresh temporarily unavailable (${ok.status ?? "network"}); cooling until ${new Date(coolingUntil).toISOString()}`,
    );
    return legacyAccount();
  }

  legacyToken = tmp.token;
  legacyRefresh = tmp.refreshToken;
  legacyExpiry = tmp.expiresAt;
  await persistTokens(legacyCredPath, tmp);
  await clearAuthCooldownAfterRefresh(legacyAccount(), state);
  logger.always("[proxy] refreshed legacy account at startup");

  return legacyAccount();
}

async function handleTranslatedClaudeRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  route: { provider: string; model: string };
  modelRouter?: ModelRouterInterface;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    route,
    modelRouter,
    tracer,
    requestStartTime,
    logProxyBody,
  } = args;
  tracer?.setMode("full");
  const parsed = parseClaudeRequest(body);
  const plan = buildProxyTranslationPlan(
    {
      provider: route.provider,
      model: route.model,
    },
    modelRouter?.getFallbackChain() ?? [],
    body.model,
    parsed,
  );
  logProxyRoutingPlan(logProxyBody, "translated_request", plan);
  const attempts = plan.attempts;

  if (body.stream) {
    return handleTranslatedStreamRequest({
      ctx,
      format: "claude",
      requestModel: body.model,
      parsed,
      attempts,
      tracer,
      requestStartTime,
    });
  }

  return handleTranslatedJsonRequest({
    ctx,
    format: "claude",
    requestModel: body.model,
    parsed,
    attempts,
    tracer,
    requestStartTime,
  });
}

function logProxyRoutingPlan(
  logProxyBody: ProxyBodyCaptureLogger,
  stage: string,
  plan: Pick<ProxyTranslationPlan, "attempts" | "skipped">,
): void {
  logProxyBody({
    phase: "routing_decision",
    contentType: "application/json",
    body: {
      stage,
      attempts: plan.attempts,
    },
  });
}

async function handleClaudePassthroughRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  clientRequestBody: string;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    clientRequestBody,
    tracer,
    requestStartTime,
    logProxyBody,
  } = args;
  tracer?.setMode("passthrough-cli");
  const bodyStr = clientRequestBody;
  const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const upstreamHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(ctx.headers)) {
    if (!BLOCKED_UPSTREAM_HEADERS.has(key.toLowerCase()) && value) {
      upstreamHeaders[key] = value;
    }
  }
  if (!upstreamHeaders["content-type"]) {
    upstreamHeaders["content-type"] = "application/json";
  }

  const upstreamSpan = tracer?.startUpstreamAttempt({
    account: "passthrough",
    attempt: 1,
    polyfillHeaders: false,
    polyfillBody: false,
    upstreamUrl: "https://api.anthropic.com/v1/messages?beta=true",
  });
  tracer?.logUpstreamRequestHeaders(upstreamHeaders);
  tracer?.logUpstreamRequestBody(bodyStr);
  logProxyBody({
    phase: "upstream_request",
    headers: upstreamHeaders,
    body: bodyStr,
    bodySize: Buffer.byteLength(bodyStr, "utf8"),
    contentType: upstreamHeaders["content-type"] ?? "application/json",
    account: "passthrough",
    accountType: "passthrough",
    attempt: 1,
  });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages?beta=true", {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyStr,
      signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
    });
  } catch (fetchErr) {
    const errMsg =
      fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    tracer?.setError("network_error", errMsg);
    upstreamSpan?.end();
    tracer?.end(502, Date.now() - requestStartTime);
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: body.stream ?? false,
      toolCount,
      account: "passthrough",
      accountType: "passthrough",
      responseStatus: 502,
      responseTimeMs: Date.now() - requestStartTime,
      errorType: "network_error",
      errorMessage: errMsg,
    });
    const errorBody = buildClaudeError(
      502,
      `Passthrough fetch failed: ${errMsg}`,
    );
    const errorBodyText = JSON.stringify(errorBody);
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: errorBodyText,
      bodySize: Buffer.byteLength(errorBodyText, "utf8"),
      contentType: "application/json",
      account: "passthrough",
      accountType: "passthrough",
      attempt: 1,
      responseStatus: 502,
      durationMs: Date.now() - requestStartTime,
    });
    return errorBody;
  }

  const upstreamResponseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    upstreamResponseHeaders[key] = value;
  });
  tracer?.logUpstreamResponseHeaders(upstreamResponseHeaders);

  if (!response.ok) {
    const errorText = await response.text();
    tracer?.logUpstreamResponseBody(errorText);
    logProxyBody({
      phase: "upstream_response",
      headers: upstreamResponseHeaders,
      body: errorText,
      bodySize: Buffer.byteLength(errorText, "utf8"),
      contentType:
        upstreamResponseHeaders["content-type"] ?? "application/json",
      account: "passthrough",
      accountType: "passthrough",
      attempt: 1,
      responseStatus: response.status,
      durationMs: Date.now() - requestStartTime,
    });
    logProxyBody({
      phase: "client_response",
      headers: upstreamResponseHeaders,
      body: errorText,
      bodySize: Buffer.byteLength(errorText, "utf8"),
      contentType:
        upstreamResponseHeaders["content-type"] ?? "application/json",
      account: "passthrough",
      accountType: "passthrough",
      attempt: 1,
      responseStatus: response.status,
      durationMs: Date.now() - requestStartTime,
    });
    upstreamSpan?.end();
    tracer?.setError("api_error", errorText.slice(0, 500));
    tracer?.end(response.status, Date.now() - requestStartTime);
    try {
      return JSON.parse(errorText);
    } catch {
      return buildClaudeError(response.status, errorText);
    }
  }

  if (body.stream && response.body) {
    return handleClaudePassthroughStreamResponse({
      ctx,
      body,
      bodyStr,
      response,
      tracer,
      requestStartTime,
      toolCount,
      upstreamSpan,
      upstreamResponseHeaders,
      logProxyBody,
    });
  }

  return handleClaudePassthroughJsonResponse({
    ctx,
    body,
    bodyStr,
    response,
    tracer,
    requestStartTime,
    toolCount,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
  });
}

function trackUpstreamReadableStream(source: ReadableStream<Uint8Array>): {
  stream: ReadableStream<Uint8Array>;
  outcome: Promise<StreamTerminalOutcome>;
} {
  const reader = source.getReader();
  const tracker = createStreamTerminalOutcomeTracker();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (closed) {
        return;
      }
      try {
        const { done, value } = await reader.read();
        if (closed) {
          return;
        }
        if (done) {
          closed = true;
          tracker.complete();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        closed = true;
        const message = error instanceof Error ? error.message : String(error);
        tracker.fail(message);
        controller.error(error);
      }
    },
    cancel(reason) {
      closed = true;
      tracker.cancel();
      return reader.cancel(reason);
    },
  });
  return { stream, outcome: tracker.outcome };
}

async function handleClaudePassthroughStreamResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  bodyStr: string;
  response: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  toolCount: number;
  upstreamSpan?: ReturnType<ProxyTracer["startUpstreamAttempt"]>;
  upstreamResponseHeaders: Record<string, string>;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<Response> {
  const {
    ctx,
    body,
    bodyStr,
    response,
    tracer,
    requestStartTime,
    toolCount,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
  } = args;
  const responseHeaders = { ...upstreamResponseHeaders };
  const { stream: clientCaptureStream, capture: clientCapture } =
    createRawStreamCapture();
  const responseBody = response.body;
  if (!responseBody) {
    throw new Error("Expected passthrough stream response body");
  }
  const trackedStream = trackUpstreamReadableStream(responseBody);
  let streamSource: ReadableStream<Uint8Array> = trackedStream.stream;

  if (tracer) {
    try {
      const { stream: interceptor, telemetry } = createSSEInterceptor({
        captureRawText: true,
      });
      streamSource = streamSource.pipeThrough(interceptor);
      const capturedTracer = tracer;
      const capturedUpstreamSpan = upstreamSpan;
      const capturedResponse = response;
      const capturedRequestBytes = bodyStr.length;

      Promise.all([telemetry, clientCapture, trackedStream.outcome])
        .then(([data, clientBody, rawOutcome]) => {
          const terminalOutcome = mergeStreamTerminalOutcome(
            rawOutcome,
            data.streamErrorMessage,
          );
          const failure = getStreamFailureDetails(terminalOutcome);
          capturedTracer.setUsage({
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          });
          capturedTracer.logStreamEvents(data.events);
          capturedTracer.setResponseInfo(responseInfoFromStream(data));

          const rateLimit5h = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-5h-utilization",
            ) ?? "",
          );
          const rateLimit7d = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-7d-utilization",
            ) ?? "",
          );
          const usageUpdate: Parameters<typeof capturedTracer.setUsage>[0] = {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          };
          if (!isNaN(rateLimit5h)) {
            usageUpdate.rateLimitAfter5h = rateLimit5h;
          }
          if (!isNaN(rateLimit7d)) {
            usageUpdate.rateLimitAfter7d = rateLimit7d;
          }
          if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
            capturedTracer.setUsage(usageUpdate);
          }

          capturedTracer.logUpstreamResponseBody(data.rawText ?? "");
          capturedTracer.recordMetrics();
          capturedTracer.recordBodySizes(
            capturedRequestBytes,
            data.totalBytesReceived,
          );
          capturedUpstreamSpan?.end();
          if (failure) {
            capturedTracer.setError(failure.errorType, failure.message);
          }
          capturedTracer.end(
            failure?.status ?? response.status,
            Date.now() - requestStartTime,
          );

          const traceCtx = capturedTracer.getTraceContext();
          logRequest({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            method: ctx.method,
            path: ctx.path,
            model: body.model,
            stream: true,
            toolCount,
            account: "passthrough",
            accountType: "passthrough",
            responseStatus: failure?.status ?? response.status,
            responseTimeMs: Date.now() - requestStartTime,
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
            traceId: traceCtx.traceId,
            spanId: traceCtx.spanId,
            ...(failure
              ? {
                  errorType: failure.errorType,
                  errorMessage: failure.message,
                }
              : {}),
          });
          logProxyBody({
            phase: "upstream_response",
            headers: responseHeaders,
            body: data.rawText ?? "",
            bodySize: data.totalBytesReceived,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: "passthrough",
            accountType: "passthrough",
            attempt: 1,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: "passthrough",
            accountType: "passthrough",
            attempt: 1,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch((error) => {
          capturedTracer.setError(
            "stream_error",
            error instanceof Error ? error.message : String(error),
          );
          capturedUpstreamSpan?.end();
          capturedTracer.end(500, Date.now() - requestStartTime);

          const traceCtx = capturedTracer.getTraceContext();
          logRequest({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            method: ctx.method,
            path: ctx.path,
            model: body.model,
            stream: true,
            toolCount,
            account: "passthrough",
            accountType: "passthrough",
            responseStatus: 500,
            responseTimeMs: Date.now() - requestStartTime,
            errorType: "stream_error",
            errorMessage:
              error instanceof Error ? error.message : String(error),
            traceId: traceCtx.traceId,
            spanId: traceCtx.spanId,
          });
        });
    } catch {
      trackedStream.outcome.then((outcome) => {
        const failure = getStreamFailureDetails(outcome);
        upstreamSpan?.end();
        if (failure) {
          tracer.setError(failure.errorType, failure.message);
        }
        tracer.end(
          failure?.status ?? response.status,
          Date.now() - requestStartTime,
        );
        const traceCtx = tracer.getTraceContext();
        logRequest({
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
          method: ctx.method,
          path: ctx.path,
          model: body.model,
          stream: true,
          toolCount,
          account: "passthrough",
          accountType: "passthrough",
          responseStatus: failure?.status ?? response.status,
          responseTimeMs: Date.now() - requestStartTime,
          traceId: traceCtx.traceId,
          spanId: traceCtx.spanId,
          ...(failure
            ? {
                errorType: failure.errorType,
                errorMessage: failure.message,
              }
            : {}),
        });
      });
    }
  } else {
    try {
      const { stream: interceptor, telemetry } = createSSEInterceptor({
        captureRawText: true,
      });
      streamSource = streamSource.pipeThrough(interceptor);
      Promise.all([telemetry, clientCapture, trackedStream.outcome])
        .then(([data, clientBody, rawOutcome]) => {
          const terminalOutcome = mergeStreamTerminalOutcome(
            rawOutcome,
            data.streamErrorMessage,
          );
          const failure = getStreamFailureDetails(terminalOutcome);
          logRequest({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            method: ctx.method,
            path: ctx.path,
            model: body.model,
            stream: true,
            toolCount,
            account: "passthrough",
            accountType: "passthrough",
            responseStatus: failure?.status ?? response.status,
            responseTimeMs: Date.now() - requestStartTime,
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
            ...(failure
              ? {
                  errorType: failure.errorType,
                  errorMessage: failure.message,
                }
              : {}),
          });
          logProxyBody({
            phase: "upstream_response",
            headers: responseHeaders,
            body: data.rawText ?? "",
            bodySize: data.totalBytesReceived,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: "passthrough",
            accountType: "passthrough",
            attempt: 1,
            responseStatus: response.status,
            durationMs: Date.now() - requestStartTime,
          });
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: "passthrough",
            accountType: "passthrough",
            attempt: 1,
            responseStatus: response.status,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch((error) => {
          logRequest({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            method: ctx.method,
            path: ctx.path,
            model: body.model,
            stream: true,
            toolCount,
            account: "passthrough",
            accountType: "passthrough",
            responseStatus: 500,
            responseTimeMs: Date.now() - requestStartTime,
            errorType: "stream_telemetry_error",
            errorMessage:
              error instanceof Error ? error.message : String(error),
          });
        });
    } catch {
      // Streaming capture is best-effort; the tracked source still propagates
      // the transport failure to the client.
      trackedStream.outcome.then((outcome) => {
        const failure = getStreamFailureDetails(outcome);
        logRequest({
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
          method: ctx.method,
          path: ctx.path,
          model: body.model,
          stream: true,
          toolCount,
          account: "passthrough",
          accountType: "passthrough",
          responseStatus: failure?.status ?? response.status,
          responseTimeMs: Date.now() - requestStartTime,
          ...(failure
            ? {
                errorType: failure.errorType,
                errorMessage: failure.message,
              }
            : {}),
        });
      });
    }
  }

  const clientStream = streamSource.pipeThrough(clientCaptureStream);
  return new Response(clientStream, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function handleClaudePassthroughJsonResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  bodyStr: string;
  response: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  toolCount: number;
  upstreamSpan?: ReturnType<ProxyTracer["startUpstreamAttempt"]>;
  upstreamResponseHeaders: Record<string, string>;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    bodyStr,
    response,
    tracer,
    requestStartTime,
    toolCount,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
  } = args;
  const responseText = await response.text();
  tracer?.logUpstreamResponseBody(responseText);
  logProxyBody({
    phase: "upstream_response",
    headers: upstreamResponseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: upstreamResponseHeaders["content-type"] ?? "application/json",
    account: "passthrough",
    accountType: "passthrough",
    attempt: 1,
    responseStatus: response.status,
    durationMs: Date.now() - requestStartTime,
  });
  logProxyBody({
    phase: "client_response",
    headers: upstreamResponseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: upstreamResponseHeaders["content-type"] ?? "application/json",
    account: "passthrough",
    accountType: "passthrough",
    attempt: 1,
    responseStatus: response.status,
    durationMs: Date.now() - requestStartTime,
  });

  const responseJson = JSON.parse(responseText);
  if (tracer && responseJson && typeof responseJson === "object") {
    const usage = (responseJson as Record<string, unknown>).usage as
      | Record<string, number>
      | undefined;
    if (usage) {
      tracer.setUsage({
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      });

      const rateLimit5h = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-5h-utilization") ??
          "",
      );
      const rateLimit7d = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-7d-utilization") ??
          "",
      );
      if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
        const usageWithRates: Parameters<typeof tracer.setUsage>[0] = {
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        };
        if (!isNaN(rateLimit5h)) {
          usageWithRates.rateLimitAfter5h = rateLimit5h;
        }
        if (!isNaN(rateLimit7d)) {
          usageWithRates.rateLimitAfter7d = rateLimit7d;
        }
        tracer.setUsage(usageWithRates);
      }
    }
    tracer.setResponseInfo(extractResponseInfo(responseJson));
    tracer.recordMetrics();
    const responseJsonStr = JSON.stringify(responseJson);
    tracer.recordBodySizes(bodyStr.length, responseJsonStr.length);
    upstreamSpan?.end();
    tracer.end(response.status, Date.now() - requestStartTime);

    const traceCtx = tracer.getTraceContext();
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: false,
      toolCount,
      account: "passthrough",
      accountType: "passthrough",
      responseStatus: response.status,
      responseTimeMs: Date.now() - requestStartTime,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      cacheCreationTokens: usage?.cache_creation_input_tokens,
      cacheReadTokens: usage?.cache_read_input_tokens,
      traceId: traceCtx.traceId,
      spanId: traceCtx.spanId,
    });
  } else {
    upstreamSpan?.end();
    tracer?.end(response.status, Date.now() - requestStartTime);
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: false,
      toolCount,
      account: "passthrough",
      accountType: "passthrough",
      responseStatus: response.status,
      responseTimeMs: Date.now() - requestStartTime,
    });
  }

  return responseJson;
}

async function loadClaudeProxyAccounts(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  accountStrategy: "round-robin" | "fill-first";
  primaryAccountKey?: string;
  accountAllowlist?: AccountAllowlist;
  quotaRoutingEnabled?: boolean;
  sessionSoftLimit?: number;
  sessionResetToleranceMs?: number;
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
}): Promise<LoadedClaudeAccountContext | { response: unknown }> {
  const {
    ctx,
    body,
    tracer,
    requestStartTime,
    accountStrategy,
    primaryAccountKey,
    accountAllowlist,
    quotaRoutingEnabled = isQuotaRoutingEnabled(),
    sessionSoftLimit = getSessionSoftLimit(),
    sessionResetToleranceMs = getSessionResetToleranceMs(),
    buildLoggedClaudeError,
  } = args;
  const fs = await import("fs");
  const os = await import("os");
  const accounts: ProxyPassthroughAccount[] = [];
  const legacyCredPath = `${(os as typeof import("os")).homedir()}/.neurolink/anthropic-credentials.json`;
  const { tokenStore } = await import("../../auth/tokenStore.js");
  const persistedCooldowns = await loadAccountCooldowns();

  if (!startupPruneDone) {
    await tokenStore.pruneExpired();
    startupPruneDone = true;
  }

  const compoundKeys = await tokenStore.listByPrefix("anthropic:");
  for (const key of compoundKeys) {
    if (!isAccountAllowed(key, accountAllowlist)) {
      logger.debug(
        `[proxy] skipping account=${key} (not in account allowlist)`,
      );
      continue;
    }
    if (await tokenStore.isDisabled(key)) {
      const existingState = getOrCreateRuntimeState(key);
      const disabledReason = await tokenStore.getDisabledReason(key);
      // Older releases permanently disabled accounts after any refresh error,
      // including timeouts, 429s and 5xx responses. Re-evaluate those legacy
      // entries once under the terminal/transient classifier below.
      const legacyTransientDisable = disabledReason === "refresh_failed";
      if (legacyTransientDisable) {
        await tokenStore.markEnabled(key);
        logger.always(
          `[proxy] account=${key.split(":")[1] ?? key} re-enabled for legacy refresh failure recheck`,
        );
        existingState.permanentlyDisabled = false;
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
    const label = key.split(":")[1] ?? key;
    const accountType: "oauth" | "api_key" =
      tokens.tokenType === "Bearer" ? "oauth" : "api_key";
    const existingState = getOrCreateRuntimeState(key);
    const persistedCooldown = persistedCooldowns[key];
    if (
      persistedCooldown?.coolingUntil > Date.now() &&
      (!existingState.coolingUntil ||
        persistedCooldown.coolingUntil > existingState.coolingUntil)
    ) {
      existingState.coolingUntil = persistedCooldown.coolingUntil;
      existingState.coolingReason = persistedCooldown.reason;
    }

    const addAccount = (): void => {
      accounts.push({
        key,
        label,
        token: accessToken,
        refreshToken: refreshTok,
        expiresAt,
        type: accountType,
        persistTarget: { providerKey: key },
      });
    };
    const isExpired = expiresAt ? expiresAt < Date.now() : false;

    if (isExpired) {
      if (existingState.permanentlyDisabled) {
        continue;
      }

      if (
        existingState.coolingReason === "auth" &&
        existingState.coolingUntil &&
        existingState.coolingUntil > Date.now()
      ) {
        addAccount();
        continue;
      }

      if (!refreshTok) {
        logger.always(
          `[proxy] skipping account=${label} (expired, no refresh token)`,
        );
        await disableAccountUntilReauth(
          { key, label, token: accessToken, type: "oauth" },
          existingState,
          "missing_refresh_token",
        );
        continue;
      }

      const tempAccount = {
        token: accessToken,
        refreshToken: refreshTok,
        expiresAt,
        label,
      };
      const refreshed = await refreshToken(tempAccount);
      if (!refreshed.success) {
        const account = {
          key,
          label,
          token: accessToken,
          type: "oauth",
        } as const;
        if (isPermanentRefreshFailure(refreshed)) {
          logger.always(
            `[proxy] skipping account=${label} (refresh token rejected: ${refreshed.error?.slice(0, 200) ?? "unknown"})`,
          );
          await disableAccountUntilReauth(
            account,
            existingState,
            "refresh_invalid",
          );
        } else {
          const coolingUntil = await coolAccountAfterTransientRefreshFailure(
            account,
            existingState,
          );
          logger.always(
            `[proxy] account=${label} refresh temporarily unavailable (${refreshed.status ?? "network"}); cooling until ${new Date(coolingUntil).toISOString()} and rotating`,
          );
          addAccount();
        }
        continue;
      }

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
      await clearAuthCooldownAfterRefresh({ key }, existingState);
    }

    addAccount();
  }

  if (
    accounts.length === 0 &&
    shouldLoadFallbackCredential(
      compoundKeys.length,
      LEGACY_ANTHROPIC_ACCOUNT_KEY,
      accountAllowlist,
    )
  ) {
    try {
      const creds = JSON.parse(
        (fs as typeof import("fs")).readFileSync(legacyCredPath, "utf8"),
      ) as {
        email?: string;
        oauth?: {
          accessToken?: string;
          refreshToken?: string;
          expiresAt?: number;
        };
      };
      const legacyAccount = await tryLoadLegacyAccount(creds, legacyCredPath);
      if (legacyAccount) {
        accounts.push(legacyAccount);
      }
    } catch {
      // file absent or invalid
    }
  }

  if (
    process.env.ANTHROPIC_API_KEY &&
    accounts.length === 0 &&
    shouldLoadFallbackCredential(
      compoundKeys.length,
      ENV_ANTHROPIC_ACCOUNT_KEY,
      accountAllowlist,
    )
  ) {
    accounts.push({
      key: ENV_ANTHROPIC_ACCOUNT_KEY,
      label: "env",
      token: process.env.ANTHROPIC_API_KEY,
      type: "api_key",
    });
  }

  if (accounts.length === 0) {
    const noCredentialsMessage = accountAllowlist
      ? "No allowed Anthropic credentials are currently available"
      : compoundKeys.length > 0
        ? "Configured Anthropic accounts are disabled or unavailable"
        : "No Anthropic credentials found";
    tracer?.setError("authentication_error", noCredentialsMessage);
    tracer?.end(401, Date.now() - requestStartTime);
    return {
      response: buildLoggedClaudeError(401, noCredentialsMessage),
    };
  }

  for (const account of accounts) {
    const state = getOrCreateRuntimeState(account.key);
    const tokenChanged =
      state.lastToken !== account.token ||
      state.lastRefreshToken !== account.refreshToken;
    if (tokenChanged) {
      if (state.permanentlyDisabled) {
        logger.always(
          `[proxy] account=${account.label} eligible credentials reloaded; clearing stale runtime auth-disable state`,
        );
      }
      // Eligibility was already resolved while loading accounts. This only
      // clears stale in-process auth state after an explicit credential reload.
      state.consecutiveRefreshFailures = 0;
      state.permanentlyDisabled = false;
    }
    state.lastToken = account.token;
    state.lastRefreshToken = account.refreshToken;
  }

  await seedRuntimeQuotasFromDisk(accounts);

  const enabledAccounts = accounts.filter((account) => {
    return !getOrCreateRuntimeState(account.key).permanentlyDisabled;
  });
  if (enabledAccounts.length === 0) {
    const reauthMsg = formatReauthMessage(
      accounts.map((account) => account.label),
    );
    tracer?.setError("authentication_error", reauthMsg);
    tracer?.end(401, Date.now() - requestStartTime);
    return { response: buildLoggedClaudeError(401, reauthMsg) };
  }

  let orderedAccounts = [...enabledAccounts];
  const quotaOrdered =
    accountStrategy === "fill-first" &&
    orderedAccounts.length > 1 &&
    quotaRoutingEnabled;
  if (!quotaOrdered && accountStrategy === "fill-first") {
    // Apply the request-scoped home before deriving this request's order. A
    // hot-reloaded primary change must not lag by one request. Round-robin
    // deliberately skips this reset so its rotating index remains strict.
    maybeResetPrimaryToHome(enabledAccounts, primaryAccountKey);
  }
  if (quotaOrdered) {
    // Fill-first with a smart fill order: spend the account whose weekly window
    // expires soonest while temporarily demoting sessions without headroom.
    // Supersedes the static home/primary index.
    orderedAccounts = orderAccountsByQuota(
      enabledAccounts,
      Date.now(),
      primaryAccountKey,
      sessionSoftLimit,
      sessionResetToleranceMs,
    );
    if (logger.shouldLog("debug")) {
      logger.debug(
        `[proxy] quota-ordered fill sequence: ${orderedAccounts
          .map((a) => a.label)
          .join(" → ")}`,
      );
    }
  } else {
    if (
      accountStrategy === "round-robin" &&
      orderedAccounts.length !== lastKnownAccountCount
    ) {
      primaryAccountIndex = resolveHomeIndex(
        orderedAccounts,
        primaryAccountKey,
      );
      lastKnownAccountCount = orderedAccounts.length;
    }
    if (orderedAccounts.length > 1) {
      const idx = primaryAccountIndex % orderedAccounts.length;
      if (accountStrategy === "round-robin") {
        primaryAccountIndex =
          (primaryAccountIndex + 1) % orderedAccounts.length;
      }
      if (idx > 0) {
        const head = orderedAccounts.splice(0, idx);
        orderedAccounts.push(...head);
      }
    }
  }

  const normalizedAnthropicBody = normalizeClaudeRequestForAnthropic(body);
  const bodyStr = JSON.stringify(normalizedAnthropicBody);
  const requestStart = Date.now();
  const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const url = "https://api.anthropic.com/v1/messages?beta=true";
  const clientHeaders = ctx.headers ?? {};
  const clientSnapshotBody = extractSnapshotBody(body);

  return {
    accounts,
    enabledAccounts,
    orderedAccounts,
    bodyStr,
    requestStart,
    toolCount,
    url,
    clientHeaders,
    isClaudeClientRequest: isLikelyClaudeClient(
      clientHeaders,
      clientSnapshotBody,
    ),
  };
}

async function executeClaudeFallbackTranslation(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  options: Parameters<ServerContext["neurolink"]["stream"]>[0];
  providerLabel: string;
}): Promise<unknown> {
  const {
    ctx,
    body,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
    options,
    providerLabel,
  } = args;
  const fallbackAbortController = new AbortController();
  let streamResult: StreamResult;
  try {
    streamResult = await withTimeout(
      ctx.neurolink.stream({
        ...options,
        abortSignal: fallbackAbortController.signal,
      }),
      FALLBACK_STREAM_IDLE_TIMEOUT_MS,
      `Fallback ${providerLabel} initialization timed out after ${FALLBACK_STREAM_IDLE_TIMEOUT_MS}ms`,
    );
  } catch (error) {
    fallbackAbortController.abort(error);
    throw error;
  }
  const consumeFallbackStream = async (
    onText?: (text: string) => void,
  ): Promise<string> => {
    const iterator = streamResult.stream[Symbol.asyncIterator]();
    let collectedText = "";
    try {
      while (true) {
        const { value: chunk, done } = await withTimeout(
          iterator.next(),
          FALLBACK_STREAM_IDLE_TIMEOUT_MS,
          `Fallback ${providerLabel} stream timed out after ${FALLBACK_STREAM_IDLE_TIMEOUT_MS}ms of inactivity`,
        );
        if (done) {
          return collectedText;
        }
        const text = extractText(chunk);
        if (text) {
          collectedText += text;
          onText?.(text);
        }
      }
    } catch (error) {
      fallbackAbortController.abort(error);
      void iterator.return?.().catch(() => {
        // Timeout/error already determines the request outcome.
      });
      throw error;
    }
  };

  if (body.stream) {
    const serializer = new ClaudeStreamSerializer(body.model, 0);

    // Eagerly consume stream so errors fire synchronously and the
    // fallback loop in tryConfiguredClaudeFallbackChain can catch them.
    const frames: string[] = [];
    for (const frame of serializer.start()) {
      frames.push(frame);
    }
    const collectedText = await consumeFallbackStream((text) => {
      for (const frame of serializer.pushDelta(text)) {
        frames.push(frame);
      }
    });

    const toolCalls = streamResult.toolCalls ?? [];

    if (!hasTranslatedOutput(collectedText, toolCalls)) {
      throw new Error(
        `Translated provider ${providerLabel} returned no content or tool calls`,
      );
    }

    if (toolCalls.length) {
      for (const toolCall of toolCalls) {
        const toolName =
          (toolCall as { toolName?: string }).toolName ??
          (toolCall as { name?: string }).name ??
          "unknown";
        for (const frame of serializer.pushToolUse(
          generateToolUseId(),
          toolName,
          extractToolArgs(toolCall),
        )) {
          frames.push(frame);
        }
      }
    }

    const reason = streamResult.finishReason ?? "end_turn";
    const resolvedUsage = extractUsageFromStreamResult(streamResult.usage);
    for (const frame of serializer.finish(resolvedUsage.output, reason)) {
      frames.push(frame);
    }

    // Telemetry AFTER validation — not before like the old lazy path
    tracer?.end(200, Date.now() - requestStartTime);
    recordFinalSuccess();
    logFinalRequest(200, "", providerLabel, undefined, undefined, {
      inputTokens: resolvedUsage.input,
      outputTokens: resolvedUsage.output,
    });

    const bufferedBody = frames.join("");
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "text/event-stream" },
      body: bufferedBody,
      bodySize: Buffer.byteLength(bufferedBody, "utf8"),
      contentType: "text/event-stream",
      responseStatus: 200,
      durationMs: Date.now() - requestStartTime,
    });

    // Return generator that yields pre-buffered frames
    async function* sseGenerator(): AsyncIterable<string> {
      for (const frame of frames) {
        yield frame;
      }
    }
    return sseGenerator();
  }

  const collectedText = await consumeFallbackStream();
  if (!hasTranslatedOutput(collectedText, streamResult.toolCalls)) {
    throw new Error(
      `Translated provider ${providerLabel} returned no content or tool calls`,
    );
  }

  const internal: InternalResult = {
    content: collectedText,
    model: streamResult.model,
    finishReason: streamResult.finishReason ?? "end_turn",
    reasoning: undefined,
    usage: streamResult.usage
      ? extractUsageFromStreamResult(streamResult.usage)
      : undefined,
    toolCalls: streamResult.toolCalls as InternalResult["toolCalls"],
  };
  tracer?.end(200, Date.now() - requestStartTime);
  recordFinalSuccess();
  const clientResponse = serializeClaudeResponse(internal, body.model);
  logFinalRequest(200, "", providerLabel, undefined, undefined, {
    inputTokens: internal.usage?.input,
    outputTokens: internal.usage?.output,
  });
  const clientResponseText = JSON.stringify(clientResponse);
  logProxyBody({
    phase: "client_response",
    headers: { "content-type": "application/json" },
    body: clientResponseText,
    bodySize: Buffer.byteLength(clientResponseText, "utf8"),
    contentType: "application/json",
    responseStatus: 200,
    durationMs: Date.now() - requestStartTime,
  });
  return clientResponse;
}

async function executeClaudeFallbackWithRetry(
  args: Parameters<typeof executeClaudeFallbackTranslation>[0],
): Promise<unknown> {
  let lastError: unknown;
  for (let retry = 0; retry <= MAX_FALLBACK_NETWORK_RETRIES; retry += 1) {
    try {
      return await executeClaudeFallbackTranslation(args);
    } catch (error) {
      lastError = error;
      if (
        !isRetryableNetworkError(error) ||
        retry === MAX_FALLBACK_NETWORK_RETRIES
      ) {
        throw error;
      }
      const delayMs = TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS[retry] ?? 250;
      logger.always(
        `[proxy] retrying fallback=${args.providerLabel} after transient network error (${retry + 1}/${MAX_FALLBACK_NETWORK_RETRIES}) in ${delayMs}ms: ${describeTransportError(error)}`,
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function tryConfiguredClaudeFallbackChain(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  parsedFallbackRequest: ParsedClaudeRequest;
  modelRouter?: ModelRouterInterface;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<{ response: unknown | null; lastErrorMessage?: string }> {
  const {
    ctx,
    body,
    parsedFallbackRequest,
    modelRouter,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
  } = args;
  const chain = modelRouter?.getFallbackChain() ?? [];
  const fallbackPlan = buildProxyTranslationPlan(
    { provider: "anthropic", model: body.model },
    chain,
    body.model,
    parsedFallbackRequest,
  );
  logProxyBody({
    phase: "routing_decision",
    contentType: "application/json",
    body: {
      stage: "anthropic_fallback",
      attempts: fallbackPlan.attempts.slice(1),
    },
  });

  tracer?.setFallbackInfo({
    triggered: true,
    attemptCount: fallbackPlan.attempts.slice(1).length,
    reason: "all_anthropic_accounts_exhausted",
  });
  let lastFallbackError: string | undefined;

  for (const fallback of fallbackPlan.attempts.slice(1)) {
    if (!fallback.provider || !fallback.model) {
      continue;
    }

    const availability =
      await ProviderHealthChecker.checkFallbackProviderAvailability(
        fallback.provider,
        fallback.model,
      );
    if (!availability.available) {
      logger.always(
        `[proxy] fallback ${fallback.provider}/${fallback.model} health-check failed (${availability.reason ?? "provider unavailable"}), attempting anyway`,
      );
    }

    const fallbackStart = Date.now();
    try {
      logger.always(
        `[proxy] fallback → ${fallback.provider}/${fallback.model}`,
      );
      const options = buildProxyFallbackOptions(parsedFallbackRequest, {
        provider: fallback.provider,
        model: fallback.model,
      });
      const response = await executeClaudeFallbackWithRetry({
        ctx,
        body,
        tracer,
        requestStartTime,
        logProxyBody,
        logFinalRequest,
        options: options as Parameters<ServerContext["neurolink"]["stream"]>[0],
        providerLabel: fallback.provider,
      });
      recordFallbackAttempt({
        provider: fallback.provider,
        model: fallback.model,
        status: "success",
        durationMs: Date.now() - fallbackStart,
      });
      tracer?.setFallbackInfo({
        triggered: true,
        provider: fallback.provider,
        model: fallback.model,
        attemptCount: fallbackPlan.attempts.slice(1).length,
        reason: "fallback_success",
      });
      return { response };
    } catch (fallbackErr) {
      const errMsg =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : String(fallbackErr);

      let errorClass = "unknown";
      if (
        errMsg.includes("Rate limit") ||
        errMsg.includes("rate_limit") ||
        errMsg.includes("max_parallel_requests")
      ) {
        errorClass = "rate_limit";
      } else if (
        errMsg.includes("context length") ||
        errMsg.includes("ContextWindowExceeded")
      ) {
        errorClass = "context_overflow";
      } else if (
        errMsg.includes("no content or tool calls") ||
        errMsg.includes("NoOutputGenerated")
      ) {
        errorClass = "empty_response";
      } else if (
        errMsg.includes("thinking_level") ||
        errMsg.includes("Field required")
      ) {
        errorClass = "schema_mismatch";
      } else if (errMsg.includes("Resource exhausted")) {
        errorClass = "provider_quota";
      }

      logger.always(
        `[proxy] fallback ${fallback.provider}/${fallback.model} failed [${errorClass}]: ${describeTransportError(fallbackErr)}`,
      );
      recordFallbackAttempt({
        provider: fallback.provider,
        model: fallback.model,
        status: "failure",
        errorMessage: `[${errorClass}] ${errMsg}`,
        durationMs: Date.now() - fallbackStart,
      });
      lastFallbackError = `[${fallback.provider}/${fallback.model}] ${describeTransportError(fallbackErr)}`;
    }
  }

  return { response: null, lastErrorMessage: lastFallbackError };
}

async function tryAutoClaudeFallback(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<{ response: unknown | null; lastErrorMessage?: string }> {
  const { ctx, body, tracer, requestStartTime, logProxyBody, logFinalRequest } =
    args;
  const fallbackStart = Date.now();
  try {
    const parsed = parseClaudeRequest(body);
    const plan = buildProxyTranslationPlan(
      { provider: "anthropic", model: body.model },
      [],
      body.model,
      parsed,
    );
    logProxyRoutingPlan(logProxyBody, "auto_fallback", plan);
    const autoAttempt = plan.attempts.find(
      (attempt) => attempt.label === "auto-provider",
    );
    if (!autoAttempt) {
      return { response: null };
    }
    logger.always("[proxy] fallback → auto-provider");
    const options = buildProxyFallbackOptions(parsed);
    const response = await executeClaudeFallbackWithRetry({
      ctx,
      body,
      tracer,
      requestStartTime,
      logProxyBody,
      logFinalRequest,
      options: options as Parameters<ServerContext["neurolink"]["stream"]>[0],
      providerLabel: "auto-provider",
    });
    recordFallbackAttempt({
      provider: "auto-provider",
      model: body.model,
      status: "success",
      durationMs: Date.now() - fallbackStart,
    });
    tracer?.setFallbackInfo({
      triggered: true,
      provider: "auto-provider",
      model: body.model,
      attemptCount: 1,
      reason: "fallback_success",
    });
    return { response };
  } catch (fallbackErr) {
    const errorMessage = describeTransportError(fallbackErr);
    logger.always(`[proxy] fallback auto-provider failed: ${errorMessage}`);
    recordFallbackAttempt({
      provider: "auto-provider",
      model: body.model,
      status: "failure",
      errorMessage,
      durationMs: Date.now() - fallbackStart,
    });
    tracer?.setFallbackInfo({
      triggered: true,
      provider: "auto-provider",
      model: body.model,
      attemptCount: 1,
      reason: "fallback_failure",
    });
    return { response: null, lastErrorMessage: errorMessage };
  }
}

function buildClaudeAnthropicFailureResponse(args: {
  tracer?: ProxyTracer;
  requestStartTime: number;
  authFailureMessage: string | null;
  authCooldownMessage: string | null;
  invalidRequestFailure: {
    status: number;
    body: string;
    contentType?: string;
  } | null;
  sawNetworkError: boolean;
  sawTransientFailure: boolean;
  sawRateLimit: boolean;
  lastError: unknown;
  fallbackFailureMessage?: string;
  orderedAccounts: ProxyPassthroughAccount[];
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): unknown {
  const {
    tracer,
    requestStartTime,
    authFailureMessage,
    authCooldownMessage,
    invalidRequestFailure,
    sawNetworkError,
    sawTransientFailure,
    sawRateLimit,
    lastError,
    fallbackFailureMessage,
    orderedAccounts,
    buildLoggedClaudeError,
    logProxyBody,
    logFinalRequest,
  } = args;
  if (authFailureMessage && !sawRateLimit) {
    tracer?.setError("authentication_error", authFailureMessage);
    tracer?.end(401, Date.now() - requestStartTime);
    return buildLoggedClaudeError(401, authFailureMessage);
  }

  if (authCooldownMessage && !sawRateLimit) {
    tracer?.setError("token_refresh_unavailable", authCooldownMessage);
    tracer?.end(503, Date.now() - requestStartTime);
    return buildLoggedClaudeError(
      503,
      authCooldownMessage,
      "token_refresh_unavailable",
    );
  }

  if (invalidRequestFailure) {
    tracer?.setError(
      "invalid_request_error",
      summarizeErrorMessage(invalidRequestFailure.body),
    );
    tracer?.end(invalidRequestFailure.status, Date.now() - requestStartTime);
    recordFinalError(invalidRequestFailure.status);
    try {
      const parsedError = JSON.parse(invalidRequestFailure.body);
      logFinalRequest(
        invalidRequestFailure.status,
        "",
        "final",
        "invalid_request_error",
        summarizeErrorMessage(invalidRequestFailure.body),
      );
      logProxyBody({
        phase: "client_response",
        headers: {
          "content-type":
            invalidRequestFailure.contentType ?? "application/json",
        },
        body: invalidRequestFailure.body,
        bodySize: Buffer.byteLength(invalidRequestFailure.body, "utf8"),
        contentType: invalidRequestFailure.contentType ?? "application/json",
        responseStatus: invalidRequestFailure.status,
        durationMs: Date.now() - requestStartTime,
      });
      return parsedError;
    } catch {
      return buildLoggedClaudeError(
        invalidRequestFailure.status,
        summarizeErrorMessage(invalidRequestFailure.body),
        "invalid_request_error",
      );
    }
  }

  if ((sawNetworkError || sawTransientFailure) && !sawRateLimit) {
    const fallbackSuffix = fallbackFailureMessage
      ? ` Fallback also failed: ${fallbackFailureMessage}`
      : "";
    const msg = `All Anthropic accounts failed due to transient upstream/network errors. Last error: ${
      lastError instanceof Error
        ? lastError.message
        : String(lastError ?? "unknown")
    }.${fallbackSuffix}`;
    tracer?.setError("transient_error", msg.slice(0, 500));
    tracer?.end(502, Date.now() - requestStartTime);
    return buildLoggedClaudeError(
      502,
      msg,
      fallbackFailureMessage ? "fallback_exhausted" : "transient_error",
    );
  }

  if (!sawRateLimit) {
    const fallbackSuffix = fallbackFailureMessage
      ? ` Fallback also failed: ${fallbackFailureMessage}`
      : "";
    const msg = `All Anthropic accounts failed. Last error: ${
      lastError instanceof Error
        ? lastError.message
        : String(lastError ?? "unknown")
    }.${fallbackSuffix}`;
    tracer?.setError("all_accounts_failed", msg.slice(0, 500));
    tracer?.end(502, Date.now() - requestStartTime);
    return buildLoggedClaudeError(
      502,
      msg,
      fallbackFailureMessage ? "fallback_exhausted" : "all_accounts_failed",
    );
  }

  const now = Date.now();
  const activeRateLimitCooldowns = orderedAccounts
    .map((account) => getOrCreateRuntimeState(account.key))
    .filter(
      (state) =>
        state.coolingUntil &&
        state.coolingUntil > now &&
        state.coolingReason !== "auth",
    );
  const earliestRetryAt = Math.min(
    ...activeRateLimitCooldowns.map(
      (state) => state.coolingUntil ?? Number.POSITIVE_INFINITY,
    ),
  );
  const allAccountsCooling =
    orderedAccounts.length > 0 &&
    activeRateLimitCooldowns.length === orderedAccounts.length;
  const retryAfterSec = allAccountsCooling
    ? Math.max(1, Math.ceil((earliestRetryAt - now) / 1000))
    : 1;
  const errorMessage = allAccountsCooling
    ? `All ${orderedAccounts.length} Anthropic accounts are cooling after upstream rate limits. Earliest retry at ${new Date(earliestRetryAt).toISOString()}.`
    : `All ${orderedAccounts.length} accounts rate-limited after per-account retries.`;
  logger.always(
    `[proxy] all accounts rate-limited, retry in ${retryAfterSec}s`,
  );
  const errorBody = buildClaudeError(429, errorMessage, "overloaded_error");
  tracer?.setError("rate_limit_error", errorMessage);
  tracer?.end(429, Date.now() - requestStartTime);
  recordFinalError(429);
  logFinalRequest(429, "", "final", "rate_limit_error", errorMessage);
  const errorBodyText = JSON.stringify(errorBody);
  logProxyBody({
    phase: "client_response",
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSec),
    },
    body: errorBodyText,
    bodySize: Buffer.byteLength(errorBodyText, "utf8"),
    contentType: "application/json",
    responseStatus: 429,
    durationMs: Date.now() - requestStartTime,
  });
  return new Response(errorBodyText, {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSec),
    },
  });
}

async function handleAnthropicSuccessfulResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  response: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<AnthropicSuccessResult> {
  const {
    ctx,
    body,
    account,
    accountState,
    response,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logAttempt,
    logProxyBody,
    logFinalRequest,
  } = args;
  accountState.consecutiveRefreshFailures = 0;
  logger.always(`[proxy] ← ${response.status} account=${account.label}`);

  const quota = parseQuotaHeaders(response.headers);
  if (quota) {
    // Stash the latest quota on runtime state so the next request can pick the
    // account whose window resets soonest (max-utilization) and proactively
    // skip any whose window is already rejected — without eating a 429 first.
    accountState.quota = quota;
    if (maybeCoolFromQuota(accountState, quota, Date.now())) {
      const { coolingUntil, coolingReason } = accountState;
      if (coolingUntil !== undefined && coolingReason !== undefined) {
        saveAccountCooldown(account.key, coolingUntil, coolingReason).catch(
          () => {
            // Non-fatal: cooldown is already active in memory.
          },
        );
      }
    }
    saveAccountQuota(account.label, quota).catch(() => {
      // Non-fatal: quota persistence is best-effort
    });
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  tracer?.logUpstreamResponseHeaders(responseHeaders);

  if (body.stream) {
    return handleAnthropicStreamingSuccessResponse({
      ctx,
      body,
      account,
      accountState,
      response,
      responseHeaders,
      tracer,
      requestStartTime,
      fetchStartMs,
      attemptNumber,
      finalBodyStr,
      upstreamSpan,
      logAttempt,
      logProxyBody,
      logFinalRequest,
    });
  }

  return handleAnthropicJsonSuccessResponse({
    account,
    response,
    responseHeaders,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  });
}

async function handleAnthropicStreamingSuccessResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  response: Response;
  responseHeaders: Record<string, string>;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<AnthropicSuccessResult> {
  const {
    account,
    accountState,
    response,
    responseHeaders,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logAttempt,
    logProxyBody,
    logFinalRequest,
  } = args;
  if (!response.body) {
    upstreamSpan?.end();
    tracer?.setError("stream_error", "No response body from upstream");
    tracer?.end(502, Date.now() - requestStartTime);
    recordFinalError(502, account.label, account.type);
    logFinalRequest(
      502,
      account.label,
      account.type,
      "stream_error",
      "No response body from upstream",
    );
    const clientError = buildClaudeError(502, "No response body from upstream");
    const clientErrorBody = JSON.stringify(clientError);
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: clientErrorBody,
      bodySize: Buffer.byteLength(clientErrorBody, "utf8"),
      contentType: "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus: 502,
      durationMs: Date.now() - requestStartTime,
    });
    return { response: clientError };
  }

  const reader = response.body.getReader();
  const preflight = await preflightAnthropicStream(reader);
  if (preflight.kind === "transport_error") {
    const message = describeTransportError(preflight.error);
    const partialBody = Buffer.concat(
      preflight.chunks.map((chunk) => Buffer.from(chunk)),
    ).toString("utf8");
    logger.always(
      `[proxy] stream failed before first chunk account=${account.label}: ${message}; trying next account`,
    );
    recordAttemptError(account.label, account.type, 502);
    logAttempt(502, "stream_error", message, { retryable: true });
    tracer?.recordRetry(account.label, "stream_before_first_chunk");
    upstreamSpan?.end();
    logProxyBody({
      phase: "upstream_response",
      headers: responseHeaders,
      body: partialBody,
      bodySize: Buffer.byteLength(partialBody, "utf8"),
      contentType: responseHeaders["content-type"] ?? "text/event-stream",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus: response.status,
      durationMs: Date.now() - fetchStartMs,
      metadata: { logicalStatus: 502, transportError: message },
    });
    return {
      retryNextAccount: true,
      failure: { message, rateLimit: false },
    };
  }
  if (preflight.kind === "empty") {
    await reader.cancel().catch(() => {
      // Best-effort release before rotating to another account.
    });
    logger.always(
      `[proxy] ← empty stream from account=${account.label}, trying next`,
    );
    recordAttemptError(account.label, account.type, 502);
    logAttempt(502, "empty_stream", "Empty upstream stream", {
      retryable: true,
    });
    tracer?.recordRetry(account.label, "empty_stream");
    upstreamSpan?.end();
    logProxyBody({
      phase: "upstream_response",
      headers: responseHeaders,
      body: "",
      bodySize: 0,
      contentType: responseHeaders["content-type"] ?? "text/event-stream",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus: response.status,
      durationMs: Date.now() - fetchStartMs,
      metadata: { logicalStatus: 502, upstreamErrorType: "empty_stream" },
    });
    return {
      retryNextAccount: true,
      failure: { message: "Empty upstream stream", rateLimit: false },
    };
  }
  if (preflight.kind === "sse_error") {
    await reader.cancel().catch(() => {
      // Best-effort release before rotating to another account.
    });
    const bodyText = Buffer.concat(
      preflight.chunks.map((chunk) => Buffer.from(chunk)),
    ).toString("utf8");
    const isRateLimit = preflight.errorType === "rate_limit_error";
    const logicalStatus = isRateLimit ? 429 : 502;
    const quota = parseQuotaHeaders(responseHeaders);
    const now = Date.now();
    if (isRateLimit) {
      const cooldownPlan = planCooldownFor429(
        quota,
        parseRetryAfterMs(responseHeaders["retry-after"] ?? null),
        now,
        getUnifiedRateLimitStatus(responseHeaders),
      );
      accountState.quota = quota ?? accountState.quota;
      const rateLimitKind =
        cooldownPlan.reason === "transient" ? "transient" : "quota";
      if (
        !accountState.coolingUntil ||
        cooldownPlan.coolingUntil > accountState.coolingUntil
      ) {
        accountState.coolingUntil = cooldownPlan.coolingUntil;
        accountState.coolingReason = cooldownPlan.reason;
        await saveAccountCooldown(
          account.key,
          cooldownPlan.coolingUntil,
          cooldownPlan.reason,
        ).catch(() => {
          // Non-fatal: routing already has the in-memory cooldown.
        });
      }
      recordAttemptError(account.label, account.type, 429, rateLimitKind);
      logAttempt(429, "rate_limit_error", preflight.message, {
        retryable: true,
        rateLimitKind,
        cooldownReason: cooldownPlan.reason,
      });
    } else {
      recordAttemptError(account.label, account.type, logicalStatus);
      logAttempt(logicalStatus, preflight.errorType, preflight.message, {
        retryable: true,
      });
    }
    logger.always(
      `[proxy] immediate SSE ${preflight.errorType} account=${account.label}: ${preflight.message}; rotating before client commit`,
    );
    tracer?.recordRetry(
      account.label,
      isRateLimit
        ? "stream_rate_limit_before_commit"
        : "stream_error_before_commit",
    );
    upstreamSpan?.end();
    logProxyBody({
      phase: "upstream_response",
      headers: responseHeaders,
      body: bodyText,
      bodySize: Buffer.byteLength(bodyText, "utf8"),
      contentType: responseHeaders["content-type"] ?? "text/event-stream",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus: response.status,
      durationMs: Date.now() - fetchStartMs,
      metadata: {
        logicalStatus,
        upstreamErrorType: preflight.errorType,
      },
    });
    return {
      retryNextAccount: true,
      failure: { message: preflight.message, rateLimit: isRateLimit },
    };
  }

  const streamOutcomeTracker = createStreamTerminalOutcomeTracker();
  let mainStreamClosed = false;
  const remainingStream = new ReadableStream({
    start(controller) {
      for (const chunk of preflight.chunks) {
        controller.enqueue(chunk);
      }
    },
    async pull(controller) {
      if (mainStreamClosed) {
        return;
      }
      try {
        const { done, value } = await reader.read();
        if (mainStreamClosed) {
          return;
        }
        if (done) {
          mainStreamClosed = true;
          streamOutcomeTracker.complete();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (streamErr) {
        const errMsg = describeTransportError(streamErr);
        logger.always(
          `[proxy] mid-stream error account=${account.label}: ${errMsg}`,
        );
        streamOutcomeTracker.fail(errMsg);
        if (!mainStreamClosed) {
          mainStreamClosed = true;
          const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${errMsg}` } })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.close();
        }
      }
    },
    cancel() {
      mainStreamClosed = true;
      streamOutcomeTracker.cancel();
      return reader.cancel();
    },
  });

  const result = attachAnthropicSuccessStreamTelemetry({
    account,
    response,
    responseHeaders,
    remainingStream,
    streamOutcome: streamOutcomeTracker.outcome,
    tracer,
    requestStartTime,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  });
  return { response: result };
}

function getStreamFailureDetails(
  outcome: StreamTerminalOutcome,
): { status: number; errorType: string; message: string } | undefined {
  if (outcome.kind === "upstream_error") {
    return {
      status: 502,
      errorType: "stream_error",
      message: outcome.message,
    };
  }
  if (outcome.kind === "client_cancelled") {
    return {
      status: 499,
      errorType: "client_cancelled",
      message: "Client cancelled the streaming response",
    };
  }
  return undefined;
}

function attachAnthropicSuccessStreamTelemetry(args: {
  account: ProxyPassthroughAccount;
  response: Response;
  responseHeaders: Record<string, string>;
  remainingStream: ReadableStream<Uint8Array>;
  streamOutcome: Promise<StreamTerminalOutcome>;
  tracer?: ProxyTracer;
  requestStartTime: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Response {
  const {
    account,
    response,
    responseHeaders,
    remainingStream,
    streamOutcome,
    tracer,
    requestStartTime,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  const { stream: clientCaptureStream, capture: clientCapture } =
    createRawStreamCapture();
  let streamSource: ReadableStream<Uint8Array> = remainingStream;

  if (tracer) {
    try {
      const { stream: interceptor, telemetry } = createSSEInterceptor({
        captureRawText: true,
      });
      streamSource = streamSource.pipeThrough(interceptor);
      const capturedTracer = tracer;
      const capturedUpstreamSpan = upstreamSpan;
      const capturedResponse = response;
      const capturedRequestBytes = finalBodyStr.length;
      const capturedAccountLabel = account.label;

      Promise.all([telemetry, clientCapture, streamOutcome])
        .then(([data, clientBody, rawOutcome]) => {
          const terminalOutcome = mergeStreamTerminalOutcome(
            rawOutcome,
            data.streamErrorMessage,
          );
          capturedTracer.setUsage({
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          });
          capturedTracer.logStreamEvents(data.events);
          capturedTracer.setResponseInfo(responseInfoFromStream(data));
          const rateLimit5h = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-5h-utilization",
            ) ?? "",
          );
          const rateLimit7d = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-7d-utilization",
            ) ?? "",
          );
          const usageUpdate: Parameters<typeof capturedTracer.setUsage>[0] = {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          };
          if (!isNaN(rateLimit5h)) {
            usageUpdate.rateLimitAfter5h = rateLimit5h;
          }
          if (!isNaN(rateLimit7d)) {
            usageUpdate.rateLimitAfter7d = rateLimit7d;
          }
          if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
            capturedTracer.setUsage(usageUpdate);
          }

          capturedTracer.logUpstreamResponseBody(data.rawText ?? "");
          capturedTracer.recordMetrics();
          capturedTracer.recordBodySizes(
            capturedRequestBytes,
            data.totalBytesReceived,
          );
          capturedUpstreamSpan?.end();
          const failure = getStreamFailureDetails(terminalOutcome);
          const usage = {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          };
          if (failure) {
            capturedTracer.setError(failure.errorType, failure.message);
            capturedTracer.end(failure.status, Date.now() - requestStartTime);
            recordFinalError(
              failure.status,
              capturedAccountLabel,
              account.type,
            );
            logFinalRequest(
              failure.status,
              capturedAccountLabel,
              account.type,
              failure.errorType,
              failure.message,
              usage,
            );
          } else {
            capturedTracer.end(200, Date.now() - requestStartTime);
            recordFinalSuccess(capturedAccountLabel, account.type);
            logFinalRequest(
              200,
              capturedAccountLabel,
              account.type,
              undefined,
              undefined,
              usage,
            );
          }
          logProxyBody({
            phase: "upstream_response",
            headers: responseHeaders,
            body: data.rawText ?? "",
            bodySize: data.totalBytesReceived,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch((error) => {
          capturedTracer.setError(
            "stream_error",
            error instanceof Error ? error.message : String(error),
          );
          capturedUpstreamSpan?.end();
          capturedTracer.end(500, Date.now() - requestStartTime);
          recordFinalError(500, capturedAccountLabel, account.type);
          logFinalRequest(
            500,
            capturedAccountLabel,
            account.type,
            "stream_error",
            error instanceof Error ? error.message : String(error),
          );
        });
    } catch {
      // Interceptor attachment failed after stream setup. Preserve delivery but
      // still settle the request from the actual stream terminal outcome.
      streamOutcome.then((outcome) => {
        const failure = getStreamFailureDetails(outcome);
        upstreamSpan?.end();
        if (failure) {
          tracer.setError(failure.errorType, failure.message);
          tracer.end(failure.status, Date.now() - requestStartTime);
          recordFinalError(failure.status, account.label, account.type);
          logFinalRequest(
            failure.status,
            account.label,
            account.type,
            failure.errorType,
            failure.message,
          );
        } else {
          tracer.end(response.status, Date.now() - requestStartTime);
          recordFinalSuccess(account.label, account.type);
          logFinalRequest(response.status, account.label, account.type);
        }
      });
    }
  } else {
    upstreamSpan?.end();
    try {
      const { stream: noTracerInterceptor, telemetry: noTracerTelemetry } =
        createSSEInterceptor({
          captureRawText: true,
        });
      streamSource = streamSource.pipeThrough(noTracerInterceptor);
      const capturedAccountLabel = account.label;
      Promise.all([noTracerTelemetry, clientCapture, streamOutcome])
        .then(([data, clientBody, rawOutcome]) => {
          const terminalOutcome = mergeStreamTerminalOutcome(
            rawOutcome,
            data.streamErrorMessage,
          );
          const failure = getStreamFailureDetails(terminalOutcome);
          const usage = {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          };
          if (failure) {
            recordFinalError(
              failure.status,
              capturedAccountLabel,
              account.type,
            );
            logFinalRequest(
              failure.status,
              capturedAccountLabel,
              account.type,
              failure.errorType,
              failure.message,
              usage,
            );
          } else {
            recordFinalSuccess(capturedAccountLabel, account.type);
            logFinalRequest(
              200,
              capturedAccountLabel,
              account.type,
              undefined,
              undefined,
              usage,
            );
          }
          logProxyBody({
            phase: "upstream_response",
            headers: responseHeaders,
            body: data.rawText ?? "",
            bodySize: data.totalBytesReceived,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          recordFinalError(500, account.label, account.type);
          logFinalRequest(
            500,
            account.label,
            account.type,
            "stream_telemetry_error",
            message,
          );
        });
    } catch {
      clientCapture
        .then((clientBody) => {
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: account.label,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch(() => {
          // Non-fatal
        });
      streamOutcome.then((outcome) => {
        const failure = getStreamFailureDetails(outcome);
        if (failure) {
          recordFinalError(failure.status, account.label, account.type);
          logFinalRequest(
            failure.status,
            account.label,
            account.type,
            failure.errorType,
            failure.message,
          );
        } else {
          recordFinalSuccess(account.label, account.type);
          logFinalRequest(response.status, account.label, account.type);
        }
      });
    }
  }

  const clientStream = streamSource.pipeThrough(clientCaptureStream);
  const clientResponseHeaders: Record<string, string> = {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  };
  for (const headerName of [
    "retry-after",
    "anthropic-ratelimit-requests-remaining",
    "anthropic-ratelimit-requests-limit",
    "anthropic-ratelimit-tokens-remaining",
    "anthropic-ratelimit-tokens-limit",
  ]) {
    const value = response.headers.get(headerName);
    if (value) {
      clientResponseHeaders[headerName] = value;
    }
  }

  return new Response(clientStream, {
    status: response.status,
    headers: clientResponseHeaders,
  });
}

async function handleAnthropicJsonSuccessResponse(args: {
  account: ProxyPassthroughAccount;
  response: Response;
  responseHeaders: Record<string, string>;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<AnthropicSuccessResult> {
  const {
    account,
    response,
    responseHeaders,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  const responseText = await response.text();
  tracer?.logUpstreamResponseBody(responseText);
  logProxyBody({
    phase: "upstream_response",
    headers: responseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: responseHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: response.status,
    durationMs: Date.now() - fetchStartMs,
  });
  logProxyBody({
    phase: "client_response",
    headers: responseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: responseHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: response.status,
    durationMs: Date.now() - requestStartTime,
  });
  const responseJson = JSON.parse(responseText);

  if (tracer && responseJson && typeof responseJson === "object") {
    const usage = (responseJson as Record<string, unknown>).usage as
      | Record<string, number>
      | undefined;
    if (usage) {
      tracer.setUsage({
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      });

      const rateLimit5h = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-5h-utilization") ??
          "",
      );
      const rateLimit7d = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-7d-utilization") ??
          "",
      );
      if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
        const usageWithRates: Parameters<typeof tracer.setUsage>[0] = {
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        };
        if (!isNaN(rateLimit5h)) {
          usageWithRates.rateLimitAfter5h = rateLimit5h;
        }
        if (!isNaN(rateLimit7d)) {
          usageWithRates.rateLimitAfter7d = rateLimit7d;
        }
        tracer.setUsage(usageWithRates);
      }
    }
    tracer.setResponseInfo(extractResponseInfo(responseJson));
    tracer.recordMetrics();
    const responseJsonStr = JSON.stringify(responseJson);
    tracer.recordBodySizes(finalBodyStr.length, responseJsonStr.length);
    upstreamSpan?.end();
    tracer.end(response.status, Date.now() - requestStartTime);
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(
      response.status,
      account.label,
      account.type,
      undefined,
      undefined,
      {
        inputTokens: usage?.input_tokens,
        outputTokens: usage?.output_tokens,
        cacheCreationTokens: usage?.cache_creation_input_tokens,
        cacheReadTokens: usage?.cache_read_input_tokens,
      },
    );
  } else {
    upstreamSpan?.end();
    const noTracerUsage =
      responseJson && typeof responseJson === "object"
        ? ((responseJson as Record<string, unknown>).usage as
            | Record<string, number>
            | undefined)
        : undefined;
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(
      response.status,
      account.label,
      account.type,
      undefined,
      undefined,
      {
        inputTokens: noTracerUsage?.input_tokens,
        outputTokens: noTracerUsage?.output_tokens,
        cacheCreationTokens: noTracerUsage?.cache_creation_input_tokens,
        cacheReadTokens: noTracerUsage?.cache_read_input_tokens,
      },
    );
  }

  return { response: responseJson };
}

async function handleAnthropicSuccessfulRetryResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  retryResp: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<Response | unknown> {
  const {
    body,
    account,
    accountState,
    retryResp,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  const retryQuota = parseQuotaHeaders(retryResp.headers);
  if (retryQuota) {
    // Keep the auth-retry success path in parity with the main success path:
    // stash quota for proactive selection and proactively cool if this
    // response reveals the window flipped to "rejected".
    accountState.quota = retryQuota;
    if (maybeCoolFromQuota(accountState, retryQuota, Date.now())) {
      const { coolingUntil, coolingReason } = accountState;
      if (coolingUntil !== undefined && coolingReason !== undefined) {
        saveAccountCooldown(account.key, coolingUntil, coolingReason).catch(
          () => {
            // Non-fatal: cooldown is already active in memory.
          },
        );
      }
    }
    saveAccountQuota(account.label, retryQuota).catch((error) => {
      logger.debug("[proxy] Failed to persist account quota after auth retry", {
        account: account.label,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  if (body.stream && retryResp.body) {
    const retryReader = retryResp.body.getReader();
    const streamOutcomeTracker = createStreamTerminalOutcomeTracker();
    let retryStreamClosed = false;
    const retryStream = new ReadableStream({
      async pull(controller) {
        if (retryStreamClosed) {
          return;
        }
        try {
          const { done, value } = await retryReader.read();
          if (retryStreamClosed) {
            return;
          }
          if (done) {
            retryStreamClosed = true;
            streamOutcomeTracker.complete();
            controller.close();
            return;
          }
          controller.enqueue(value);
        } catch (streamErr) {
          const errMsg = describeTransportError(streamErr);
          logger.always(
            `[proxy] mid-stream error (auth-retry) account=${account.label}: ${errMsg}`,
          );
          streamOutcomeTracker.fail(errMsg);
          if (!retryStreamClosed) {
            retryStreamClosed = true;
            const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${errMsg}` } })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
            controller.close();
          }
        }
      },
      cancel() {
        retryStreamClosed = true;
        streamOutcomeTracker.cancel();
        return retryReader.cancel();
      },
    });

    return attachAnthropicSuccessStreamTelemetry({
      account,
      response: retryResp,
      responseHeaders: Object.fromEntries([...retryResp.headers.entries()]),
      remainingStream: retryStream,
      streamOutcome: streamOutcomeTracker.outcome,
      tracer,
      requestStartTime,
      attemptNumber,
      finalBodyStr,
      upstreamSpan,
      logProxyBody,
      logFinalRequest,
    });
  }

  const retryRespHeaders = Object.fromEntries([...retryResp.headers.entries()]);
  const retryText = await retryResp.text();
  tracer?.logUpstreamResponseHeaders(retryRespHeaders);
  tracer?.logUpstreamResponseBody(retryText);
  logProxyBody({
    phase: "upstream_response",
    headers: retryRespHeaders,
    body: retryText,
    bodySize: Buffer.byteLength(retryText, "utf8"),
    contentType: retryRespHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: retryResp.status,
    durationMs: Date.now() - fetchStartMs,
  });
  logProxyBody({
    phase: "client_response",
    headers: retryRespHeaders,
    body: retryText,
    bodySize: Buffer.byteLength(retryText, "utf8"),
    contentType: retryRespHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: retryResp.status,
    durationMs: Date.now() - requestStartTime,
  });

  const retryJson = JSON.parse(retryText);
  if (tracer && retryJson && typeof retryJson === "object") {
    const retryUsage = (retryJson as Record<string, unknown>).usage as
      | Record<string, number>
      | undefined;
    if (retryUsage) {
      tracer.setUsage({
        inputTokens: retryUsage.input_tokens ?? 0,
        outputTokens: retryUsage.output_tokens ?? 0,
        cacheCreationTokens: retryUsage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: retryUsage.cache_read_input_tokens ?? 0,
      });
    }
    tracer.setResponseInfo(extractResponseInfo(retryJson));
    tracer.recordMetrics();
    const retryJsonStr = JSON.stringify(retryJson);
    tracer.recordBodySizes(finalBodyStr.length, retryJsonStr.length);
    upstreamSpan?.end();
    tracer.end(retryResp.status, Date.now() - requestStartTime);
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(
      retryResp.status,
      account.label,
      account.type,
      undefined,
      undefined,
      {
        inputTokens: retryUsage?.input_tokens,
        outputTokens: retryUsage?.output_tokens,
        cacheCreationTokens: retryUsage?.cache_creation_input_tokens,
        cacheReadTokens: retryUsage?.cache_read_input_tokens,
      },
    );
  } else {
    upstreamSpan?.end();
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(retryResp.status, account.label, account.type);
  }

  return retryJson;
}

async function handleAnthropicAuthRetry(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  headers: Record<string, string>;
  buildUpstreamBody: (token: string) => { bodyStr: string; sessionId?: string };
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  tracer?: ProxyTracer;
  requestStartTime: number;
  allocateAttemptNumber: () => number;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  lastError: unknown;
  authFailureMessage: string | null;
  sawRateLimit: boolean;
  sawTransientFailure: boolean;
  sawNetworkError: boolean;
}): Promise<AnthropicAuthRetryResult> {
  const {
    ctx,
    body,
    account,
    accountState,
    headers,
    buildUpstreamBody,
    enabledAccounts,
    orderedAccounts,
    tracer,
    requestStartTime,
    allocateAttemptNumber,
    upstreamSpan,
    logAttempt,
    logProxyBody,
    logFinalRequest,
    lastError,
    authFailureMessage,
    sawRateLimit,
    sawTransientFailure,
    sawNetworkError,
  } = args;
  recordAttemptError(account.label, account.type, 401);
  logAttempt(401, "authentication_error", "received 401 from Anthropic", {
    retryable: true,
  });
  let currentLastError = lastError;
  let currentAuthFailureMessage = authFailureMessage;
  let currentSawRateLimit = sawRateLimit;
  let currentSawTransientFailure = sawTransientFailure;
  let currentSawNetworkError = sawNetworkError;
  let currentUpstreamSpan = upstreamSpan;
  let authRetrySucceeded = false;
  let authRetryError = "received 401 from Anthropic";

  for (let authRetry = 0; authRetry < MAX_AUTH_RETRIES; authRetry++) {
    logger.always(
      `[proxy] ← 401 account=${account.label} refreshing (attempt ${authRetry + 1}/${MAX_AUTH_RETRIES})`,
    );
    const refreshSucceeded = await refreshToken(account);
    if (!refreshSucceeded.success) {
      authRetryError = `refresh failed for account=${account.label} attempt ${authRetry + 1}/${MAX_AUTH_RETRIES}: ${refreshSucceeded.error?.slice(0, 200) ?? "unknown"}`;
      currentLastError = authRetryError;
      if (isPermanentRefreshFailure(refreshSucceeded)) {
        await disableAccountUntilReauth(
          account,
          accountState,
          "refresh_invalid",
        );
        currentAuthFailureMessage = formatReauthMessage(account.label);
        logger.always(
          `[proxy] account=${account.label} refresh token rejected; disabled until re-authentication`,
        );
      } else {
        const coolingUntil = await coolAccountAfterTransientRefreshFailure(
          account,
          accountState,
        );
        currentSawTransientFailure = true;
        logger.always(
          `[proxy] account=${account.label} refresh temporarily unavailable (${refreshSucceeded.status ?? "network"}); cooling until ${new Date(coolingUntil).toISOString()} and rotating`,
        );
      }
      break;
    }

    if (account.persistTarget) {
      await persistTokens(account.persistTarget, account);
    }
    await clearAuthCooldownAfterRefresh(account, accountState);
    headers.authorization = `Bearer ${account.token}`;
    const retryAttemptNumber = allocateAttemptNumber();
    const retryAttemptStartedAt = Date.now();
    recordAttempt(account.label, account.type);
    const retryLogAttempt: AnthropicAttemptLogger = (
      status,
      errorType,
      errorMessage,
      extra,
    ) =>
      logAttempt(status, errorType, errorMessage, {
        ...extra,
        attempt: retryAttemptNumber,
        attemptDurationMs: Date.now() - retryAttemptStartedAt,
      });
    const retryBodyStr = buildUpstreamBody(account.token).bodyStr;
    const retryFetchStartMs = Date.now();
    logProxyBody({
      phase: "upstream_request",
      headers,
      body: retryBodyStr,
      bodySize: Buffer.byteLength(retryBodyStr, "utf8"),
      contentType: headers["content-type"] ?? "application/json",
      account: account.label,
      accountType: account.type,
      attempt: retryAttemptNumber,
    });

    try {
      const retryResp = await fetch(
        "https://api.anthropic.com/v1/messages?beta=true",
        {
          method: "POST",
          headers,
          body: retryBodyStr,
          signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
        },
      );
      if (retryResp.ok) {
        authRetrySucceeded = true;
        accountState.consecutiveRefreshFailures = 0;
        logger.always(
          `[proxy] ← 200 account=${account.label} (after ${authRetry + 1} refresh(es))`,
        );
        const successResponse = await handleAnthropicSuccessfulRetryResponse({
          ctx,
          body,
          account,
          accountState,
          retryResp,
          tracer,
          requestStartTime,
          fetchStartMs: retryFetchStartMs,
          attemptNumber: retryAttemptNumber,
          finalBodyStr: retryBodyStr,
          upstreamSpan: currentUpstreamSpan,
          logProxyBody,
          logFinalRequest,
        });
        return {
          response: successResponse,
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: undefined,
        };
      }

      const retryStatus = retryResp.status;
      const retryBody = await retryResp.text();
      // Capture full response headers and body for all auth-retry errors.
      // Redact sensitive headers and cap body size before persisting.
      const retryRespHeaders: Record<string, string> = {};
      retryResp.headers.forEach((value, key) => {
        retryRespHeaders[key] = value;
      });
      const safeRetryHeaders = { ...retryRespHeaders };
      delete safeRetryHeaders["authorization"];
      delete safeRetryHeaders["x-api-key"];
      const cappedRetryBody =
        retryBody.length > 4000
          ? retryBody.slice(0, 4000) + "...[truncated]"
          : retryBody;
      tracer?.logUpstreamResponseHeaders(safeRetryHeaders);
      tracer?.logUpstreamResponseBody(cappedRetryBody);
      logProxyBody({
        phase: "upstream_response",
        headers: safeRetryHeaders,
        body: cappedRetryBody,
        bodySize: Buffer.byteLength(retryBody, "utf8"),
        contentType: retryRespHeaders["content-type"] ?? "application/json",
        account: account.label,
        accountType: account.type,
        attempt: retryAttemptNumber,
        responseStatus: retryStatus,
        durationMs: Date.now() - retryFetchStartMs,
      });
      authRetryError = `retry ${authRetry + 1}/${MAX_AUTH_RETRIES} failed with status ${retryStatus}`;
      currentLastError = retryBody;
      logger.debug(
        `[proxy] retry ${authRetry + 1} failed: ${retryStatus} ${retryBody.substring(0, 120)}`,
      );

      if (
        retryStatus === 429 &&
        isAntiAbuseConstruction429(retryRespHeaders, retryBody)
      ) {
        logger.always(
          `[proxy] ← 429 account=${account.label} anti-abuse/construction rejection after OAuth refresh — returning non-retryable request error`,
        );
        retryLogAttempt(429, "construction_rejection", retryBody);
        tracer?.setError("construction_rejection", retryBody.slice(0, 500));
        currentUpstreamSpan?.end();
        return {
          response: finalizeAnthropicTerminalFetchError({
            terminalError: buildAnthropicConstructionRejectionTerminalError(),
            account,
            tracer,
            requestStartTime,
            attemptNumber: retryAttemptNumber,
            logProxyBody,
            logFinalRequest,
          }),
          continueLoop: false,
          lastError: retryBody,
          authFailureMessage: currentAuthFailureMessage,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: undefined,
        };
      }

      // Construction rejections return through the terminal 400 path above.
      // Every 429 reaching this branch is a genuine rate limit and must cool
      // the account according to its reset window before rotating.
      if (retryStatus === 429) {
        currentSawRateLimit = true;
        // Cool the account per its real reset window before rotating, so a
        // session/weekly-exhausted account isn't re-selected next request.
        const nowRetry = Date.now();
        const retryQuota429 = parseQuotaHeaders(retryRespHeaders);
        if (retryQuota429) {
          accountState.quota = retryQuota429;
        }
        const retryPlan = planCooldownFor429(
          retryQuota429,
          parseRetryAfterMs(retryRespHeaders["retry-after"] ?? null),
          nowRetry,
          getUnifiedRateLimitStatus(retryRespHeaders),
        );
        const rateLimitKind =
          retryPlan.reason === "transient" ? "transient" : "quota";
        recordAttemptError(
          account.label,
          account.type,
          retryStatus,
          rateLimitKind,
        );
        retryLogAttempt(429, "rate_limit_error", retryBody, {
          retryable: true,
          rateLimitKind,
          cooldownReason: retryPlan.reason,
        });
        if (
          !accountState.coolingUntil ||
          retryPlan.coolingUntil > accountState.coolingUntil
        ) {
          accountState.coolingUntil = retryPlan.coolingUntil;
          accountState.coolingReason = retryPlan.reason;
        }
        if (retryQuota429) {
          saveAccountQuota(account.label, retryQuota429).catch(() => {
            // Non-fatal: routing already has the in-memory snapshot.
          });
        }
        await saveAccountCooldown(
          account.key,
          accountState.coolingUntil ?? retryPlan.coolingUntil,
          accountState.coolingReason ?? retryPlan.reason,
        ).catch(() => {
          // Non-fatal: routing already has the in-memory cooldown.
        });
        advancePrimaryIfCurrent(
          account.key,
          enabledAccounts.length,
          orderedAccounts[0]?.key,
        );
        break;
      }

      if (retryStatus === 401 || retryStatus === 402 || retryStatus === 403) {
        recordAttemptError(account.label, account.type, retryStatus);
        retryLogAttempt(
          retryStatus,
          "authentication_error",
          summarizeErrorMessage(retryBody),
          { retryable: true },
        );
        if (authRetry < MAX_AUTH_RETRIES - 1) {
          await sleep(1000);
        }
        continue;
      }

      if (isTransientHttpFailure(retryStatus, retryBody)) {
        recordAttemptError(account.label, account.type, retryStatus);
        retryLogAttempt(
          retryStatus,
          "api_error",
          summarizeErrorMessage(retryBody),
          { retryable: true },
        );
        currentSawTransientFailure = true;
        break;
      }

      retryLogAttempt(
        retryStatus,
        "api_error",
        summarizeErrorMessage(retryBody),
      );
      recordFinalError(retryStatus, account.label, account.type);
      try {
        logFinalRequest(
          retryStatus,
          account.label,
          account.type,
          "api_error",
          summarizeErrorMessage(retryBody),
        );
        return {
          response: JSON.parse(retryBody),
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: currentUpstreamSpan,
        };
      } catch {
        logFinalRequest(
          retryStatus,
          account.label,
          account.type,
          "api_error",
          summarizeErrorMessage(retryBody),
        );
        return {
          response: buildClaudeError(retryStatus, retryBody),
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: currentUpstreamSpan,
        };
      }
    } catch (retryFetchErr) {
      currentSawNetworkError = true;
      recordAttemptError(account.label, account.type, 502);
      const message =
        retryFetchErr instanceof Error
          ? retryFetchErr.message
          : String(retryFetchErr);
      authRetryError = `network error on retry ${authRetry + 1}: ${message}`;
      currentLastError = authRetryError;
      retryLogAttempt(502, "network_error", message, {
        retryable: isRetryableNetworkError(retryFetchErr),
        errorCode: getErrorCode(retryFetchErr) ?? "unknown",
      });
      logger.debug(`[proxy] ${authRetryError}`);
      break;
    }
  }

  if (!authRetrySucceeded) {
    // No persistent cooldown — just move to next account for this request.
    currentLastError = authRetryError;
    logger.always(
      `[proxy] ⚠ account=${account.label} auth retries exhausted, rotating to next account`,
    );
    tracer?.setError("authentication_error", authRetryError);
    tracer?.recordRetry(account.label, "auth_exhausted");
    currentUpstreamSpan?.end();
    currentUpstreamSpan = undefined;
    advancePrimaryIfCurrent(
      account.key,
      enabledAccounts.length,
      orderedAccounts[0]?.key,
    );
  }

  return {
    continueLoop: true,
    lastError: currentLastError,
    authFailureMessage: currentAuthFailureMessage,
    sawRateLimit: currentSawRateLimit,
    sawTransientFailure: currentSawTransientFailure,
    sawNetworkError: currentSawNetworkError,
    upstreamSpan: currentUpstreamSpan,
  };
}

function buildAnthropicTerminalErrorResponse(args: {
  responseStatus: number;
  account: ProxyPassthroughAccount;
  errBody: string;
  errRespHeaders: Record<string, string>;
  requestStartTime: number;
  attemptNumber: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  errorType: "not_found_error" | "api_error" | "construction_rejection";
}): Response | unknown {
  const {
    responseStatus,
    account,
    errBody,
    errRespHeaders,
    requestStartTime,
    attemptNumber,
    logProxyBody,
    logFinalRequest,
    errorType,
  } = args;
  try {
    const parsedError = JSON.parse(errBody);
    logFinalRequest(
      responseStatus,
      account.label,
      account.type,
      errorType,
      summarizeErrorMessage(errBody),
    );
    logProxyBody({
      phase: "client_response",
      headers: {
        "content-type": errRespHeaders["content-type"] ?? "application/json",
      },
      body: errBody,
      bodySize: Buffer.byteLength(errBody, "utf8"),
      contentType: errRespHeaders["content-type"] ?? "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus,
      durationMs: Date.now() - requestStartTime,
    });
    return parsedError;
  } catch {
    logFinalRequest(
      responseStatus,
      account.label,
      account.type,
      errorType,
      summarizeErrorMessage(errBody),
    );
    const clientError = buildClaudeError(responseStatus, errBody);
    const clientErrorBody = JSON.stringify(clientError);
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: clientErrorBody,
      bodySize: Buffer.byteLength(clientErrorBody, "utf8"),
      contentType: "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus,
      durationMs: Date.now() - requestStartTime,
    });
    return clientError;
  }
}

function finalizeAnthropicTerminalFetchError(args: {
  terminalError: NonNullable<AnthropicUpstreamFetchResult["terminalError"]>;
  account: ProxyPassthroughAccount;
  tracer?: ProxyTracer;
  requestStartTime: number;
  attemptNumber: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: ClaudeFinalRequestLogger;
}): Response | unknown {
  const {
    terminalError,
    account,
    tracer,
    requestStartTime,
    attemptNumber,
    logProxyBody,
    logFinalRequest,
  } = args;
  recordFinalError(terminalError.status, account.label, account.type);
  tracer?.end(terminalError.status, Date.now() - requestStartTime);
  return buildAnthropicTerminalErrorResponse({
    responseStatus: terminalError.status,
    account,
    errBody: terminalError.body,
    errRespHeaders: terminalError.headers,
    requestStartTime,
    attemptNumber,
    logProxyBody,
    logFinalRequest,
    errorType: terminalError.errorType,
  });
}

async function handleAnthropicNonOkResponse(args: {
  response: Response;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  lastError: unknown;
  authFailureMessage: string | null;
  sawTransientFailure: boolean;
  invalidRequestFailure: {
    status: number;
    body: string;
    contentType?: string;
  } | null;
}): Promise<AnthropicNonOkResult> {
  const {
    response,
    account,
    accountState,
    enabledAccounts,
    orderedAccounts,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    logAttempt,
    logProxyBody,
    logFinalRequest,
    lastError,
    authFailureMessage,
    sawTransientFailure,
    invalidRequestFailure,
  } = args;
  let currentLastError = lastError;
  let currentAuthFailureMessage = authFailureMessage;
  let currentSawTransientFailure = sawTransientFailure;
  let currentInvalidRequestFailure = invalidRequestFailure;

  const errBody = await response.text();
  const errRespHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    errRespHeaders[key] = value;
  });
  tracer?.logUpstreamResponseHeaders(errRespHeaders);
  tracer?.logUpstreamResponseBody(errBody);
  logProxyBody({
    phase: "upstream_response",
    headers: errRespHeaders,
    body: errBody,
    bodySize: Buffer.byteLength(errBody, "utf8"),
    contentType: errRespHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: response.status,
    durationMs: Date.now() - fetchStartMs,
  });

  if (isInvalidRequestError(response.status, errBody)) {
    logger.always(
      `[proxy] ← ${response.status} upstream invalid_request_error`,
    );
    logAttempt(
      response.status,
      "invalid_request_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.setError("invalid_request_error", summarizeErrorMessage(errBody));
    currentInvalidRequestFailure = {
      status: response.status,
      body: errBody,
      contentType: errRespHeaders["content-type"],
    };
    currentLastError = summarizeErrorMessage(errBody);
    return {
      continueLoop: false,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (
    (response.status === 401 ||
      response.status === 402 ||
      response.status === 403) &&
    account.type === "oauth" &&
    !account.refreshToken
  ) {
    recordAttemptError(account.label, account.type, response.status);
    await disableAccountUntilReauth(
      account,
      accountState,
      "missing_refresh_token",
    );
    currentAuthFailureMessage = formatReauthMessage(account.label);
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} (auth failure, no refresh token)`,
    );
    currentLastError = errBody;
    logAttempt(
      response.status,
      "authentication_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.setError("authentication_error", summarizeErrorMessage(errBody));
    tracer?.recordRetry(account.label, "auth_no_refresh");
    advancePrimaryIfCurrent(
      account.key,
      enabledAccounts.length,
      orderedAccounts[0]?.key,
    );
    return {
      continueLoop: true,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (
    (response.status === 401 ||
      response.status === 402 ||
      response.status === 403) &&
    account.type === "api_key"
  ) {
    recordAttemptError(account.label, account.type, response.status);
    currentAuthFailureMessage =
      "Authentication failed for Anthropic API key credentials. Update ANTHROPIC_API_KEY or re-login with OAuth.";
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} (auth failure, api_key)`,
    );
    currentLastError = errBody;
    logAttempt(
      response.status,
      "authentication_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.setError("authentication_error", summarizeErrorMessage(errBody));
    tracer?.recordRetry(account.label, "auth_api_key");
    advancePrimaryIfCurrent(
      account.key,
      enabledAccounts.length,
      orderedAccounts[0]?.key,
    );
    return {
      continueLoop: true,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (response.status === 404) {
    recordFinalError(response.status, account.label, account.type);
    logger.always(`[proxy] ← 404 account=${account.label}`);
    logAttempt(404, "not_found_error", summarizeErrorMessage(errBody));
    tracer?.setError("not_found_error", summarizeErrorMessage(errBody));
    tracer?.end(404, Date.now() - requestStartTime);
    return {
      response: buildAnthropicTerminalErrorResponse({
        responseStatus: 404,
        account,
        errBody,
        errRespHeaders,
        requestStartTime,
        attemptNumber,
        logProxyBody,
        logFinalRequest,
        errorType: "not_found_error",
      }),
      continueLoop: false,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (isTransientHttpFailure(response.status, errBody)) {
    recordAttemptError(
      account.label,
      account.type,
      response.status,
      response.status === 429 ? "transient" : undefined,
    );
    currentSawTransientFailure = true;
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} (transient)`,
    );
    currentLastError = errBody;
    logAttempt(
      response.status,
      "api_error",
      summarizeErrorMessage(errBody),
      response.status === 429
        ? {
            retryable: true,
            rateLimitKind: "transient",
            cooldownReason: "transient",
          }
        : undefined,
    );
    tracer?.setError("transient_error", summarizeErrorMessage(errBody));
    tracer?.recordRetry(account.label, "transient");
    return {
      continueLoop: true,
      retrySameAccount: true,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  recordFinalError(response.status, account.label, account.type);
  logger.always(`[proxy] ← ${response.status} account=${account.label}`);
  logger.debug(`[claude-proxy] error body: ${errBody.substring(0, 200)}`);
  logAttempt(response.status, "api_error", summarizeErrorMessage(errBody));
  tracer?.setError("api_error", summarizeErrorMessage(errBody));
  tracer?.end(response.status, Date.now() - requestStartTime);
  return {
    response: buildAnthropicTerminalErrorResponse({
      responseStatus: response.status,
      account,
      errBody,
      errRespHeaders,
      requestStartTime,
      attemptNumber,
      logProxyBody,
      logFinalRequest,
      errorType: "api_error",
    }),
    continueLoop: false,
    lastError: currentLastError,
    authFailureMessage: currentAuthFailureMessage,
    sawTransientFailure: currentSawTransientFailure,
    invalidRequestFailure: currentInvalidRequestFailure,
    upstreamSpan: undefined,
  };
}

function createClaudeRequestRuntimeContext(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  clientRequestBody: string;
}): ClaudeRequestRuntimeContext {
  const { ctx, body, clientRequestBody } = args;
  let tracer: ProxyTracer | undefined;
  try {
    tracer = ProxyTracer.startRequest(
      {
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        model: body.model,
        stream: body.stream ?? false,
        toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
        toolNames: Array.isArray(body.tools)
          ? body.tools
              .map((t) =>
                t && typeof t === "object" && "name" in t
                  ? String((t as { name?: unknown }).name ?? "")
                  : "",
              )
              .filter((n): n is string => n.length > 0)
          : undefined,
        sessionId:
          ctx.headers["x-neurolink-session-id"] ??
          ctx.headers["x-claude-code-session-id"] ??
          undefined,
        userAgent: ctx.headers["user-agent"] ?? undefined,
      },
      ctx.headers,
    );
    const receiveSpan = tracer.startReceive();
    tracer.logRequestHeaders(ctx.headers);
    tracer.logRequestBody(clientRequestBody);
    receiveSpan.end();
  } catch {
    tracer = undefined;
  }

  const requestStartTime = Date.now();
  const logProxyBody: ProxyBodyCaptureLogger = (capture) => {
    const traceCtx = tracer?.getTraceContext();
    void logBodyCapture({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      model: body.model,
      stream: body.stream ?? false,
      ...capture,
      ...(traceCtx
        ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId }
        : {}),
    });
  };
  const logFinalRequest: ClaudeFinalRequestLogger = (
    status,
    accountLabel,
    accountType,
    errorType,
    errorMessage,
    extra,
  ) => {
    const traceCtx = tracer?.getTraceContext();
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: !!body.stream,
      toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
      account: accountLabel,
      accountType,
      responseStatus: status,
      responseTimeMs: Date.now() - requestStartTime,
      ...(errorType ? { errorType } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(extra?.inputTokens !== undefined
        ? { inputTokens: extra.inputTokens }
        : {}),
      ...(extra?.outputTokens !== undefined
        ? { outputTokens: extra.outputTokens }
        : {}),
      ...(extra?.cacheCreationTokens !== undefined
        ? { cacheCreationTokens: extra.cacheCreationTokens }
        : {}),
      ...(extra?.cacheReadTokens !== undefined
        ? { cacheReadTokens: extra.cacheReadTokens }
        : {}),
      ...(traceCtx
        ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId }
        : {}),
    });
  };
  const buildLoggedClaudeError: ClaudeLoggedErrorBuilder = (
    status,
    message,
    errorType,
    extra,
  ) => {
    const errorBody = buildClaudeError(status, message, errorType);
    const errorBodyText = JSON.stringify(errorBody);
    recordFinalError(status, extra?.account, extra?.accountType);
    logFinalRequest(
      status,
      extra?.account ?? "",
      extra?.accountType ?? "final",
      errorType,
      message,
    );
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: errorBodyText,
      bodySize: Buffer.byteLength(errorBodyText, "utf8"),
      contentType: "application/json",
      responseStatus: status,
      durationMs: Date.now() - requestStartTime,
      ...extra,
    });
    return errorBody;
  };

  logProxyBody({
    phase: "client_request",
    headers: ctx.headers,
    body: clientRequestBody,
    bodySize: Buffer.byteLength(clientRequestBody, "utf8"),
    contentType: ctx.headers["content-type"] ?? "application/json",
  });

  return {
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
    buildLoggedClaudeError,
  };
}

function createAnthropicAttemptLogger(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  toolCount: number;
  requestStart: number;
  tracer?: ProxyTracer;
  account: ProxyPassthroughAccount;
  attemptNumber: number;
}): AnthropicAttemptLogger {
  const { ctx, body, toolCount, requestStart, tracer, account, attemptNumber } =
    args;
  const attemptStartedAt = Date.now();
  return (status, errorType, errorMessage, extra) => {
    const attemptCompletedAt = Date.now();
    const traceCtx = tracer?.getTraceContext();
    logRequestAttempt({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      attempt: extra?.attempt ?? attemptNumber,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: !!body.stream,
      toolCount,
      account: account.label,
      accountType: account.type,
      responseStatus: status,
      responseTimeMs: attemptCompletedAt - requestStart,
      attemptDurationMs:
        extra?.attemptDurationMs ?? attemptCompletedAt - attemptStartedAt,
      ...(errorType ? { errorType } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(extra?.errorCode ? { errorCode: extra.errorCode } : {}),
      ...(extra?.inputTokens !== undefined
        ? { inputTokens: extra.inputTokens }
        : {}),
      ...(extra?.outputTokens !== undefined
        ? { outputTokens: extra.outputTokens }
        : {}),
      ...(extra?.cacheCreationTokens !== undefined
        ? { cacheCreationTokens: extra.cacheCreationTokens }
        : {}),
      ...(extra?.cacheReadTokens !== undefined
        ? { cacheReadTokens: extra.cacheReadTokens }
        : {}),
      ...(extra?.retryable !== undefined ? { retryable: extra.retryable } : {}),
      ...(extra?.rateLimitKind ? { rateLimitKind: extra.rateLimitKind } : {}),
      ...(extra?.cooldownReason
        ? { cooldownReason: extra.cooldownReason }
        : {}),
      ...(traceCtx
        ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId }
        : {}),
    });
  };
}

async function prepareAnthropicAccountAttempt(args: {
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  bodyStr: string;
  clientHeaders: Record<string, string | undefined>;
  isClaudeClientRequest: boolean;
  url: string;
  tracer?: ProxyTracer;
  attemptNumber: number;
  currentLastError: unknown;
  currentAuthFailureMessage: string | null;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<PreparedAnthropicAccountAttempt> {
  const {
    account,
    accountState,
    bodyStr,
    clientHeaders,
    isClaudeClientRequest,
    url,
    tracer,
    attemptNumber,
    currentLastError,
    currentAuthFailureMessage,
    logAttempt,
    logProxyBody,
  } = args;
  let lastError = currentLastError;
  let authFailureMessage = currentAuthFailureMessage;

  if (needsRefresh(account)) {
    const refreshed = await refreshToken(account);
    if (refreshed.success) {
      if (account.persistTarget) {
        await persistTokens(account.persistTarget, account);
      }
      await clearAuthCooldownAfterRefresh(account, accountState);
    } else {
      lastError = `token refresh failed for account=${account.label}: ${refreshed.error?.slice(0, 200) ?? "unknown"}`;
      if (isPermanentRefreshFailure(refreshed)) {
        await disableAccountUntilReauth(
          account,
          accountState,
          "refresh_invalid",
        );
        authFailureMessage = formatReauthMessage(account.label);
      } else {
        await coolAccountAfterTransientRefreshFailure(account, accountState);
      }
      logAttempt(
        isPermanentRefreshFailure(refreshed) ? 401 : 503,
        isPermanentRefreshFailure(refreshed)
          ? "authentication_error"
          : "token_refresh_unavailable",
        String(lastError),
      );
      return {
        continueLoop: true,
        lastError,
        authFailureMessage,
      };
    }
  }

  const isOAuth = account.type === "oauth";
  const filteredHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(clientHeaders)) {
    if (typeof v === "string") {
      filteredHeaders[k] = v;
    }
  }
  const snapshot = isOAuth
    ? await maybeRefreshClaudeSnapshot(
        account.label,
        account.key,
        filteredHeaders,
        bodyStr,
      )
    : null;
  const headers: Record<string, string> = {};
  for (const [headerKey, headerValue] of Object.entries(clientHeaders)) {
    const lower = headerKey.toLowerCase();
    if (
      typeof headerValue === "string" &&
      !BLOCKED_UPSTREAM_HEADERS.has(lower)
    ) {
      headers[lower] = headerValue;
    }
  }

  headers["content-type"] = "application/json";
  if (isOAuth) {
    headers.authorization = `Bearer ${account.token}`;
    delete headers["x-api-key"];
    applySnapshotHeaders(headers, snapshot);
  } else {
    headers["x-api-key"] = account.token;
    delete headers.authorization;
  }

  if (!headers["user-agent"]) {
    headers["user-agent"] = CLAUDE_CLI_USER_AGENT;
  }
  if (!headers["anthropic-version"]) {
    headers["anthropic-version"] = "2023-06-01";
  }
  if (!headers["anthropic-dangerous-direct-browser-access"]) {
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  if (!headers["x-app"]) {
    headers["x-app"] = "cli";
  }
  if (!headers.accept) {
    headers.accept = "application/json";
  }

  if (isOAuth) {
    const betaSeed = isClaudeClientRequest
      ? (headers["anthropic-beta"] ?? "")
      : (clientHeaders["anthropic-beta"] ?? "");
    const existing = new Set(
      betaSeed
        .split(",")
        .map((value: string) => value.trim())
        .filter(Boolean),
    );
    for (const beta of isClaudeClientRequest
      ? CLAUDE_CODE_OAUTH_BETAS
      : NON_CLAUDE_OAUTH_BETAS) {
      existing.add(beta);
    }
    headers["anthropic-beta"] = [...existing].join(",");
  } else {
    const cleaned = (headers["anthropic-beta"] ?? "")
      .split(",")
      .map((value: string) => value.trim())
      .filter(
        (value: string) =>
          value && !CLAUDE_CODE_OAUTH_BETAS.includes(value as never),
      )
      .join(",");
    if (cleaned) {
      headers["anthropic-beta"] = cleaned;
    } else {
      delete headers["anthropic-beta"];
    }
  }

  const buildUpstreamBody: AnthropicUpstreamBodyBuilder = (token) =>
    isOAuth
      ? polyfillOAuthBody(
          bodyStr,
          token,
          snapshot,
          isClaudeClientRequest,
          headers["x-claude-code-session-id"],
        )
      : { bodyStr };
  const polyfilledBody = buildUpstreamBody(account.token);
  if (
    isOAuth &&
    polyfilledBody.sessionId &&
    !headers["x-claude-code-session-id"]
  ) {
    headers["x-claude-code-session-id"] = polyfilledBody.sessionId;
  }
  const finalBodyStr = polyfilledBody.bodyStr;

  logger.always(`[proxy] → account=${account.label} (${account.type})`);
  recordAttempt(account.label, account.type);
  const fetchStartMs = Date.now();
  let upstreamSpan: import("@opentelemetry/api").Span | undefined;
  if (tracer) {
    upstreamSpan = tracer.startUpstreamAttempt({
      attempt: attemptNumber,
      account: account.label,
      polyfillHeaders: isOAuth,
      polyfillBody: isOAuth,
      upstreamUrl: url,
    });
    tracer.logUpstreamRequestHeaders(headers);
    tracer.logUpstreamRequestBody(finalBodyStr);
    Object.assign(headers, tracer.getTraceHeaders());
  }
  logProxyBody({
    phase: "upstream_request",
    headers,
    body: finalBodyStr,
    bodySize: Buffer.byteLength(finalBodyStr, "utf8"),
    contentType: headers["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
  });

  return {
    continueLoop: false,
    lastError,
    authFailureMessage,
    headers,
    buildUpstreamBody,
    finalBodyStr,
    fetchStartMs,
    upstreamSpan,
  };
}

/**
 * Detect Anthropic's anti-abuse / request-construction 429.
 *
 * The subscription/OAuth path rejects requests it does not recognise as genuine
 * Claude Code traffic with a 429 `rate_limit_error` whose message is literally
 * "Error" and which carries NONE of the real rate-limit headers (no retry-after,
 * no anthropic-ratelimit-*). This is NOT a capacity limit — retrying or rotating
 * accounts cannot fix it and only burns quota, so the caller must fail fast and
 * return a non-retryable request error instead of "all accounts rate-limited".
 */
function isAntiAbuseConstruction429(
  headers: Record<string, string>,
  body: string,
): boolean {
  const hasRetryAfter = !!headers["retry-after"];
  const hasRateLimitHeaders = Object.keys(headers).some((k) =>
    k.toLowerCase().startsWith("anthropic-ratelimit-"),
  );
  if (hasRetryAfter || hasRateLimitHeaders) {
    return false;
  }
  return (
    body.includes("rate_limit_error") && /"message"\s*:\s*"Error"/.test(body)
  );
}

function buildAnthropicConstructionRejectionTerminalError(): NonNullable<
  AnthropicUpstreamFetchResult["terminalError"]
> {
  return {
    status: 400,
    body: JSON.stringify(
      buildClaudeError(
        400,
        "Anthropic rejected the OAuth request shape. This is not an account rate limit.",
        "invalid_request_error",
      ),
    ),
    headers: { "content-type": "application/json" },
    errorType: "construction_rejection",
  };
}

async function fetchAnthropicAccountResponse(args: {
  url: string;
  headers: Record<string, string>;
  finalBodyStr: string;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  tracer?: ProxyTracer;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
  fetchStartMs: number;
  attemptNumber: number;
  currentLastError: unknown;
  currentSawRateLimit: boolean;
  currentSawNetworkError: boolean;
  upstreamSpan?: import("@opentelemetry/api").Span;
}): Promise<AnthropicUpstreamFetchResult> {
  const {
    url,
    headers,
    finalBodyStr,
    account,
    accountState: _accountState2,
    enabledAccounts: _enabledAccounts,
    orderedAccounts: _orderedAccounts,
    tracer,
    logAttempt,
    logProxyBody,
    fetchStartMs,
    attemptNumber,
    currentLastError,
    currentSawRateLimit,
    currentSawNetworkError,
    upstreamSpan,
  } = args;
  let lastError = currentLastError;
  let sawRateLimit = currentSawRateLimit;
  let sawNetworkError = currentSawNetworkError;
  const currentUpstreamSpan = upstreamSpan;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: finalBodyStr,
      signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
    });
  } catch (fetchErr) {
    const retryable = isRetryableNetworkError(fetchErr);
    // Every dispatched upstream request is an attempt, including terminal
    // transport failures. Record it once before preserving the throw behavior.
    sawNetworkError = true;
    recordAttemptError(account.label, account.type, 502);
    const errorCode = getErrorCode(fetchErr) ?? "unknown";
    const errorMessage =
      fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    lastError = errorMessage;
    logger.always(
      `[proxy] fetch error account=${account.label} code=${errorCode} (${retryable ? "retryable" : "terminal"}): ${errorMessage}`,
    );
    logAttempt(502, "network_error", errorMessage, {
      retryable,
      errorCode,
    });
    tracer?.setError("network_error", errorMessage);
    if (retryable) {
      tracer?.recordRetry(account.label, "network_error");
    }
    currentUpstreamSpan?.end();
    if (!retryable) {
      throw fetchErr;
    }
    return {
      continueLoop: true,
      retrySameAccount: true,
      lastError,
      sawRateLimit,
      sawNetworkError,
      upstreamSpan: undefined,
    };
  }

  if (response.status === 429) {
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    // Capture full response headers and body for diagnostics (parity with
    // handleAnthropicNonOkResponse which does this for all other error statuses).
    const errRespHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      errRespHeaders[key] = value;
    });
    lastError = await response.text();
    // Redact sensitive headers and cap body before persisting
    const safe429Headers = { ...errRespHeaders };
    delete safe429Headers["authorization"];
    delete safe429Headers["x-api-key"];
    const capped429Body =
      String(lastError).length > 4000
        ? String(lastError).slice(0, 4000) + "...[truncated]"
        : String(lastError);
    tracer?.logUpstreamResponseHeaders(safe429Headers);
    tracer?.logUpstreamResponseBody(capped429Body);
    logProxyBody({
      phase: "upstream_response",
      headers: safe429Headers,
      body: capped429Body,
      bodySize: Buffer.byteLength(String(lastError), "utf8"),
      contentType: errRespHeaders["content-type"] ?? "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus: 429,
      durationMs: Date.now() - fetchStartMs,
    });
    // Anti-abuse / request-construction 429 (no rate-limit headers, body
    // "Error"): rotating accounts cannot help and only burns quota. Fail fast
    // and return a non-retryable request error instead of prompting the client
    // to repeat the same malformed request as a genuine rate limit.
    if (isAntiAbuseConstruction429(errRespHeaders, String(lastError))) {
      logger.always(
        `[proxy] ← 429 account=${account.label} anti-abuse/construction rejection (no ratelimit headers, body="Error") — NOT a real rate limit; returning non-retryable request error`,
      );
      logAttempt(429, "construction_rejection", String(lastError));
      tracer?.setError(
        "construction_rejection",
        String(lastError).slice(0, 500),
      );
      currentUpstreamSpan?.end();
      return {
        continueLoop: false,
        terminalError: buildAnthropicConstructionRejectionTerminalError(),
        lastError,
        sawRateLimit,
        sawNetworkError,
        upstreamSpan: undefined,
      };
    }
    sawRateLimit = true;
    // Parse the unified-window quota headers (present on real rate-limit 429s)
    // and derive a reset-aware cooldown plan. This is the fix for "kept
    // hammering the 5h/7d-exhausted account instead of switching": on an
    // exhaustion 429 we rotate immediately and park the account until its
    // ACTUAL reset, not a 60s hardcap.
    const now = Date.now();
    const quota = parseQuotaHeaders(errRespHeaders);
    const unifiedStatus = getUnifiedRateLimitStatus(errRespHeaders);
    const cooldownPlan = planCooldownFor429(
      quota,
      retryAfterMs,
      now,
      unifiedStatus,
    );
    const rateLimitKind =
      cooldownPlan.reason === "transient" ? "transient" : "quota";
    recordAttemptError(account.label, account.type, 429, rateLimitKind);
    logger.always(
      `[proxy] ← 429 account=${account.label} reason=${cooldownPlan.reason} ` +
        `retry-after=${retryAfterMs}ms 5h-status=${errRespHeaders["anthropic-ratelimit-unified-5h-status"] ?? "unknown"} ` +
        `7d-status=${errRespHeaders["anthropic-ratelimit-unified-7d-status"] ?? "unknown"} ` +
        `unified-status=${unifiedStatus ?? "unknown"} ` +
        `→ ${cooldownPlan.rotateImmediately ? `rotate now, cool ${minutesUntil(cooldownPlan.coolingUntil, now)}m` : "retry same account (transient)"}`,
    );
    logAttempt(429, "rate_limit_error", String(lastError), {
      retryable: true,
      rateLimitKind,
      cooldownReason: cooldownPlan.reason,
    });
    tracer?.setError("rate_limit_error", String(lastError).slice(0, 500));
    tracer?.recordRetry(account.label, "rate_limit");
    currentUpstreamSpan?.end();
    return {
      continueLoop: true,
      retrySameAccount: !cooldownPlan.rotateImmediately,
      retryAfterMs,
      cooldownPlan,
      ...(quota ? { quota } : {}),
      lastError,
      sawRateLimit,
      sawNetworkError,
      upstreamSpan: undefined,
    };
  }

  return {
    continueLoop: false,
    response,
    lastError,
    sawRateLimit,
    sawNetworkError,
    upstreamSpan: currentUpstreamSpan,
  };
}

function shouldAttemptClaudeFallback(loopState: AnthropicLoopState): boolean {
  return loopState.invalidRequestFailure === null;
}

async function handleAnthropicRoutedClaudeRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  modelRouter?: ModelRouterInterface;
  tracer?: ProxyTracer;
  requestStartTime: number;
  accountStrategy: "round-robin" | "fill-first";
  primaryAccountKey?: string;
  accountAllowlist?: AccountAllowlist;
  quotaRoutingEnabled?: boolean;
  sessionSoftLimit?: number;
  sessionResetToleranceMs?: number;
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: ClaudeFinalRequestLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    modelRouter,
    tracer,
    requestStartTime,
    accountStrategy,
    primaryAccountKey,
    accountAllowlist,
    quotaRoutingEnabled = isQuotaRoutingEnabled(),
    sessionSoftLimit = getSessionSoftLimit(),
    sessionResetToleranceMs = getSessionResetToleranceMs(),
    buildLoggedClaudeError,
    logProxyBody,
    logFinalRequest,
  } = args;
  const parsedRequest = parseClaudeRequest(body);
  const loadedAccounts = await loadClaudeProxyAccounts({
    ctx,
    body,
    tracer,
    requestStartTime,
    accountStrategy,
    primaryAccountKey,
    accountAllowlist,
    quotaRoutingEnabled,
    sessionSoftLimit,
    sessionResetToleranceMs,
    buildLoggedClaudeError,
  });
  if ("response" in loadedAccounts) {
    return loadedAccounts.response;
  }

  const {
    accounts,
    enabledAccounts,
    orderedAccounts,
    bodyStr,
    requestStart,
    toolCount,
    url,
    clientHeaders,
    isClaudeClientRequest,
  } = loadedAccounts;
  const loopState: AnthropicLoopState = {
    lastError: undefined,
    sawRateLimit: false,
    sawNetworkError: false,
    sawTransientFailure: false,
    invalidRequestFailure: null,
    authFailureMessage: null,
    authCooldownMessage: null,
    attemptNumber: 0,
  };
  const acctSelectionSpan = tracer?.startAccountSelection();

  // Never re-hammer accounts with a known active cooldown. When every account
  // is cooling, report the earliest persisted retry time without an upstream
  // call; restarting the proxy must not erase or bypass this quarantine.
  const nonCoolingAccounts = orderedAccounts.filter(
    (a) => !isAccountCooling(a.key),
  );
  let effectiveAccounts = nonCoolingAccounts;

  // If every usable account is cooling and the soonest recovery is a short
  // transient burst cooldown, hold this request and pace its admission instead
  // of returning a proxy-local 429 that makes the client retry in a herd. The
  // helper rechecks because an in-flight retry can extend the cooldown while
  // this request is waiting.
  if (effectiveAccounts.length === 0) {
    effectiveAccounts =
      await waitForTransientAccountAvailability(orderedAccounts);
  }
  if (effectiveAccounts.length === 0 && orderedAccounts.length > 0) {
    const coolingStates = orderedAccounts.map((account) =>
      getOrCreateRuntimeState(account.key),
    );
    const hasRateLimitCooldown = coolingStates.some(
      (state) => state.coolingReason !== "auth",
    );
    loopState.sawRateLimit = hasRateLimitCooldown;
    loopState.sawTransientFailure = !hasRateLimitCooldown;
    loopState.lastError = hasRateLimitCooldown
      ? "All Anthropic accounts have active rate-limit cooldowns"
      : "All Anthropic accounts have active authentication cooldowns";
    if (!hasRateLimitCooldown) {
      const earliestRetryAt = Math.min(
        ...coolingStates.map(
          (state) => state.coolingUntil ?? Number.POSITIVE_INFINITY,
        ),
      );
      loopState.authCooldownMessage = `All ${orderedAccounts.length} Anthropic accounts are temporarily unavailable while OAuth refresh is cooling. Earliest retry at ${new Date(earliestRetryAt).toISOString()}.`;
    }
  }

  accountLoop: for (const account of effectiveAccounts) {
    const accountState = getOrCreateRuntimeState(account.key);
    let transientSameAccountRetries = 0;
    let rateLimitSameAccountRetries = 0;

    while (true) {
      loopState.attemptNumber += 1;
      if (tracer && loopState.attemptNumber === 1 && acctSelectionSpan) {
        tracer.setAccountSelection({
          strategy: accountStrategy,
          accountsTotal: accounts.length,
          accountsHealthy: enabledAccounts.length,
          selectedAccount: account.label,
          accountType: account.type,
        });
        acctSelectionSpan.end();
      }

      const logAttempt = createAnthropicAttemptLogger({
        ctx,
        body,
        toolCount,
        requestStart,
        tracer,
        account,
        attemptNumber: loopState.attemptNumber,
      });
      const preparedAttempt = await prepareAnthropicAccountAttempt({
        account,
        accountState,
        bodyStr,
        clientHeaders,
        isClaudeClientRequest,
        url,
        tracer,
        attemptNumber: loopState.attemptNumber,
        currentLastError: loopState.lastError,
        currentAuthFailureMessage: loopState.authFailureMessage,
        logAttempt,
        logProxyBody,
      });
      loopState.lastError = preparedAttempt.lastError;
      loopState.authFailureMessage = preparedAttempt.authFailureMessage;
      if (
        preparedAttempt.continueLoop ||
        !preparedAttempt.headers ||
        !preparedAttempt.buildUpstreamBody ||
        !preparedAttempt.finalBodyStr ||
        preparedAttempt.fetchStartMs === undefined
      ) {
        continue accountLoop;
      }

      const fetchResult = await fetchAnthropicAccountResponse({
        url,
        headers: preparedAttempt.headers,
        finalBodyStr: preparedAttempt.finalBodyStr,
        account,
        accountState,
        enabledAccounts,
        orderedAccounts,
        tracer,
        logAttempt,
        logProxyBody,
        fetchStartMs: preparedAttempt.fetchStartMs,
        attemptNumber: loopState.attemptNumber,
        currentLastError: loopState.lastError,
        currentSawRateLimit: loopState.sawRateLimit,
        currentSawNetworkError: loopState.sawNetworkError,
        upstreamSpan: preparedAttempt.upstreamSpan,
      });
      loopState.lastError = fetchResult.lastError;
      loopState.sawRateLimit = fetchResult.sawRateLimit;
      loopState.sawNetworkError = fetchResult.sawNetworkError;
      if (fetchResult.terminalError) {
        return finalizeAnthropicTerminalFetchError({
          terminalError: fetchResult.terminalError,
          account,
          tracer,
          requestStartTime,
          attemptNumber: loopState.attemptNumber,
          logProxyBody,
          logFinalRequest,
        });
      }
      if (fetchResult.continueLoop || !fetchResult.response) {
        // Genuine 429 (carries a cooldown plan derived from quota headers).
        if (fetchResult.cooldownPlan) {
          const plan = fetchResult.cooldownPlan;
          // Refresh the account's quota snapshot for proactive selection.
          if (fetchResult.quota) {
            accountState.quota = fetchResult.quota;
            saveAccountQuota(account.label, fetchResult.quota).catch(() => {
              // Non-fatal: routing already has the in-memory snapshot.
            });
          }
          // Publish the cooldown before retrying so requests arriving behind
          // this one skip the throttled account instead of joining the burst.
          let cooldownExtended = false;
          if (
            !accountState.coolingUntil ||
            plan.coolingUntil > accountState.coolingUntil
          ) {
            accountState.coolingUntil = plan.coolingUntil;
            accountState.coolingReason = plan.reason;
            cooldownExtended = true;
          }
          if (cooldownExtended) {
            await saveAccountCooldown(
              account.key,
              accountState.coolingUntil,
              accountState.coolingReason ?? plan.reason,
            ).catch(() => {
              // Non-fatal: routing already has the in-memory cooldown.
            });
          }

          // Transient retries are budgeted across all concurrent requests for
          // this account/window. Exhaustion plans rotate immediately and never
          // claim this budget.
          const sharedRetrySlot = fetchResult.retrySameAccount
            ? claimTransientRateLimitRetry(account.key, plan.coolingUntil)
            : undefined;
          if (
            fetchResult.retrySameAccount &&
            fetchResult.retryAfterMs !== undefined &&
            rateLimitSameAccountRetries < MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES &&
            sharedRetrySlot !== undefined
          ) {
            rateLimitSameAccountRetries += 1;
            const base = Math.min(
              fetchResult.retryAfterMs || 1_000,
              MAX_RATE_LIMIT_RETRY_DELAY_MS,
            );
            // Stagger the two shared slots, then cap after jitter so the final
            // sleep never exceeds the configured maximum.
            const delayMs = Math.min(
              MAX_RATE_LIMIT_RETRY_DELAY_MS,
              jitteredDelay(base * sharedRetrySlot),
            );
            logger.always(
              `[proxy] retrying same account=${account.label} after transient 429 (shared slot ${sharedRetrySlot}/${MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES}) in ${delayMs}ms`,
            );
            await sleep(delayMs);
            continue;
          }
          // Exhaustion, or the shared transient retry budget being used up:
          // rotate while the already-published cooldown remains active.
          advancePrimaryIfCurrent(
            account.key,
            enabledAccounts.length,
            orderedAccounts[0]?.key,
          );
          logger.always(
            `[proxy] account=${account.label} rate-limited (${plan.reason}); cooling ~${minutesUntil(plan.coolingUntil, Date.now())}m until ${new Date(plan.coolingUntil).toISOString()}, rotating`,
          );
          continue accountLoop;
        }
        // Transient error retry (network errors, 529 overloaded)
        if (
          fetchResult.retrySameAccount &&
          transientSameAccountRetries < MAX_TRANSIENT_SAME_ACCOUNT_RETRIES
        ) {
          transientSameAccountRetries += 1;
          const delayMs = getTransientSameAccountRetryDelayMs(
            transientSameAccountRetries,
          );
          logger.always(
            `[proxy] retrying same account=${account.label} after transient network error (${transientSameAccountRetries}/${MAX_TRANSIENT_SAME_ACCOUNT_RETRIES}) in ${delayMs}ms`,
          );
          await sleep(delayMs);
          continue;
        }
        if (fetchResult.retrySameAccount) {
          logger.always(
            `[proxy] exhausted transient same-account retries for account=${account.label}; rotating`,
          );
        }
        continue accountLoop;
      }

      let upstreamSpan = fetchResult.upstreamSpan;
      const response = fetchResult.response;
      if (
        response.status === 401 &&
        account.type === "oauth" &&
        account.refreshToken
      ) {
        const authRetryResult = await handleAnthropicAuthRetry({
          ctx,
          body,
          account,
          accountState,
          headers: preparedAttempt.headers,
          buildUpstreamBody: preparedAttempt.buildUpstreamBody,
          enabledAccounts,
          orderedAccounts,
          tracer,
          requestStartTime,
          allocateAttemptNumber: () => {
            loopState.attemptNumber += 1;
            return loopState.attemptNumber;
          },
          upstreamSpan,
          logAttempt,
          logProxyBody,
          logFinalRequest,
          lastError: loopState.lastError,
          authFailureMessage: loopState.authFailureMessage,
          sawRateLimit: loopState.sawRateLimit,
          sawTransientFailure: loopState.sawTransientFailure,
          sawNetworkError: loopState.sawNetworkError,
        });
        loopState.lastError = authRetryResult.lastError;
        loopState.authFailureMessage = authRetryResult.authFailureMessage;
        loopState.sawRateLimit = authRetryResult.sawRateLimit;
        loopState.sawTransientFailure = authRetryResult.sawTransientFailure;
        loopState.sawNetworkError = authRetryResult.sawNetworkError;
        upstreamSpan = authRetryResult.upstreamSpan;
        if (authRetryResult.response !== undefined) {
          return authRetryResult.response;
        }
        if (authRetryResult.continueLoop) {
          continue accountLoop;
        }
      }

      if (!response.ok) {
        const nonOkResult = await handleAnthropicNonOkResponse({
          response,
          account,
          accountState,
          enabledAccounts,
          orderedAccounts,
          tracer,
          requestStartTime,
          fetchStartMs: preparedAttempt.fetchStartMs,
          attemptNumber: loopState.attemptNumber,
          logAttempt,
          logProxyBody,
          logFinalRequest,
          lastError: loopState.lastError,
          authFailureMessage: loopState.authFailureMessage,
          sawTransientFailure: loopState.sawTransientFailure,
          invalidRequestFailure: loopState.invalidRequestFailure,
        });
        loopState.lastError = nonOkResult.lastError;
        loopState.authFailureMessage = nonOkResult.authFailureMessage;
        loopState.sawTransientFailure = nonOkResult.sawTransientFailure;
        loopState.invalidRequestFailure = nonOkResult.invalidRequestFailure;
        if (nonOkResult.response !== undefined) {
          return nonOkResult.response;
        }
        if (nonOkResult.continueLoop) {
          if (
            nonOkResult.retrySameAccount &&
            transientSameAccountRetries < MAX_TRANSIENT_SAME_ACCOUNT_RETRIES
          ) {
            transientSameAccountRetries += 1;
            const delayMs = getTransientSameAccountRetryDelayMs(
              transientSameAccountRetries,
            );
            logger.always(
              `[proxy] retrying same account=${account.label} after transient upstream ${response.status} (${transientSameAccountRetries}/${MAX_TRANSIENT_SAME_ACCOUNT_RETRIES}) in ${delayMs}ms`,
            );
            await sleep(delayMs);
            continue;
          }
          if (nonOkResult.retrySameAccount) {
            logger.always(
              `[proxy] exhausted transient same-account retries for account=${account.label}; rotating`,
            );
          }
          continue accountLoop;
        }
        break accountLoop;
      }

      // Clear cooling on success — but only if the stored cooldown has already
      // expired, so an older in-flight success can't wipe an active exhaustion
      // cooldown just set by a concurrent 429. The success handler re-applies a
      // cooldown via maybeCoolFromQuota if the fresh quota headers report the
      // window flipped to "rejected" on this very request.
      if (
        accountState.coolingUntil &&
        Date.now() >= accountState.coolingUntil
      ) {
        const expiredCooldown = accountState.coolingUntil;
        accountState.coolingUntil = undefined;
        accountState.coolingReason = undefined;
        clearAccountCooldown(account.key, expiredCooldown).catch(() => {
          // Best-effort cleanup; expired entries are ignored during seeding.
        });
      }

      const successResult = await handleAnthropicSuccessfulResponse({
        ctx,
        body,
        account,
        accountState,
        response,
        tracer,
        requestStartTime,
        fetchStartMs: preparedAttempt.fetchStartMs,
        attemptNumber: loopState.attemptNumber,
        finalBodyStr: preparedAttempt.finalBodyStr,
        upstreamSpan,
        logAttempt,
        logProxyBody,
        logFinalRequest,
      });
      if ("retryNextAccount" in successResult) {
        if (successResult.failure) {
          loopState.lastError = successResult.failure.message;
          loopState.sawRateLimit ||= successResult.failure.rateLimit;
          loopState.sawTransientFailure ||= !successResult.failure.rateLimit;
        }
        continue accountLoop;
      }
      return successResult.response;
    }
  }

  if (loopState.attemptNumber === 0) {
    acctSelectionSpan?.end();
  }

  // Deterministic invalid requests (for example, prompt-too-long) cannot be
  // repaired by changing providers. Preserve the authoritative Anthropic 400
  // rather than delaying it or returning unrelated fallback output.
  if (shouldAttemptClaudeFallback(loopState)) {
    let fallbackFailureMessage: string | undefined;
    const configuredFallbackResult = await tryConfiguredClaudeFallbackChain({
      ctx,
      body,
      parsedFallbackRequest: parsedRequest,
      modelRouter,
      tracer,
      requestStartTime,
      logProxyBody,
      logFinalRequest,
    });
    if (configuredFallbackResult.response) {
      return configuredFallbackResult.response;
    }
    fallbackFailureMessage = configuredFallbackResult.lastErrorMessage;

    // Try auto-provider fallback when the configured chain didn't produce a
    // response (either no chain configured, or all entries failed/deduped).
    if (!loopState.sawRateLimit) {
      const autoFallbackResult = await tryAutoClaudeFallback({
        ctx,
        body,
        tracer,
        requestStartTime,
        logProxyBody,
        logFinalRequest,
      });
      if (autoFallbackResult.response) {
        return autoFallbackResult.response;
      }
      fallbackFailureMessage =
        autoFallbackResult.lastErrorMessage ?? fallbackFailureMessage;
    }

    loopState.fallbackFailureMessage = fallbackFailureMessage;
  }

  return buildClaudeAnthropicFailureResponse({
    tracer,
    requestStartTime,
    authFailureMessage: loopState.authFailureMessage,
    authCooldownMessage: loopState.authCooldownMessage,
    invalidRequestFailure: loopState.invalidRequestFailure,
    sawNetworkError: loopState.sawNetworkError,
    sawTransientFailure: loopState.sawTransientFailure,
    sawRateLimit: loopState.sawRateLimit,
    lastError: loopState.lastError,
    fallbackFailureMessage: loopState.fallbackFailureMessage,
    orderedAccounts,
    buildLoggedClaudeError,
    logProxyBody,
    logFinalRequest,
  });
}

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

function isClaudeProxyRouteRuntimeOptions(
  value: AccountAllowlist | ClaudeProxyRouteRuntimeOptions | undefined,
): value is ClaudeProxyRouteRuntimeOptions {
  return (
    value !== undefined &&
    "runtimeConfigProvider" in value &&
    typeof value.runtimeConfigProvider === "function"
  );
}

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
  modelRouter?: ModelRouterInterface,
  basePath: string = "",
  accountStrategy: "round-robin" | "fill-first" = "fill-first",
  passthroughMode: boolean = false,
  primaryAccountKey?: string,
  accountAllowlistOrRuntimeOptions?:
    | AccountAllowlist
    | ClaudeProxyRouteRuntimeOptions,
): RouteGroup {
  const accountAllowlist = isClaudeProxyRouteRuntimeOptions(
    accountAllowlistOrRuntimeOptions,
  )
    ? accountAllowlistOrRuntimeOptions.accountAllowlist
    : accountAllowlistOrRuntimeOptions;
  const runtimeConfigProvider = isClaudeProxyRouteRuntimeOptions(
    accountAllowlistOrRuntimeOptions,
  )
    ? accountAllowlistOrRuntimeOptions.runtimeConfigProvider
    : undefined;
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
          const requestRouting = runtimeConfigProvider?.() ?? {
            generation: 0,
            strategy: accountStrategy,
            modelRouter,
            passthrough: passthroughMode,
            primaryAccountKey,
            accountAllowlist,
            quotaRoutingEnabled: isQuotaRoutingEnabled(),
            sessionSoftLimit: getSessionSoftLimit(),
            sessionResetToleranceMs: getSessionResetToleranceMs(),
          };
          const requestModelRouter = requestRouting.modelRouter;
          const body = ctx.body as ClaudeRequest | undefined;

          // 1. Validate
          if (
            typeof body?.model !== "string" ||
            !Array.isArray(body?.messages)
          ) {
            return buildClaudeError(
              400,
              "Missing required fields: model, messages",
            );
          }

          // 2. Resolve model via router (or pass through to anthropic)
          // Guard: without a model router, only Claude models are allowed.
          const modelLower = body.model.toLowerCase();
          if (!requestModelRouter && !modelLower.startsWith("claude-")) {
            return buildClaudeError(
              404,
              `Model '${body.model}' is not an Anthropic model. ` +
                `The proxy only supports Claude models. ` +
                `Use a model router to route non-Claude models to other providers.`,
            );
          }

          const route = requestModelRouter?.resolve(body.model) ?? {
            provider: "anthropic",
            model: body.model,
          };
          const clientRequestBody = JSON.stringify(body);

          // 3. Create request runtime context (tracer, loggers, error builder)
          const {
            tracer,
            requestStartTime,
            logProxyBody,
            logFinalRequest,
            buildLoggedClaudeError,
          } = createClaudeRequestRuntimeContext({
            ctx,
            body,
            clientRequestBody,
          });

          try {
            // 4. Route based on target provider
            if (route.provider === null) {
              tracer?.setError(
                "not_found_error",
                `Model '${body.model}' is not a Claude model.`,
              );
              tracer?.end(404, Date.now() - requestStartTime);
              return buildLoggedClaudeError(
                404,
                `Model '${body.model}' is not a Claude model. Use a model router to route it to another provider.`,
              );
            }

            if (route.provider === "anthropic") {
              tracer?.setMode("passthrough");

              if (requestRouting.passthrough) {
                return handleClaudePassthroughRequest({
                  ctx,
                  body,
                  clientRequestBody,
                  tracer,
                  requestStartTime,
                  logProxyBody,
                });
              }

              return handleAnthropicRoutedClaudeRequest({
                ctx,
                body,
                modelRouter: requestModelRouter,
                tracer,
                requestStartTime,
                accountStrategy: requestRouting.strategy,
                primaryAccountKey: requestRouting.primaryAccountKey,
                accountAllowlist: requestRouting.accountAllowlist,
                quotaRoutingEnabled: requestRouting.quotaRoutingEnabled,
                sessionSoftLimit: requestRouting.sessionSoftLimit,
                sessionResetToleranceMs: requestRouting.sessionResetToleranceMs,
                buildLoggedClaudeError,
                logProxyBody,
                logFinalRequest,
              });
            } else {
              return handleTranslatedClaudeRequest({
                ctx,
                body,
                route: {
                  provider: route.provider,
                  model: route.model,
                },
                modelRouter: requestModelRouter,
                tracer,
                requestStartTime,
                logProxyBody,
              });
            }
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            logger.error(
              `[claude-proxy] Generation error for ${body.model}: ${errMsg}`,
            );
            tracer?.setError("generation_error", errMsg.slice(0, 500));
            tracer?.end(502, Date.now() - requestStartTime);
            return buildLoggedClaudeError(
              502,
              `Generation failed: ${error instanceof Error ? error.message : "unknown error"}`,
            );
          }
        },
        description:
          "Claude-compatible messages endpoint routed through NeuroLink",
        tags: ["claude-proxy", "messages"],
        streaming: { enabled: true, contentType: "text/event-stream" },
      },

      // =====================================================================
      // GET /v1/models -- List available models (Anthropic schema)
      //
      // Returns the Anthropic-shaped list response (`type`, `display_name`,
      // `created_at`, `first_id`, `last_id`, `has_more`) so Anthropic SDK
      // consumers calling this Claude-compatible surface get the schema they
      // expect. The OpenAI route serves the same data in OpenAI list format
      // via its own builder.
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/v1/models`,
        handler: async (_ctx: ServerContext) => {
          const requestModelRouter = runtimeConfigProvider
            ? runtimeConfigProvider().modelRouter
            : modelRouter;
          return withSpan(
            {
              name: "neurolink.http.claudeProxy.listModels",
              tracer: tracers.http,
              attributes: { "http.route": `${basePath}/v1/models` },
            },
            async () => buildAnthropicModelsListResponse(requestModelRouter),
          );
        },
        description: "List available models (Anthropic schema)",
        tags: ["claude-proxy", "models"],
      },

      // =====================================================================
      // POST /v1/messages/count_tokens -- Token counting endpoint
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/v1/messages/count_tokens`,
        handler: async (ctx: ServerContext) =>
          withSpan(
            {
              name: "neurolink.http.claudeProxy.countTokens",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/v1/messages/count_tokens`,
              },
            },
            async (span) => {
              const body = ctx.body as
                | { model?: string; messages?: Array<{ content: unknown }> }
                | undefined;

              if (
                typeof body?.model !== "string" ||
                !Array.isArray(body?.messages)
              ) {
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

              const inputTokens = Math.ceil(text.length / 4);
              span.setAttribute("ai.model", body.model);
              span.setAttribute("gen_ai.usage.input_tokens", inputTokens);
              return { input_tokens: inputTokens };
            },
          ),
        description: "Count tokens for a messages request",
        tags: ["claude-proxy", "tokens"],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateRuntimeState(accountKey: string): RuntimeAccountState {
  const existing = accountRuntimeState.get(accountKey);
  if (existing) {
    return existing;
  }
  const initial: RuntimeAccountState = {
    consecutiveRefreshFailures: 0,
    permanentlyDisabled: false,
  };
  accountRuntimeState.set(accountKey, initial);
  return initial;
}

async function disableAccountUntilReauth(
  account: ProxyPassthroughAccount,
  state: RuntimeAccountState,
  reason: "missing_refresh_token" | "refresh_invalid",
): Promise<void> {
  state.permanentlyDisabled = true;

  // Decision 7 (usage): Persist disabled state to disk so it survives restarts
  try {
    const { tokenStore } = await import("../../auth/tokenStore.js");
    await tokenStore.markDisabled(account.key, reason);
  } catch (e) {
    logger.debug(
      `[proxy] failed to persist disabled state for ${account.label}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  logger.always(
    `[proxy] account=${account.label} disabled until re-authentication. Run: neurolink auth login anthropic --method oauth`,
  );
}

async function coolAccountAfterTransientRefreshFailure(
  account: Pick<ProxyPassthroughAccount, "key" | "label">,
  state: RuntimeAccountState,
): Promise<number> {
  state.consecutiveRefreshFailures += 1;
  const exponent = Math.min(state.consecutiveRefreshFailures - 1, 4);
  const delayMs = Math.min(
    AUTH_REFRESH_MAX_COOLDOWN_MS,
    AUTH_REFRESH_BASE_COOLDOWN_MS * 2 ** exponent,
  );
  const coolingUntil = Date.now() + delayMs;
  if (!state.coolingUntil || coolingUntil > state.coolingUntil) {
    state.coolingUntil = coolingUntil;
    state.coolingReason = "auth";
  }
  const effectiveCoolingUntil = state.coolingUntil ?? coolingUntil;
  const effectiveReason = state.coolingReason ?? "auth";
  state.coolingUntil = effectiveCoolingUntil;
  state.coolingReason = effectiveReason;
  await saveAccountCooldown(
    account.key,
    effectiveCoolingUntil,
    effectiveReason,
  ).catch(() => {
    // Non-fatal: the in-memory cooldown still prevents immediate re-hammering.
  });
  return effectiveCoolingUntil;
}

async function clearAuthCooldownAfterRefresh(
  account: Pick<ProxyPassthroughAccount, "key">,
  state: RuntimeAccountState,
): Promise<void> {
  state.consecutiveRefreshFailures = 0;
  if (state.coolingReason !== "auth" || !state.coolingUntil) {
    return;
  }
  const previousCoolingUntil = state.coolingUntil;
  state.coolingUntil = undefined;
  state.coolingReason = undefined;
  await clearAccountCooldown(account.key, previousCoolingUntil).catch(() => {
    // Best-effort cleanup; an expired auth cooldown is harmless on next boot.
  });
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

export function getTransientSameAccountRetryDelayMs(
  retryNumber: number,
): number {
  const index = Math.min(
    Math.max(retryNumber - 1, 0),
    TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS.length - 1,
  );
  return TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS[index] ?? 0;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Honor `base` (e.g. retry-after) as a floor and add positive jitter on top,
 *  so a fleet of concurrent requests (parallel subagents) doesn't wake and
 *  retry in the same millisecond and re-trip the limit together. */
function jitteredDelay(base: number): number {
  return base + Math.floor(Math.random() * base * 0.25);
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

function describeTransportError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!error || typeof error !== "object") {
    return message;
  }
  const cause = (error as { cause?: unknown }).cause;
  const causeMessage =
    cause instanceof Error
      ? cause.message
      : cause && typeof cause === "object"
        ? String((cause as { message?: unknown }).message ?? "")
        : "";
  const code = getErrorCode(error);
  const detail = [
    code,
    causeMessage && causeMessage !== message && causeMessage,
  ]
    .filter(Boolean)
    .join(": ");
  return detail ? `${message} (${detail})` : message;
}

/**
 * Determine whether a thrown fetch error is a transient connectivity issue.
 */
function isRetryableNetworkError(error: unknown): boolean {
  const code = getErrorCode(error);

  if (
    code &&
    [
      "ECONNREFUSED",
      "ECONNRESET",
      // The Anthropic host is fixed, so ENOTFOUND can be a transient resolver
      // outage. Keep it inside the existing bounded same-account retry budget.
      "ENOTFOUND",
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

  return (
    normalized.includes("econnrefused") ||
    normalized.includes("econnreset") ||
    normalized.includes("enotfound") ||
    normalized.includes("etimedout") ||
    normalized.includes("timed out") ||
    normalized.includes("connection error") ||
    normalized.includes("connect error") ||
    normalized.includes("fetch failed") ||
    normalized.includes("socket hang up")
  );
}

const TRANSIENT_HTTP_STATUSES = new Set([
  408, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 529,
]);

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

function normalizeClaudeRequestForAnthropic(
  body: ClaudeRequest,
): ClaudeRequest {
  return {
    ...body,
    messages: body.messages.map((msg) => {
      if (typeof msg.content !== "string") {
        return msg;
      }

      return {
        ...msg,
        content: [{ type: "text", text: msg.content }],
      };
    }),
  };
}

/**
 * Backward-compatible alias — delegates to the shared translation engine.
 */
export const buildProxyFallbackOptions = buildTranslationOptions;

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

// ---------------------------------------------------------------------------
// Test hooks (not part of the public SDK API). Only consumed by the proxy
// continuous-test-suite to drive the in-process resolver/reset logic without
// spinning up a full proxy. Keep this surface small.
// ---------------------------------------------------------------------------

export const __testHooks = {
  resolveHomeIndex,
  maybeResetPrimaryToHome,
  planCooldownFor429,
  isPermanentRefreshFailure,
  getStreamFailureDetails,
  trackUpstreamReadableStream,
  orderAccountsByQuota,
  resetEpochToMs,
  seedRuntimeQuotasFromDisk,
  getAccountRuntimeState: (key: string): RuntimeAccountState | undefined => {
    const state = accountRuntimeState.get(key);
    return state ? { ...state } : undefined;
  },
  setPrimaryAccountIndex: (index: number): void => {
    primaryAccountIndex = index;
  },
  getPrimaryAccountIndex: (): number => primaryAccountIndex,
  setAccountRuntimeState: (
    key: string,
    state: Partial<RuntimeAccountState>,
  ): void => {
    const existing =
      accountRuntimeState.get(key) ?? getOrCreateRuntimeState(key);
    Object.assign(existing, state);
    accountRuntimeState.set(key, existing);
  },
  resetAllRuntimeState: (): void => {
    accountRuntimeState.clear();
    transientRateLimitRetryBudgets.clear();
    transientCooldownAdmissionSchedules.clear();
    primaryAccountIndex = 0;
    lastKnownAccountCount = 0;
  },
  polyfillOAuthBody: (
    bodyStr: string,
    isClaudeClientRequest: boolean,
  ): { bodyStr: string; sessionId?: string } =>
    polyfillOAuthBody(
      bodyStr,
      "test-account-token",
      null,
      isClaudeClientRequest,
    ),
  isAntiAbuseConstruction429,
  fetchAnthropicAccountResponse,
  finalizeAnthropicTerminalFetchError,
  handleAnthropicAuthRetry,
  handleAnthropicStreamingSuccessResponse,
  claimTransientRateLimitRetry,
  claimTransientCooldownAdmission,
  waitForTransientAccountAvailability,
  describeTransportError,
  shouldAttemptClaudeFallback,
  executeClaudeFallbackWithRetry,
  buildClaudeAnthropicFailureResponse,
};
