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
import { Agent } from "undici";
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
  normalizeAnthropicAccountKey,
  shouldLoadFallbackCredential,
} from "../../proxy/accountSelection.js";
import {
  getUnifiedRateLimitStatus,
  isQuotaOverageAvailable,
  loadAccountQuotas,
  mergeQuotaSnapshot,
  modelFamilyToken,
  parseQuotaHeaders,
  saveAccountQuota,
} from "../../proxy/accountQuota.js";
import {
  fetchAccountUsage,
  listAnthropicAccountsForUsage,
  usageToQuota,
} from "../../proxy/accountUsage.js";
import { tokenStore } from "../../auth/tokenStore.js";
import {
  fetchCodexAccountUsage,
  listCodexAccountsForUsage,
  resolveProxyStatusAccountIdentity,
} from "../../proxy/codexAccountUsage.js";
import { AccountQuotaRefreshCoordinator } from "../../proxy/accountQuotaRefreshCoordinator.js";
import { ProviderTransportCoordinator } from "../../proxy/providerTransportCoordinator.js";
import { MAX_COOLDOWN_MS_BY_REASON } from "../../proxy/routingEvidence.js";
import {
  buildProxyLimitHeaders,
  summarizePoolHeadroom,
} from "../../proxy/quotaHeaders.js";
import {
  buildClaudeError,
  ClaudeStreamSerializer,
  generateToolUseId,
  parseClaudeRequest,
  serializeClaudeResponse,
} from "../../proxy/claudeFormat.js";
import {
  CodexFallbackResponseError,
  consumeCodexFallbackResponse,
  createCodexFallbackStream,
  convertClaudeRequestToCodex,
} from "../../proxy/codexFallback.js";
import { registerProxyResponseObserver } from "../../proxy/proxyActivity.js";
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
import { buildClientAttribution } from "../../proxy/clientAttribution.js";
import { createSSEInterceptor } from "../../proxy/sseInterceptor.js";
import { selectBorrowablePeers } from "../../proxy/peerStore.js";
import {
  evaluateResidentAccount,
  getResidentGrantForAccount,
  recordResidentSpend,
} from "../../proxy/residentGrants.js";
import {
  buildProvisionClaim,
  isLeaseRefusal,
  issueLease,
} from "../../proxy/shareLease.js";
import { forwardToPeer } from "../../proxy/peerTransport.js";
import { getShareContext } from "../../proxy/shareContext.js";
import { buildShareRefusal, extractShareToken } from "../../proxy/shareGate.js";
import {
  debitShareGrantCoins,
  getNodePublicUrl,
  getNoteSecret,
  getShareGrant,
  resolveShareToken,
  setShareGrantState,
} from "../../proxy/shareGrants.js";
import { recordAuditObservation } from "../../proxy/shareAudit.js";
import {
  claimProvisionRequest,
  openProvisionRequest,
} from "../../proxy/shareProvisioning.js";
import {
  applyReciprocalNetting,
  listShareReceipts,
} from "../../proxy/shareReceipts.js";
import {
  decodeShareNote,
  inspectShareNote,
  redeemShareNote,
} from "../../proxy/shareNotes.js";
import { verifySharePayload } from "../../proxy/shareSigning.js";
import {
  availableCoins,
  readSharePoolWindowUsage,
  readShareWindowUsage,
  recordShareWindowDelta,
  settleShareUsage,
  usageToCoins,
} from "../../proxy/shareLedger.js";
import {
  accountsInGrantScope,
  filterAccountsForGrant,
  isModelAllowed,
  isWithinSchedule,
  shareRefusalStatus,
  summarizeAccountExclusions,
} from "../../proxy/sharePolicy.js";
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
  refreshTokenFromLatest,
} from "../../proxy/tokenRefresh.js";
import {
  buildProxyTranslationPlan,
  parseRetryAfterMs,
} from "../../proxy/routingPolicy.js";
import { normalizeMaxInflightPerAccount } from "../../proxy/modelRouter.js";
import type {
  PersistedAccountCooldown,
  ProxyTranslationPlan,
  ProxyAccountDirectoryOverride,
  ProxyAccountProvider,
} from "../../types/index.js";
import { writeJsonSnapshotAtomically } from "../../proxy/snapshotPersistence.js";
import {
  getAccountStats,
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
} from "../../proxy/usageStats.js";
import type {
  AccountAllowlist,
  AccountAdmissionLease,
  CliAccountUsageTotals,
  CliAccountsResponse,
  CliAccountsRow,
  JsonObject,
  AccountAdmissionState,
  AccountCooldownPlan,
  AccountCoolingReason,
  AccountQuota,
  AccountQuotaWindow,
  AccountUsageFetchResult,
  AnthropicAttemptLogger,
  AnthropicAuthRetryResult,
  AnthropicEntitlementFailure,
  AnthropicInvalidRequestFailure,
  AnthropicLoopState,
  AnthropicScopedExhaustion,
  AnthropicNonOkResult,
  AnthropicSuccessResult,
  AnthropicUpstreamBodyBuilder,
  AnthropicUpstreamFetchResult,
  ClaudeFinalRequestLogger,
  ClaudeLoggedErrorBuilder,
  ClaudeRequest,
  ClaudeProxyRouteRuntimeOptions,
  DeferredClaudeAccountFailure,
  ClaudeSnapshot,
  ClaudeSnapshotBody,
  CodexFallbackResult,
  CodexReasoningEffort,
  InternalResult,
  LoadedClaudeAccountContext,
  ModelRouterInterface,
  ParsedClaudeError,
  ParsedClaudeRequest,
  PreparedAnthropicAccountAttempt,
  ProxyAccountRoutingCandidate,
  ProxyAccountRoutingDecision,
  ProxyAccountRoutingReason,
  ProxyAccountSortMetrics,
  ProxyBodyCaptureLogger,
  ProxyLimitsAccountResult,
  ProxyLimitsRefreshResponse,
  ProxyQuotaCooldownUpdate,
  ProxyOveragePolicy,
  ProxyPassthroughAccount,
  ProxyQuotaSource,
  QueuedAccountAdmission,
  ResponseInfoContext,
  RouteGroup,
  RoutedClaudeRequestRuntimeContext,
  RuntimeAccountState,
  ServerContext,
  StreamResult,
  StreamTerminalOutcome,
  TransientRateLimitRetryBudget,
  ProxyPeerAuthOutcome,
  ProxyPeerLimitsSnapshot,
  ProxyResidentGrant,
  ProxyShareAccountView,
  ProxyShareGates,
  ProxyShareGrant,
  ProxyShareRefusalResponse,
} from "../../types/index.js";
import { sanitizeForLog } from "../../utils/logSanitize.js";
import { logger } from "../../utils/logger.js";
import { raceWithAbort, withTimeout } from "../../utils/async/withTimeout.js";
import { ProviderHealthChecker } from "../../utils/providerHealth.js";
import { handleCodexResponsesRequest } from "./codexProxyRoutes.js";

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
const PROXY_INTERNAL_ACCOUNT_LABEL = "proxy/internal";
const PROXY_INTERNAL_ACCOUNT_TYPE = "internal";

function resolveRequestLogAccountIdentity(
  accountLabel: string | undefined,
  accountType: string | undefined,
): { accountKey?: string; provider?: string } {
  if (!accountLabel) {
    return {};
  }
  if (accountType === "codex-oauth") {
    return {
      accountKey: accountLabel.startsWith("codex:")
        ? accountLabel
        : `codex:${accountLabel}`,
      provider: "openai",
    };
  }
  if (
    accountType === "oauth" ||
    accountType === "api_key" ||
    accountType === "passthrough"
  ) {
    return {
      accountKey:
        accountType === "passthrough"
          ? accountLabel
          : normalizeAnthropicAccountKey(accountLabel),
      provider: "anthropic",
    };
  }
  return {};
}

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
/**
 * Retry budget for failures that happened before any request byte was sent
 * (a SYN lost on a lossy uplink). Nothing was dispatched, so each retry is
 * free of duplicate-work risk; on a link losing one connect in five, four
 * retries take the per-request failure rate from about 20% to under 1%.
 * Delays follow TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS, clamped to its last
 * entry.
 */
const MAX_CONNECT_PHASE_SAME_ACCOUNT_RETRIES = 4;
const OVERLOAD_ACCOUNT_ROTATION_DELAYS_MS = [250, 500, 1_000, 2_000] as const;
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

let anthropicUpstreamDispatcher: Agent | undefined;

function fetchAnthropicUpstream(
  url: string,
  init: RequestInit,
): Promise<Response> {
  // Node's global fetch applies Undici's 300s default headers timeout before
  // the route's 15-minute abort signal. Keep both transport deadlines aligned
  // with the proxy contract and instantiate lazily so importing routes has no
  // open transport handles.
  anthropicUpstreamDispatcher ??= new Agent({
    headersTimeout: UPSTREAM_FETCH_TIMEOUT_MS,
    bodyTimeout: UPSTREAM_FETCH_TIMEOUT_MS,
  });
  return fetch(url, {
    ...init,
    dispatcher: anthropicUpstreamDispatcher,
  } as RequestInit);
}

const accountRuntimeState = new Map<string, RuntimeAccountState>();
const accountQuotaRefreshCoordinator = new AccountQuotaRefreshCoordinator();
const providerTransportCoordinator = new ProviderTransportCoordinator();

/** Snapshot age is diagnostic and controls lightweight refresh eligibility. It
 * must never discard known healthy routing evidence or trigger a user request
 * on another account solely to rediscover quota. */
const QUOTA_SNAPSHOT_FRESHNESS_MS = 15 * 60 * 1000;

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

/**
 * Central per-account admission protects an OAuth account from a concurrent
 * request herd. A lease stays held until a JSON response completes or an SSE
 * response reaches a terminal state, so starting a stream cannot immediately
 * make room for another stream on the same account.
 */
const accountAdmissionStates = new Map<string, AccountAdmissionState>();
const unlimitedAccountAdmissionLease: AccountAdmissionLease = {
  release: () => undefined,
};

function getAccountAdmissionState(accountKey: string): AccountAdmissionState {
  let state = accountAdmissionStates.get(accountKey);
  if (!state) {
    state = { active: 0, waiters: [] };
    accountAdmissionStates.set(accountKey, state);
  }
  return state;
}

function drainAccountAdmissionWaiters(
  accountKey: string,
  state: AccountAdmissionState,
): void {
  while (state.waiters.length > 0 && state.active < state.waiters[0].capacity) {
    const waiter = state.waiters.shift();
    if (!waiter) {
      return;
    }
    state.active += 1;
    waiter.resolve(createAccountAdmissionLease(accountKey, state));
  }
}

function createAccountAdmissionLease(
  accountKey: string,
  state: AccountAdmissionState,
): AccountAdmissionLease {
  let released = false;
  return {
    release: () => {
      if (released) {
        return;
      }
      released = true;
      state.active = Math.max(0, state.active - 1);
      drainAccountAdmissionWaiters(accountKey, state);
      discardAccountAdmissionState(accountKey, state);
    },
  };
}

function discardAccountAdmissionState(
  accountKey: string,
  state: AccountAdmissionState,
): void {
  if (state.active === 0 && state.waiters.length === 0) {
    accountAdmissionStates.delete(accountKey);
  }
}

function tryAcquireAccountAdmission(
  accountKey: string,
  capacity: number | undefined,
): AccountAdmissionLease | undefined {
  const normalizedCapacity = normalizeMaxInflightPerAccount(capacity);
  if (normalizedCapacity === undefined) {
    return unlimitedAccountAdmissionLease;
  }
  const state = getAccountAdmissionState(accountKey);
  if (state.waiters.length > 0 || state.active >= normalizedCapacity) {
    return undefined;
  }
  state.active += 1;
  return createAccountAdmissionLease(accountKey, state);
}

function isAccountAdmissionAvailable(
  accountKey: string,
  capacity: number | undefined,
): boolean {
  const normalizedCapacity = normalizeMaxInflightPerAccount(capacity);
  if (normalizedCapacity === undefined) {
    return true;
  }
  const state = accountAdmissionStates.get(accountKey);
  return (
    !state || (state.waiters.length === 0 && state.active < normalizedCapacity)
  );
}

function enqueueAccountAdmission(
  accountKey: string,
  capacity: number,
): QueuedAccountAdmission {
  // Validate BEFORE getAccountAdmissionState(), which inserts into the map as a
  // side effect. Throwing after it would strand an empty entry for an account
  // that never got admitted — and the throw path never calls
  // discardAccountAdmissionState() to reap it.
  const normalizedCapacity = normalizeMaxInflightPerAccount(capacity);
  if (normalizedCapacity === undefined) {
    throw new Error("Account admission queue requires an explicit capacity");
  }
  const state = getAccountAdmissionState(accountKey);
  let queued = true;
  let grantedLease: AccountAdmissionLease | undefined;
  let resolveAdmission: (lease: AccountAdmissionLease) => void;
  const promise = new Promise<AccountAdmissionLease>((resolve) => {
    resolveAdmission = resolve;
  });
  const waiter = {
    capacity: normalizedCapacity,
    resolve: (lease: AccountAdmissionLease) => {
      queued = false;
      grantedLease = lease;
      resolveAdmission(lease);
    },
  };
  state.waiters.push(waiter);
  drainAccountAdmissionWaiters(accountKey, state);

  return {
    accountKey,
    promise,
    cancel: () => {
      if (grantedLease) {
        const lease = grantedLease;
        grantedLease = undefined;
        lease.release();
        return;
      }
      if (!queued) {
        return;
      }
      queued = false;
      const index = state.waiters.indexOf(waiter);
      if (index >= 0) {
        state.waiters.splice(index, 1);
        drainAccountAdmissionWaiters(accountKey, state);
      }
      discardAccountAdmissionState(accountKey, state);
    },
  };
}

async function acquireAccountAdmission(
  accountKey: string,
  capacity: number,
  abortSignal?: AbortSignal,
  timeoutMs: number = MAX_TRANSIENT_QUEUE_WAIT_MS,
): Promise<AccountAdmissionLease | undefined> {
  const queued = enqueueAccountAdmission(accountKey, capacity);
  try {
    return await withTimeout(
      raceWithAbort(queued.promise, abortSignal),
      timeoutMs,
      `Account admission for ${accountKey} timed out after ${timeoutMs}ms`,
    );
  } catch (error) {
    queued.cancel();
    if (abortSignal?.aborted) {
      throw error;
    }
    return undefined;
  }
}

async function acquireFirstAvailableAccountAdmission(
  accountKeys: string[],
  capacity: number,
  abortSignal?: AbortSignal,
  timeoutMs: number = MAX_TRANSIENT_QUEUE_WAIT_MS,
): Promise<{ accountKey: string; lease: AccountAdmissionLease } | undefined> {
  const queuedAdmissions = [...new Set(accountKeys)].map((accountKey) =>
    enqueueAccountAdmission(accountKey, capacity),
  );
  let winnerKey: string | undefined;
  try {
    return await withTimeout(
      raceWithAbort(
        Promise.race(
          queuedAdmissions.map((queued) =>
            queued.promise.then((lease) => {
              if (winnerKey) {
                lease.release();
                return new Promise<never>(() => undefined);
              }
              winnerKey = queued.accountKey;
              return { accountKey: queued.accountKey, lease };
            }),
          ),
        ),
        abortSignal,
      ),
      timeoutMs,
      `Account admission timed out after ${timeoutMs}ms`,
    );
  } catch (error) {
    if (abortSignal?.aborted) {
      throw error;
    }
    return undefined;
  } finally {
    for (const queued of queuedAdmissions) {
      if (queued.accountKey !== winnerKey) {
        queued.cancel();
      }
    }
  }
}

/** Track whether we've run the one-time startup prune. */
let startupPruneDone = false;
let startupPrune: Promise<void> | undefined;

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

/**
 * Publish limit/quota headers for this response onto the request context.
 *
 * Every response path funnels through here so the header contract is defined
 * once. The proxy runtime copies `ctx.responseHeaders` onto JSON and error
 * responses, and merges them into streaming Responses for keys those don't
 * already set — so a single call covers both shapes.
 */
function publishLimitHeaders(
  ctx: ServerContext,
  args: {
    upstreamHeaders?: Headers | Record<string, string>;
    quota?: AccountQuota | null;
    source: ProxyQuotaSource;
    account?: ProxyPassthroughAccount;
    accountState?: RuntimeAccountState;
    /** Overrides the account's own type — used by passthrough, which has no
     *  pooled account but is still a distinct serving mode. */
    accountType?: string;
    servedBy?: string;
    attempt?: number;
    poolAccounts?: ReadonlyArray<ProxyPassthroughAccount>;
  },
): void {
  try {
    const pool = args.poolAccounts
      ? summarizePoolHeadroom(
          args.poolAccounts.map((account) => {
            const state = accountRuntimeState.get(account.key);
            return {
              ...(state?.coolingUntil !== undefined
                ? { coolingUntil: state.coolingUntil }
                : {}),
              ...(state?.quota ? { quota: state.quota } : {}),
            };
          }),
        )
      : undefined;

    const headers = buildProxyLimitHeaders({
      ...(args.upstreamHeaders
        ? { upstreamHeaders: args.upstreamHeaders }
        : {}),
      context: {
        quota: args.quota ?? null,
        source: args.source,
        ...(args.account ? { accountLabel: args.account.label } : {}),
        ...((args.accountType ?? args.account?.type)
          ? { accountType: args.accountType ?? args.account?.type }
          : {}),
        ...(args.servedBy ? { servedBy: args.servedBy } : {}),
        ...(args.attempt !== undefined ? { attempt: args.attempt } : {}),
        ...(args.accountState?.coolingUntil !== undefined
          ? { coolingUntil: args.accountState.coolingUntil }
          : {}),
        ...(args.accountState?.coolingReason
          ? { coolingReason: args.accountState.coolingReason }
          : {}),
        ...(pool ? { pool } : {}),
      },
    });

    ctx.responseHeaders = {
      ...(ctx.responseHeaders ?? {}),
      ...redactHeadersForBorrower(headers),
    };
  } catch (error) {
    // Diagnostics must never break a response that is otherwise fine.
    logger.debug(
      `[proxy] failed to publish limit headers: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Clamp a cooldown target epoch-ms into [now+MIN, now+MAX], additionally capped
 * by what the reason can plausibly mean — a "session" cooldown describes a
 * 5-hour window, so a stale or malformed reset must not be able to park the
 * account for days under that label.
 */
function clampCooldownUntil(
  untilMs: number,
  now: number,
  reason?: AccountCoolingReason,
): number {
  const ceiling = Math.min(
    MAX_COOLDOWN_MS,
    (reason && MAX_COOLDOWN_MS_BY_REASON[reason]) ?? MAX_COOLDOWN_MS,
  );
  return Math.min(Math.max(untilMs, now + MIN_COOLDOWN_MS), now + ceiling);
}

function isAllowedQuotaStatus(status: string | undefined): boolean {
  return status?.trim().toLowerCase() === "allowed";
}

function isScopedWindowExhausted(
  window: AccountQuotaWindow | null,
  now: number,
): window is AccountQuotaWindow {
  if (!window || resetEpochToMs(window.resetsAt, now) === undefined) {
    return false;
  }
  return (
    window.status?.trim().toLowerCase() === "rejected" ||
    (window.used ?? 0) >= 1
  );
}

/**
 * Anthropic represents some model-specific limits through a rejected top-level
 * unified status. The scope window is the authoritative discriminator: only
 * treat that response as model-scoped when both account-wide windows remain
 * explicitly allowed and the requested model's window is exhausted.
 */
function getScopedOnlyExhaustion(
  quota: AccountQuota | null,
  requestedModel: string | undefined,
  now: number,
  policy: ProxyOveragePolicy = overagePolicy,
): AccountQuotaWindow | null {
  if (
    !quota ||
    !requestedModel ||
    !isAllowedQuotaStatus(quota.sessionStatus) ||
    !isAllowedQuotaStatus(quota.weeklyStatus) ||
    isOverageUsable(quota, policy)
  ) {
    return null;
  }
  const scopedWindow = matchScopedQuotaWindow(quota, requestedModel, now);
  return isScopedWindowExhausted(scopedWindow, now) ? scopedWindow : null;
}

function hasScopedOnlyExhaustion(
  quota: AccountQuota,
  now: number,
  policy: ProxyOveragePolicy = overagePolicy,
): boolean {
  if (
    !isAllowedQuotaStatus(quota.sessionStatus) ||
    !isAllowedQuotaStatus(quota.weeklyStatus) ||
    isOverageUsable(quota, policy)
  ) {
    return false;
  }
  return (quota.windows ?? []).some(
    (window) =>
      window.kind === "weekly_scoped" &&
      typeof window.scopeModel === "string" &&
      now - scopedWindowObservedAt(quota, window) <=
        QUOTA_SNAPSHOT_FRESHNESS_MS &&
      isScopedWindowExhausted(window, now),
  );
}

/**
 * Decide how to cool an account after a genuine (non-anti-abuse) 429.
 *
 * The unified subscription limits expose per-window status + reset:
 *   - weekly (7d) "rejected"  → hard cap for the week; cool until the 7d reset.
 *   - session (5h) "rejected" → paced out for this session; cool until the 5h reset.
 * Both mean "retrying this account is futile until its window resets" unless
 * the provider explicitly enables overage. In that case, the subscription
 * window is exhausted but the account remains usable for paid fallback.
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
  policy: ProxyOveragePolicy = overagePolicy,
  requestedModel?: string,
): AccountCooldownPlan {
  // Weekly exhaustion takes precedence — it's the longest, hardest ceiling.
  if (quota && quota.weeklyStatus === "rejected") {
    const reset =
      resetEpochToMs(quota.weeklyResetAt, now) ??
      (retryAfterMs > 0 ? now + retryAfterMs : now + DEFAULT_COOLING_PERIOD_MS);
    return {
      reason: "weekly",
      scope: "account",
      coolingUntil: clampCooldownUntil(reset, now, "weekly"),
      rotateImmediately: true,
    };
  }
  const overageAvailable = isOverageUsable(quota, policy);
  if (quota && quota.sessionStatus === "rejected" && !overageAvailable) {
    const reset =
      resetEpochToMs(quota.sessionResetAt, now) ??
      (retryAfterMs > 0 ? now + retryAfterMs : now + DEFAULT_COOLING_PERIOD_MS);
    return {
      reason: "session",
      scope: "account",
      coolingUntil: clampCooldownUntil(reset, now, "session"),
      rotateImmediately: true,
    };
  }
  const scopedOnlyExhaustion = getScopedOnlyExhaustion(
    quota,
    requestedModel,
    now,
    policy,
  );
  if (scopedOnlyExhaustion) {
    const reset =
      resetEpochToMs(scopedOnlyExhaustion.resetsAt, now) ??
      (retryAfterMs > 0 ? now + retryAfterMs : now + DEFAULT_HARD_COOLDOWN_MS);
    return {
      // Keep the provider's top-level classification for logs, but do not
      // persist it as an account cooldown. The scoped quota window gates only
      // this model on subsequent requests.
      reason: "unified",
      scope: "model",
      coolingUntil: reset,
      rotateImmediately: true,
    };
  }
  // Anthropic may reject the authoritative top-level unified limit while both
  // 5h and 7d sub-window statuses still say "allowed". Treating this as a
  // transient burst retries a known-exhausted account and delays failover.
  if (unifiedStatus?.trim().toLowerCase() === "rejected" && !overageAvailable) {
    const reset =
      retryAfterMs > 0 ? now + retryAfterMs : now + DEFAULT_HARD_COOLDOWN_MS;
    return {
      reason: "unified",
      scope: "account",
      coolingUntil: clampCooldownUntil(reset, now, "unified"),
      rotateImmediately: true,
    };
  }
  // Transient burst: cool only for retry-after, floored at MIN_COOLDOWN_MS so a
  // tiny retry-after can't make the account eligible almost immediately, and
  // capped so it recovers quickly.
  const base = retryAfterMs > 0 ? retryAfterMs : DEFAULT_COOLING_PERIOD_MS;
  return {
    reason: "transient",
    scope: "account",
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
 * Reconcile quota-backed cooldowns against a fresh provider observation. A
 * rejected window parks the account until its reset; an allowed observation for
 * that same window releases an earlier cooldown whose reset timestamp was
 * stale. Transient and authentication cooldowns are intentionally untouched.
 */
function reconcileCooldownFromQuota(
  state: RuntimeAccountState,
  quota: AccountQuota,
  now: number,
  policy: ProxyOveragePolicy = overagePolicy,
): ProxyQuotaCooldownUpdate {
  const overageAvailable = isOverageUsable(quota, policy);
  const scopedOnlyExhaustion = hasScopedOnlyExhaustion(quota, now, policy);
  let until: number | undefined;
  let reason: RuntimeAccountState["coolingReason"];
  if (quota.weeklyStatus === "rejected") {
    until = resetEpochToMs(quota.weeklyResetAt, now);
    reason = "weekly";
  }
  if (
    until === undefined &&
    overageAvailable &&
    state.coolingUntil &&
    (state.coolingReason === "session" || state.coolingReason === "unified")
  ) {
    const previousCoolingUntil = state.coolingUntil;
    state.coolingUntil = undefined;
    state.coolingReason = undefined;
    logger.always(
      "[proxy] clearing subscription cooldown because Anthropic explicitly permits overage",
    );
    return { kind: "cleared", coolingUntil: previousCoolingUntil };
  }
  if (
    until === undefined &&
    quota.sessionStatus === "rejected" &&
    !overageAvailable
  ) {
    until = resetEpochToMs(quota.sessionResetAt, now);
    reason = "session";
  } else if (
    until === undefined &&
    quota.unifiedStatus === "rejected" &&
    !overageAvailable &&
    !scopedOnlyExhaustion
  ) {
    until = now + DEFAULT_HARD_COOLDOWN_MS;
    reason = "unified";
  }
  if (until === undefined) {
    const recoveredQuotaCooldown =
      !!state.coolingUntil &&
      ((state.coolingReason === "weekly" && quota.weeklyStatus === "allowed") ||
        (state.coolingReason === "session" &&
          quota.sessionStatus === "allowed") ||
        (state.coolingReason === "unified" &&
          (quota.unifiedStatus === "allowed" || scopedOnlyExhaustion)));
    if (recoveredQuotaCooldown && state.coolingUntil) {
      const previousCoolingUntil = state.coolingUntil;
      const previousCoolingReason = state.coolingReason;
      state.coolingUntil = undefined;
      state.coolingReason = undefined;
      logger.always(
        `[proxy] clearing ${previousCoolingReason} cooldown from fresh provider quota`,
      );
      return { kind: "cleared", coolingUntil: previousCoolingUntil };
    }
    return null;
  }
  const clamped = clampCooldownUntil(until, now, reason);
  if (!state.coolingUntil || clamped > state.coolingUntil) {
    state.coolingUntil = clamped;
    state.coolingReason = reason;
    logger.always(
      `[proxy] proactively cooling account (${reason}) ~${minutesUntil(clamped, now)}m from success-response quota (status rejected)`,
    );
    return {
      kind: "cooled",
      coolingUntil: clamped,
      coolingReason: reason ?? "unified",
    };
  }
  return null;
}

/**
 * Seed each account's runtime quota from the persisted snapshots in
 * ~/.neurolink/account-quotas.json (keyed by provider-qualified account key).
 * Runtime state is
 * in-memory only, so without this the quota-aware ordering is blind after a
 * proxy restart: all accounts tie, selection falls back to token-store
 * enumeration order, and the first account served becomes self-reinforcing
 * (it alone has data) — starving the others regardless of their resets.
 * Never overwrites fresher in-memory quota. Persisted quota cannot create or
 * clear a cooldown: only an existing cooldown or fresh upstream response
 * headers can change admission state.
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
      if (!state.quota) {
        // Before provider identity was introduced, Anthropic snapshots were
        // written under the bare display label. Keep that reading as an
        // upgrade bridge, but never write new data back under the ambiguous
        // key: a Codex login can legitimately use the same email.
        state.quota =
          persistedQuotas[account.key] ?? persistedQuotas[account.label];
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

// ---------------------------------------------------------------------------
// Manual limits refresh (GET /limits)
// ---------------------------------------------------------------------------

/** Minimum spacing between usage-endpoint fetches for one account. Bounds
 *  abuse of the ungated endpoint; inside the window the last reading is
 *  returned as "throttled" (still fresher than any passive snapshot). */
const MIN_USAGE_REFETCH_INTERVAL_MS = 15_000;

const lastUsageFetchAt = new Map<string, number>();
let limitsRefreshInFlight: Promise<ProxyLimitsRefreshResponse> | null = null;
const USAGE_REFRESH_CONCURRENCY = 4;

async function applyAccountUsageResult(
  account: ProxyPassthroughAccount,
  fetchResult: AccountUsageFetchResult,
  observedAt: number,
  prior?: AccountQuota | null,
): Promise<AccountQuota | null> {
  if (fetchResult.ok === false) {
    return null;
  }
  const state = getOrCreateRuntimeState(account.key);
  const quota = usageToQuota(fetchResult.usage, {
    now: observedAt,
    prior: state.quota ?? prior ?? null,
  });
  if (!quota) {
    return null;
  }
  // The usage payload cannot be newer than the request that fetched it. A
  // passive response captured after that request started wins, including its
  // cooldown decision and persisted snapshot.
  if (quota.lastUpdated < (state.quota?.lastUpdated ?? 0)) {
    return state.quota ?? null;
  }
  state.quota = mergeQuotaSnapshot(state.quota, quota);
  const cooldownUpdate = reconcileCooldownFromQuota(state, quota, Date.now());
  if (cooldownUpdate?.kind === "cooled") {
    await saveAccountCooldown(
      account.key,
      cooldownUpdate.coolingUntil,
      cooldownUpdate.coolingReason,
    ).catch(() => {
      // Non-fatal: the cooldown is already active in memory.
    });
  } else if (cooldownUpdate?.kind === "cleared") {
    await clearAccountCooldown(account.key, cooldownUpdate.coolingUntil).catch(
      () => {
        // Non-fatal: the next successful response will reconcile again.
      },
    );
  }
  await saveAccountQuota(account.key, quota).catch(() => {
    // Non-fatal: quota persistence is best-effort.
  });
  return quota;
}

async function fetchValidatedAccountUsage(
  account: ProxyPassthroughAccount,
): Promise<AccountUsageFetchResult> {
  const result = await fetchAccountUsage(account);
  if (result.ok === false) {
    return result;
  }
  const recognizable = usageToQuota(result.usage, {
    now: Date.now(),
    prior: accountRuntimeState.get(account.key)?.quota ?? null,
  });
  return recognizable
    ? result
    : {
        ok: false,
        reason: "parse",
        error: "usage payload had no recognizable limit windows",
      };
}

async function refreshAccountQuotaInBackground(
  account: ProxyPassthroughAccount,
  trigger: string,
): Promise<void> {
  const refresh = await accountQuotaRefreshCoordinator.run(
    account,
    trigger,
    fetchValidatedAccountUsage,
  );
  if (refresh.kind !== "completed" || refresh.result.ok === false) {
    return;
  }
  await applyAccountUsageResult(account, refresh.result, refresh.startedAt);
}

/**
 * The logins the account-exposing routes enumerate, per engine, plus every
 * key the token store holds at all (disabled ones included). Overridable by
 * the suite because the token store is a singleton bound to the real home at
 * import — a case cannot point it elsewhere, and reading the operator's own
 * logins inside a fixture test is exactly how a phantom would hide.
 */
let accountDirectoryOverride: ProxyAccountDirectoryOverride | null = null;

async function listRoutableAccountsByEngine(
  allowlist?: AccountAllowlist,
): Promise<Record<ProxyAccountProvider, ProxyPassthroughAccount[]>> {
  if (accountDirectoryOverride) {
    return {
      anthropic: accountDirectoryOverride.anthropic,
      codex: accountDirectoryOverride.codex,
    };
  }
  // The allowlist is an Anthropic routing concept, keyed by anthropic:
  // prefixes; applying it to Codex keys would exclude every Codex login.
  const [anthropic, codex] = await Promise.all([
    listAnthropicAccountsForUsage(allowlist),
    listCodexAccountsForUsage(),
  ]);
  return { anthropic, codex };
}

/**
 * Every login the token store knows, routable or not. This is what separates
 * a DISABLED login (still here, shown as unrouted) from a REMOVED one (gone,
 * and not shown): usage counters and quota snapshots outlive a logout, and
 * without this check a deleted login renders as an unrouted account forever.
 */
async function listKnownAccountKeys(): Promise<Set<string>> {
  if (accountDirectoryOverride) {
    return accountDirectoryOverride.knownKeys;
  }
  const [anthropic, codex] = await Promise.all([
    tokenStore.listByPrefix("anthropic:"),
    tokenStore.listByPrefix("codex:"),
  ]);
  return new Set([...anthropic.map(normalizeAnthropicAccountKey), ...codex]);
}

/**
 * Fetch fresh limits from Anthropic's usage endpoint for every eligible OAuth
 * account and write them through the exact same chain the passive header
 * capture uses (runtime state → cooldown reconciliation → debounced disk
 * snapshot), so routing and `auth list` see the refreshed windows and the
 * automatic path keeps working unchanged on top of them.
 */
async function refreshAccountLimits(
  options: {
    accountAllowlist?: AccountAllowlist;
    accountFilter?: string;
    snapshotOnly?: boolean;
  } = {},
): Promise<ProxyLimitsRefreshResponse> {
  const fetchedAt = Date.now();
  const directory = await listRoutableAccountsByEngine(
    options.accountAllowlist,
  );
  const allAccounts: Array<{
    account: ProxyPassthroughAccount;
    provider: ProxyAccountProvider;
  }> = [
    ...directory.anthropic.map((account) => ({
      account,
      provider: "anthropic" as const,
    })),
    ...directory.codex.map((account) => ({
      account,
      provider: "codex" as const,
    })),
  ];
  const accounts = options.accountFilter
    ? allAccounts.filter(
        ({ account }) =>
          account.label === options.accountFilter ||
          account.key === options.accountFilter,
      )
    : allAccounts;
  const persisted = await loadAccountQuotas().catch(
    () => ({}) as Record<string, AccountQuota>,
  );

  const buildResult = (
    account: ProxyPassthroughAccount,
    provider: ProxyAccountProvider,
    status: ProxyLimitsAccountResult["status"],
    quota: AccountQuota | null,
    error?: string,
  ): ProxyLimitsAccountResult => {
    const state = accountRuntimeState.get(account.key);
    // The quota store keys Anthropic snapshots by bare label for historical
    // reasons (see CLAUDE.md) and Codex snapshots by full key. A Codex login
    // must never fall back to the bare label: with one email on both engines
    // that label holds the ANTHROPIC account's windows.
    const persistedQuota =
      provider === "anthropic"
        ? (persisted[account.key] ?? persisted[account.label] ?? null)
        : (persisted[account.key] ?? null);
    const result: ProxyLimitsAccountResult = {
      account: account.label,
      key: account.key,
      provider,
      type: account.type,
      status,
      quota: quota ?? state?.quota ?? persistedQuota,
    };
    if (error !== undefined) {
      result.error = error;
    }
    if (state?.coolingUntil && state.coolingUntil > Date.now()) {
      result.coolingUntil = state.coolingUntil;
      if (state.coolingReason) {
        result.coolingReason = state.coolingReason;
      }
    }
    return result;
  };

  if (options.snapshotOnly) {
    return {
      fetchedAt,
      snapshot: true,
      results: accounts.map(({ account, provider }) =>
        buildResult(account, provider, "snapshot", null),
      ),
      refreshMetrics: accountQuotaRefreshCoordinator.getMetrics(),
    };
  }

  const results: ProxyLimitsAccountResult[] = new Array(accounts.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = nextIndex++;
      if (index >= accounts.length) {
        return;
      }
      const { account, provider } = accounts[index];
      if (account.type !== "oauth") {
        results[index] = buildResult(
          account,
          provider,
          "skipped_api_key",
          null,
        );
        continue;
      }
      const lastFetch = lastUsageFetchAt.get(account.key) ?? 0;
      if (Date.now() - lastFetch < MIN_USAGE_REFETCH_INTERVAL_MS) {
        results[index] = buildResult(account, provider, "throttled", null);
        continue;
      }
      lastUsageFetchAt.set(account.key, Date.now());
      if (provider === "codex") {
        // Codex has its own usage endpoint and no overage/cooldown
        // reconciliation to run; the snapshot is written under the full key,
        // which is the only key the Codex engine ever reads it back by.
        try {
          const fetched = await fetchCodexAccountUsage(account);
          if (fetched.ok === false) {
            results[index] = buildResult(
              account,
              provider,
              "error",
              null,
              `codex usage fetch failed: ${fetched.reason}`,
            );
            continue;
          }
          await saveAccountQuota(account.key, fetched.quota);
          results[index] = buildResult(
            account,
            provider,
            "refreshed",
            fetched.quota,
          );
        } catch (err) {
          results[index] = buildResult(
            account,
            provider,
            "error",
            null,
            err instanceof Error ? err.message : String(err),
          );
        }
        continue;
      }
      // Isolate failures per account: an unexpected rejection must not abort
      // the Promise.all sweep and turn the whole /limits response into a 502.
      try {
        const refresh = await accountQuotaRefreshCoordinator.run(
          account,
          `manual:${account.key}`,
          fetchValidatedAccountUsage,
          { force: true },
        );
        if (refresh.kind !== "completed") {
          results[index] = buildResult(account, provider, "throttled", null);
          continue;
        }
        const fetchResult = refresh.result;
        // `=== false` (not `!ok`) — the react-hooks sub-build compiles this
        // file without strictNullChecks, where negated boolean-discriminant
        // narrowing does not apply.
        if (fetchResult.ok === false) {
          results[index] = buildResult(
            account,
            provider,
            "error",
            null,
            fetchResult.error,
          );
          continue;
        }
        const quota = await applyAccountUsageResult(
          account,
          fetchResult,
          refresh.startedAt,
          persisted[account.key] ?? persisted[account.label] ?? null,
        );
        if (!quota) {
          results[index] = buildResult(
            account,
            provider,
            "error",
            null,
            "usage payload had no recognizable limit windows",
          );
          continue;
        }
        results[index] = buildResult(account, provider, "refreshed", quota);
      } catch (err) {
        results[index] = buildResult(
          account,
          provider,
          "error",
          null,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(USAGE_REFRESH_CONCURRENCY, accounts.length || 1) },
      () => worker(),
    ),
  );
  return {
    fetchedAt,
    snapshot: false,
    results,
    refreshMetrics: accountQuotaRefreshCoordinator.getMetrics(),
  };
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
 * Operator policy on spending paid extra usage, refreshed from the runtime
 * config snapshot on every request so a config edit applies mid-flight.
 *
 * Module-level rather than threaded through because every routing and cooldown
 * decision consults it, and the value is uniform for a given proxy generation.
 */
let overagePolicy: ProxyOveragePolicy = "auto";

/**
 * Publish the operator's extra-usage policy for paths that cannot receive it
 * explicitly. Callers that make a routing or cooldown decision take it as a
 * parameter instead — see {@link isOverageUsable} — so a concurrent request or
 * a hot config reload cannot change the answer mid-flight.
 *
 * `undefined` means "no runtime config on this path", which is not a request to
 * clear an operator's setting, so the current value is kept.
 */
function setOveragePolicy(policy: ProxyOveragePolicy | undefined): void {
  if (policy !== undefined) {
    overagePolicy = policy;
  }
}

/** The policy in force for a request that did not capture one explicitly. */
function currentOveragePolicy(): ProxyOveragePolicy {
  return overagePolicy;
}

/**
 * Whether this account may keep serving on paid extra usage.
 *
 * The provider decides what is possible; the operator decides what is
 * permitted. `never` therefore vetoes an enabled account, while `always` can
 * only confirm a signal Anthropic already gives — nothing here can switch on
 * extra usage the organization has disabled.
 */
function isOverageUsable(
  quota: Parameters<typeof isQuotaOverageAvailable>[0],
  policy: ProxyOveragePolicy = overagePolicy,
): boolean {
  if (policy === "never") {
    return false;
  }
  return isQuotaOverageAvailable(quota);
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
/** Shortest scope token we will match on, so a degenerately broad scope name
 *  (e.g. "Claude") cannot silently apply a per-model cap to every model. */
const MIN_SCOPE_TOKEN_LENGTH = 4;

function normalizeModelToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The distinguishing part of a scope display name. The shared vendor prefix is
 * dropped so a window scoped to plain "Claude" collapses to "" and is rejected
 * by the length guard rather than matching every Claude model.
 */
function scopeMatchToken(scopeModel: string): string {
  const normalized = normalizeModelToken(scopeModel);
  return normalized.startsWith("claude") ? normalized.slice(6) : normalized;
}

/**
 * How well a window's scope identifies the requested model, or null when it does
 * not apply. Higher wins; an exact wire-id agreement is unambiguous and so
 * outranks every display-name match.
 */
function scopeMatchScore(
  window: AccountQuotaWindow,
  normalizedModel: string,
  requestedFamily: string,
): number | null {
  if (
    window.scopeModelId &&
    normalizeModelToken(modelFamilyToken(window.scopeModelId)) ===
      requestedFamily
  ) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (!window.scopeModel) {
    return null;
  }
  const scopeToken = scopeMatchToken(window.scopeModel);
  if (
    scopeToken.length < MIN_SCOPE_TOKEN_LENGTH ||
    !normalizedModel.includes(scopeToken)
  ) {
    return null;
  }
  return scopeToken.length;
}

/**
 * When a scoped window was last observed. Falls back through the usage-API
 * sweep timestamp to the flat snapshot time.
 *
 * Needed because the flat fields refresh on every response while `windows` only
 * changes when the served model has a scoped cap — so a days-old scoped window
 * rides along on a `lastUpdated` from seconds ago and looks current.
 */
function scopedWindowObservedAt(
  quota: AccountQuota,
  window: AccountQuotaWindow,
): number {
  return window.updatedAt ?? quota.windowsUpdatedAt ?? quota.lastUpdated;
}

/**
 * Find the model-scoped quota window that applies to the requested model.
 *
 * Two sources describe the same cap differently: response headers carry the wire
 * id of the model just served, while the usage API reports a DISPLAY name
 * ("Fable", "Claude Opus 4.6"). So an exact wire-id match is tried first and
 * display-name containment over alphanumeric-normalized forms is the fallback.
 * Among equally specific matches the freshest observation wins, which favours
 * the continuously-updated header window over a manually-refreshed one.
 *
 * Returns null whenever the account reports no applicable, still-fresh scoped
 * cap — the common case.
 */
function matchScopedQuotaWindow(
  quota: AccountQuota | undefined,
  requestedModel: string | undefined,
  now: number = Date.now(),
): AccountQuotaWindow | null {
  if (!quota?.windows?.length || !requestedModel) {
    return null;
  }
  const normalizedModel = normalizeModelToken(requestedModel);
  if (!normalizedModel) {
    return null;
  }
  const requestedFamily = normalizeModelToken(modelFamilyToken(requestedModel));
  let best: AccountQuotaWindow | null = null;
  let bestScore = -1;
  let bestObservedAt = -1;
  for (const window of quota.windows) {
    // `isActive` marks which window the provider considers binding right now,
    // not whether the cap applies — a scoped cap reads as inactive until it is
    // the tightest constraint, which is far too late to route around it.
    if (
      now - scopedWindowObservedAt(quota, window) >
      QUOTA_SNAPSHOT_FRESHNESS_MS
    ) {
      continue;
    }
    const score = scopeMatchScore(window, normalizedModel, requestedFamily);
    if (score === null) {
      continue;
    }
    const observedAt = scopedWindowObservedAt(quota, window);
    if (
      score > bestScore ||
      (score === bestScore && observedAt > bestObservedAt)
    ) {
      best = window;
      bestScore = score;
      bestObservedAt = observedAt;
    }
  }
  return best;
}

/**
 * Split a candidate set by whether each account can still serve the requested
 * model under its model-scoped cap.
 *
 * An account is scoped out only on evidence strong enough to act on: a fresh
 * window, a reset that is actually ticking, a rejected/spent reading, and no
 * paid extra usage to absorb the overflow. Anything weaker leaves the account
 * eligible — a stale or mis-parsed window must never be able to empty the pool.
 *
 * `exhaustion` is populated only when every candidate is scoped out AND the
 * evidence is trustworthy, which is what lets the caller report "switch model"
 * instead of a generic rate limit.
 */
function evaluateScopedExhaustion(
  accounts: ProxyPassthroughAccount[],
  requestedModel: string | undefined,
  now: number = Date.now(),
  policy: ProxyOveragePolicy = overagePolicy,
): {
  eligible: ProxyPassthroughAccount[];
  exhaustion: AnthropicScopedExhaustion | null;
} {
  if (!requestedModel || accounts.length === 0) {
    return { eligible: accounts, exhaustion: null };
  }
  const eligible: ProxyPassthroughAccount[] = [];
  const exhausted: { label: string; window: AccountQuotaWindow }[] = [];
  let overageDisabledReason: string | undefined;
  for (const account of accounts) {
    const quota = accountRuntimeState.get(account.key)?.quota;
    const window = matchScopedQuotaWindow(quota, requestedModel, now);
    const reset = window ? resetEpochToMs(window.resetsAt, now) : undefined;
    const spent =
      window !== null &&
      reset !== undefined &&
      ((window.status ?? "").trim().toLowerCase() === "rejected" ||
        (window.used ?? 0) >= 1) &&
      !isOverageUsable(quota, policy);
    if (!spent || !window) {
      eligible.push(account);
      continue;
    }
    exhausted.push({ label: account.label, window });
    overageDisabledReason ??= quota?.overageDisabledReason;
  }
  if (eligible.length > 0 || exhausted.length === 0) {
    return { eligible, exhaustion: null };
  }
  const earliestResetMs = Math.min(
    ...exhausted.map(
      (entry) =>
        resetEpochToMs(entry.window.resetsAt, now) ?? Number.POSITIVE_INFINITY,
    ),
  );
  return {
    eligible,
    exhaustion: {
      model: requestedModel,
      scopeModel:
        exhausted[0]?.window.scopeModel ?? modelFamilyToken(requestedModel),
      earliestResetMs,
      accounts: exhausted.map((entry) => entry.label),
      ...(overageDisabledReason ? { overageDisabledReason } : {}),
    },
  };
}

function accountSortMetrics(
  accountKey: string,
  now: number,
  sessionSoftLimit: number,
  sessionResetToleranceMs: number,
  requestedModel?: string,
  policy: ProxyOveragePolicy = overagePolicy,
): ProxyAccountSortMetrics {
  const st = accountRuntimeState.get(accountKey);
  const q = st?.quota;
  const quotaLastUpdated =
    q && Number.isFinite(q.lastUpdated) ? q.lastUpdated : null;
  const quotaAgeMs =
    quotaLastUpdated === null ? null : Math.max(0, now - quotaLastUpdated);
  const refreshState = accountQuotaRefreshCoordinator.getState(accountKey);
  const quotaStale =
    quotaAgeMs !== null && quotaAgeMs > QUOTA_SNAPSHOT_FRESHNESS_MS;
  const normalizeStatus = (status: string): string =>
    status.trim().toLowerCase();
  const rawOverageEligible = isQuotaOverageAvailable(q);
  const observedStatuses = [
    q?.unifiedStatus,
    q?.sessionStatus,
    q?.weeklyStatus,
  ].filter((status): status is string => !!status?.trim());
  const staleHardOrAmbiguous =
    quotaStale &&
    !!q &&
    !rawOverageEligible &&
    observedStatuses.some((status) => normalizeStatus(status) !== "allowed");
  const quotaFreshness = !q
    ? ("unknown" as const)
    : !quotaStale
      ? ("fresh" as const)
      : staleHardOrAmbiguous
        ? ("refresh_due" as const)
        : ("stale_known" as const);
  // A stale rejection is advisory after restart and cannot quarantine an
  // account. Keep it as evidence, rank it behind known-healthy accounts, and
  // refresh it through the usage endpoint before relying on the old status.
  const routingQuota = staleHardOrAmbiguous ? undefined : q;
  const coolingActive = !!st?.coolingUntil && now < st.coolingUntil;
  // resetEpochToMs returns undefined for absent OR passed resets, so a
  // ticking window is exactly "reset !== undefined".
  const weeklyReset = resetEpochToMs(routingQuota?.weeklyResetAt, now);
  const sessionReset = resetEpochToMs(routingQuota?.sessionResetAt, now);
  const sessionTicking = sessionReset !== undefined;
  const weeklyTicking = weeklyReset !== undefined;
  const sessionUsed = routingQuota
    ? sessionTicking
      ? (routingQuota.sessionUsed ?? 0)
      : 0
    : null;
  const weeklyUsed = routingQuota
    ? weeklyTicking
      ? (routingQuota.weeklyUsed ?? null)
      : 0
    : null;
  const sessionStatus = routingQuota
    ? sessionTicking
      ? (routingQuota.sessionStatus ?? "unknown")
      : "allowed"
    : null;
  const weeklyStatus = routingQuota
    ? weeklyTicking
      ? (routingQuota.weeklyStatus ?? "unknown")
      : "allowed"
    : null;
  // isOverageUsable layers the operator's routing.use-overage policy over the
  // provider signal isQuotaOverageAvailable reads.
  const overageEligible = isOverageUsable(routingQuota, policy);
  const hardSaturated =
    !overageEligible &&
    (sessionStatus === "rejected" ||
      sessionStatus === "throttled" ||
      weeklyStatus === "rejected" ||
      weeklyStatus === "throttled" ||
      routingQuota?.unifiedStatus?.trim().toLowerCase() === "rejected" ||
      (sessionTicking && (sessionUsed ?? 0) >= 1) ||
      (weeklyTicking && (weeklyUsed ?? 0) >= 1));
  const softSaturated =
    !hardSaturated &&
    !overageEligible &&
    sessionTicking &&
    (sessionUsed ?? 0) >= sessionSoftLimit;
  const saturated = hardSaturated || softSaturated;
  // Model-scoped weekly cap for the model this request actually asks for.
  // Reset-freshened exactly like session/weekly: a window whose reset has
  // passed reads as renewed, never as spent.
  const scopedWindow = matchScopedQuotaWindow(
    routingQuota,
    requestedModel,
    now,
  );
  const scopedReset = scopedWindow
    ? resetEpochToMs(scopedWindow.resetsAt, now)
    : undefined;
  const scopedTicking = scopedReset !== undefined;
  const scopedUsed = scopedWindow
    ? scopedTicking
      ? scopedWindow.used
      : 0
    : null;
  const scopedStatus = scopedWindow
    ? scopedTicking
      ? (scopedWindow.status ?? "unknown")
      : "allowed"
    : null;
  const scopedSaturated =
    !quotaStale && scopedTicking && (scopedUsed ?? 0) >= sessionSoftLimit;
  return {
    // A rejected model-scoped window means this account cannot serve THIS
    // model, even though it may be perfectly healthy for others. Excluding it
    // here only affects ordering — the real gate is evaluateScopedExhaustion,
    // and neither cools the account, which would wrongly withhold it from
    // every other model.
    usable:
      !coolingActive &&
      !hardSaturated &&
      (scopedStatus !== "rejected" || overageEligible),
    saturated,
    scopedModel: scopedWindow?.scopeModel ?? null,
    scopedStatus,
    scopedUsed,
    scopedReset: scopedReset ?? Number.POSITIVE_INFINITY,
    scopedUsedForSort: scopedUsed ?? -1,
    scopedSaturated,
    hasQuota: !!q,
    quotaEvidenceRank:
      quotaFreshness === "fresh" || quotaFreshness === "stale_known"
        ? 0
        : quotaFreshness === "refresh_due"
          ? 1
          : 2,
    quotaStale,
    quotaFreshness,
    refreshNeeded:
      quotaFreshness === "unknown" || quotaFreshness === "refresh_due",
    refreshReason:
      quotaFreshness === "unknown"
        ? "startup_unknown"
        : quotaFreshness === "refresh_due"
          ? "ambiguous_snapshot"
          : null,
    refreshInFlight: refreshState.inFlight,
    lastRefreshAttemptAt: refreshState.lastAttemptAt ?? null,
    lastRefreshSuccessAt: refreshState.lastSuccessAt ?? null,
    nextRefreshEligibleAt: refreshState.nextEligibleAt ?? null,
    saturationKind: hardSaturated ? "hard" : softSaturated ? "soft" : "none",
    softLimitOverrideReason:
      overageEligible &&
      sessionTicking &&
      (sessionUsed ?? 0) >= sessionSoftLimit
        ? "overage"
        : null,
    quotaLastUpdated,
    quotaAgeMs,
    coolingActive,
    coolingReason: st?.coolingReason ?? null,
    coolingUntil: st?.coolingUntil ?? 0,
    unifiedStatus: routingQuota?.unifiedStatus ?? null,
    fallbackStatus: routingQuota?.fallbackStatus ?? null,
    upgradePaths: routingQuota?.upgradePaths ?? null,
    overageEligible,
    overageStatus: routingQuota?.overageStatus ?? null,
    sessionStatus,
    sessionUsed,
    sessionResetBucket: sessionTicking
      ? Math.floor(sessionReset / sessionResetToleranceMs)
      : Number.POSITIVE_INFINITY,
    sessionReset: sessionReset ?? Number.POSITIVE_INFINITY,
    weeklyStatus,
    weeklyReset: weeklyReset ?? Number.POSITIVE_INFINITY,
    weeklyUsed,
    weeklyUsedForSort: weeklyUsed ?? -1,
  };
}

function compareAccountRoutingFactors(
  a: ProxyPassthroughAccount,
  b: ProxyPassthroughAccount,
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>,
  primaryKey: string | undefined,
): [number, ProxyAccountRoutingReason] {
  const ma = metricsByKey.get(a.key);
  const mb = metricsByKey.get(b.key);
  if (!ma || !mb) {
    return [0, "insertion_order"];
  }
  if (ma.usable !== mb.usable) {
    return [ma.usable ? -1 : 1, "availability"];
  }
  if (!ma.usable && !mb.usable) {
    const au = ma.coolingUntil || Number.POSITIVE_INFINITY;
    const bu = mb.coolingUntil || Number.POSITIVE_INFINITY;
    return [
      au === bu ? 0 : au - bu,
      au === bu ? "insertion_order" : "cooldown_recovery",
    ];
  }
  if (ma.quotaEvidenceRank !== mb.quotaEvidenceRank) {
    return [ma.quotaEvidenceRank - mb.quotaEvidenceRank, "quota_evidence"];
  }
  if (ma.saturated !== mb.saturated) {
    return [ma.saturated ? 1 : -1, "session_headroom"];
  }
  // Per-model headroom, after overall session capacity: an account whose cap
  // for THIS model is nearly spent is demoted even when its 5h/7d are healthy.
  // No-op when neither account reports a scoped window for the model.
  if (ma.scopedSaturated !== mb.scopedSaturated) {
    return [ma.scopedSaturated ? 1 : -1, "scoped_headroom"];
  }
  if (ma.saturated && mb.saturated) {
    if (ma.sessionResetBucket !== mb.sessionResetBucket) {
      return [ma.sessionResetBucket - mb.sessionResetBucket, "session_reset"];
    }
    if (ma.weeklyReset !== mb.weeklyReset) {
      return [ma.weeklyReset - mb.weeklyReset, "weekly_reset"];
    }
  } else {
    if (ma.weeklyReset !== mb.weeklyReset) {
      return [ma.weeklyReset - mb.weeklyReset, "weekly_reset"];
    }
    if (ma.sessionResetBucket !== mb.sessionResetBucket) {
      return [ma.sessionResetBucket - mb.sessionResetBucket, "session_reset"];
    }
  }
  // Fill-first within the per-model allowance: finish off the account closest
  // to spending its cap for this model before opening a fresher one. Ranked
  // above overall weekly utilization because it is the tighter constraint.
  // Both sides must actually report a scoped window. Comparing a real
  // utilization against the "absent" sentinel would rank the account that has a
  // window above one that does not — and since only the account serving a model
  // gets that model's window, it would funnel all of a model's traffic onto
  // whichever account happened to serve it first.
  if (
    ma.scopedUsed !== null &&
    mb.scopedUsed !== null &&
    ma.scopedUsedForSort !== mb.scopedUsedForSort
  ) {
    return [mb.scopedUsedForSort - ma.scopedUsedForSort, "scoped_utilization"];
  }
  if (ma.weeklyUsedForSort !== mb.weeklyUsedForSort) {
    return [mb.weeklyUsedForSort - ma.weeklyUsedForSort, "weekly_utilization"];
  }
  if (primaryKey && (a.key === primaryKey) !== (b.key === primaryKey)) {
    return [a.key === primaryKey ? -1 : 1, "configured_primary"];
  }
  return [0, "insertion_order"];
}

function orderAccountsByQuotaWithMetrics(
  accounts: ProxyPassthroughAccount[],
  now: number,
  primaryKey: string | undefined,
  sessionSoftLimit: number,
  sessionResetToleranceMs: number,
  requestedModel?: string,
): {
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: Map<string, ProxyAccountSortMetrics>;
} {
  const metricsByKey = new Map(
    accounts.map((account) => [
      account.key,
      accountSortMetrics(
        account.key,
        now,
        sessionSoftLimit,
        sessionResetToleranceMs,
        requestedModel,
      ),
    ]),
  );
  return {
    orderedAccounts: [...accounts].sort(
      (a, b) => compareAccountRoutingFactors(a, b, metricsByKey, primaryKey)[0],
    ),
    metricsByKey,
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
 *   1. known healthy quota before unknown or ambiguous stale evidence. Quota
 *      discovery is handled by a lightweight usage GET, never a user request.
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
  requestedModel?: string,
): ProxyPassthroughAccount[] {
  return orderAccountsByQuotaWithMetrics(
    accounts,
    now,
    primaryKey,
    sessionSoftLimit,
    sessionResetToleranceMs,
    requestedModel,
  ).orderedAccounts;
}

function scheduleAdaptiveQuotaRefreshes(
  accounts: ProxyPassthroughAccount[],
  orderedAccounts: ProxyPassthroughAccount[],
  sessionSoftLimit: number,
  routingMetrics?: ReadonlyMap<string, ProxyAccountSortMetrics>,
): void {
  for (const account of accounts) {
    if (account.type !== "oauth") {
      continue;
    }
    const metrics =
      routingMetrics?.get(account.key) ??
      accountSortMetrics(
        account.key,
        Date.now(),
        sessionSoftLimit,
        getSessionResetToleranceMs(),
      );
    if (metrics.quotaFreshness === "unknown") {
      void refreshAccountQuotaInBackground(
        account,
        `startup-unknown:${account.key}`,
      ).catch((error) => {
        logger.debug(
          `[proxy] background quota discovery failed account=${account.label}: ${describeTransportError(error)}`,
        );
      });
    } else if (metrics.quotaFreshness === "refresh_due") {
      void refreshAccountQuotaInBackground(
        account,
        `ambiguous:${metrics.quotaLastUpdated ?? 0}`,
      ).catch((error) => {
        logger.debug(
          `[proxy] ambiguous quota refresh failed account=${account.label}: ${describeTransportError(error)}`,
        );
      });
    }
  }

  const active = orderedAccounts[0];
  const candidate = orderedAccounts[1];
  if (!active || !candidate || candidate.type !== "oauth") {
    return;
  }
  const activeQuota = accountRuntimeState.get(active.key)?.quota;
  if (!activeQuota) {
    return;
  }
  const sessionPrewarmAt = Math.max(0, sessionSoftLimit - 0.05);
  const needsPrewarm =
    (activeQuota.sessionUsed ?? 0) >= sessionPrewarmAt ||
    (activeQuota.weeklyUsed ?? 0) >= 0.9;
  if (!needsPrewarm) {
    return;
  }
  const trigger = [
    "handoff",
    active.key,
    activeQuota.sessionResetAt ?? 0,
    activeQuota.weeklyResetAt ?? 0,
    candidate.key,
  ].join(":");
  void refreshAccountQuotaInBackground(candidate, trigger).catch((error) => {
    logger.debug(
      `[proxy] quota handoff prewarm failed account=${candidate.label}: ${describeTransportError(error)}`,
    );
  });
}

function scheduleHandoffQuotaRefresh(
  current: ProxyPassthroughAccount,
  candidate: ProxyPassthroughAccount | undefined,
  handoffEpoch: number,
  sessionSoftLimit: number,
): void {
  if (!candidate || candidate.type !== "oauth") {
    return;
  }
  const metrics = accountSortMetrics(
    candidate.key,
    Date.now(),
    sessionSoftLimit,
    getSessionResetToleranceMs(),
  );
  if (metrics.quotaFreshness === "fresh") {
    return;
  }
  void refreshAccountQuotaInBackground(
    candidate,
    `hard-handoff:${current.key}:${handoffEpoch}:${candidate.key}`,
  ).catch((error) => {
    logger.debug(
      `[proxy] hard-handoff quota refresh failed account=${candidate.label}: ${describeTransportError(error)}`,
    );
  });
}

function buildRoutingDecision(args: {
  accounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>;
  evaluatedAt: number;
  strategy: "round-robin" | "fill-first";
  primaryKey: string | undefined;
  quotaRoutingEnabled: boolean;
  quotaOrdered: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
  rotationOffset: number;
}): ProxyAccountRoutingDecision | undefined {
  const {
    accounts,
    orderedAccounts,
    metricsByKey,
    evaluatedAt,
    strategy,
    primaryKey,
    quotaRoutingEnabled,
    quotaOrdered,
    sessionSoftLimit,
    sessionResetToleranceMs,
    rotationOffset,
  } = args;
  const sourceIndexes = new Map(
    accounts.map((account, index) => [account.key, index]),
  );
  const configuredPrimaryMatched =
    !!primaryKey && accounts.some((account) => account.key === primaryKey);
  const candidates: ProxyAccountRoutingCandidate[] = [];
  for (const account of orderedAccounts) {
    const metrics = metricsByKey.get(account.key);
    if (!metrics) {
      logger.warn(
        `[proxy] routing evidence omitted because metrics are missing for account=${account.label}`,
      );
      return undefined;
    }
    candidates.push({
      account: account.label,
      accountType: account.type,
      sourceIndex: sourceIndexes.get(account.key) ?? candidates.length,
      rank: candidates.length,
      configuredPrimary: !!primaryKey && account.key === primaryKey,
      usable: metrics.usable,
      saturated: metrics.saturated,
      quotaObserved: metrics.hasQuota,
      quotaStale: metrics.quotaStale,
      quotaFreshness: metrics.quotaFreshness,
      refreshNeeded: metrics.refreshNeeded,
      refreshReason: metrics.refreshReason,
      refreshInFlight: metrics.refreshInFlight,
      lastRefreshAttemptAt: metrics.lastRefreshAttemptAt,
      lastRefreshSuccessAt: metrics.lastRefreshSuccessAt,
      nextRefreshEligibleAt: metrics.nextRefreshEligibleAt,
      saturationKind: metrics.saturationKind,
      softLimitOverrideReason: metrics.softLimitOverrideReason,
      quotaLastUpdated: metrics.quotaLastUpdated,
      quotaAgeMs: metrics.quotaAgeMs,
      coolingActive: metrics.coolingActive,
      coolingReason: metrics.coolingReason,
      coolingUntil:
        metrics.coolingUntil > 0 && Number.isFinite(metrics.coolingUntil)
          ? metrics.coolingUntil
          : null,
      unifiedStatus: metrics.unifiedStatus,
      fallbackStatus: metrics.fallbackStatus,
      upgradePaths: metrics.upgradePaths,
      overageEligible: metrics.overageEligible,
      overageStatus: metrics.overageStatus,
      sessionStatus: metrics.sessionStatus,
      sessionUsed: metrics.sessionUsed,
      sessionResetAt: Number.isFinite(metrics.sessionReset)
        ? metrics.sessionReset
        : null,
      sessionResetBucket: Number.isFinite(metrics.sessionResetBucket)
        ? metrics.sessionResetBucket
        : null,
      weeklyStatus: metrics.weeklyStatus,
      weeklyUsed: metrics.weeklyUsed,
      weeklyResetAt: Number.isFinite(metrics.weeklyReset)
        ? metrics.weeklyReset
        : null,
      scopedModel: metrics.scopedModel,
      scopedStatus: metrics.scopedStatus,
      scopedUsed: metrics.scopedUsed,
      scopedResetAt: Number.isFinite(metrics.scopedReset)
        ? metrics.scopedReset
        : null,
    });
  }
  const initialAccount = orderedAccounts[0];
  let mode: ProxyAccountRoutingDecision["mode"];
  let selectionReason: ProxyAccountRoutingReason;
  if (orderedAccounts.length === 1) {
    mode = "single_account";
    selectionReason = "single_account";
  } else if (quotaOrdered) {
    mode = "quota";
    selectionReason = compareAccountRoutingFactors(
      orderedAccounts[0],
      orderedAccounts[1],
      metricsByKey,
      primaryKey,
    )[1];
  } else if (strategy === "round-robin") {
    mode = "round_robin";
    selectionReason = "round_robin";
  } else {
    mode = "primary";
    selectionReason =
      configuredPrimaryMatched && initialAccount?.key === primaryKey
        ? "configured_primary"
        : "insertion_order";
  }

  return {
    schemaVersion: 1,
    evaluatedAt: new Date(evaluatedAt).toISOString(),
    strategy,
    mode,
    selectionReason,
    quotaRoutingEnabled,
    quotaInputsUsed: quotaOrdered,
    sessionSoftLimit,
    sessionResetToleranceMs,
    configuredPrimaryAccount: primaryKey ?? null,
    configuredPrimaryMatched,
    rotationOffset,
    initialAccount: initialAccount?.label ?? "",
    candidates,
  };
}

function selectClaudeProxyAccountOrder(args: {
  enabledAccounts: ProxyPassthroughAccount[];
  accountStrategy: "round-robin" | "fill-first";
  primaryAccountKey: string | undefined;
  quotaRoutingEnabled: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
  requestedModel?: string;
  setRoutingDecision: (decision: ProxyAccountRoutingDecision) => void;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: Map<string, ProxyAccountSortMetrics>;
} {
  const {
    enabledAccounts,
    accountStrategy,
    primaryAccountKey,
    quotaRoutingEnabled,
    sessionSoftLimit,
    sessionResetToleranceMs,
    requestedModel,
    setRoutingDecision,
  } = args;
  let orderedAccounts = [...enabledAccounts];
  const evaluatedAt = Date.now();
  let metricsByKey: Map<string, ProxyAccountSortMetrics>;
  let rotationOffset = 0;
  const quotaOrdered =
    accountStrategy === "fill-first" &&
    orderedAccounts.length > 1 &&
    quotaRoutingEnabled;

  if (!quotaOrdered && accountStrategy === "fill-first") {
    // A hot-reloaded primary change must apply to this request.
    maybeResetPrimaryToHome(enabledAccounts, primaryAccountKey);
  }
  if (quotaOrdered) {
    const quotaOrder = orderAccountsByQuotaWithMetrics(
      enabledAccounts,
      evaluatedAt,
      primaryAccountKey,
      sessionSoftLimit,
      sessionResetToleranceMs,
      requestedModel,
    );
    orderedAccounts = quotaOrder.orderedAccounts;
    metricsByKey = quotaOrder.metricsByKey;
    if (logger.shouldLog("debug")) {
      logger.debug(
        `[proxy] quota-ordered fill sequence: ${orderedAccounts
          .map((account) => account.label)
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
      rotationOffset = primaryAccountIndex % orderedAccounts.length;
      if (accountStrategy === "round-robin") {
        primaryAccountIndex =
          (primaryAccountIndex + 1) % orderedAccounts.length;
      }
      if (rotationOffset > 0) {
        const head = orderedAccounts.splice(0, rotationOffset);
        orderedAccounts.push(...head);
      }
    }
    metricsByKey = new Map(
      enabledAccounts.map((account) => [
        account.key,
        accountSortMetrics(
          account.key,
          evaluatedAt,
          sessionSoftLimit,
          sessionResetToleranceMs,
          requestedModel,
        ),
      ]),
    );
  }

  const routingDecision = buildRoutingDecision({
    accounts: enabledAccounts,
    orderedAccounts,
    metricsByKey,
    evaluatedAt,
    strategy: accountStrategy,
    primaryKey: primaryAccountKey,
    quotaRoutingEnabled,
    quotaOrdered,
    sessionSoftLimit,
    sessionResetToleranceMs,
    rotationOffset,
  });
  if (routingDecision) {
    setRoutingDecision(routingDecision);
  }
  return { orderedAccounts, metricsByKey };
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
    modelRouter?.isAutoFallbackEnabled?.() ?? false,
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

  try {
    return await handleTranslatedJsonRequest({
      ctx,
      format: "claude",
      requestModel: body.model,
      parsed,
      attempts,
      tracer,
      requestStartTime,
      terminalFailureStatus: 502,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    logger.error(
      `[claude-proxy] Translated generation failed for ${body.model}: ${message}`,
    );
    const clientError = buildClaudeError(502, `Generation failed: ${message}`);
    const clientErrorBody = JSON.stringify(clientError);
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: clientErrorBody,
      bodySize: Buffer.byteLength(clientErrorBody, "utf8"),
      contentType: "application/json",
      account: "translation",
      accountType: "translation",
      responseStatus: 502,
      durationMs: Date.now() - requestStartTime,
    });
    return clientError;
  }
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
  logFinalRequest: ClaudeFinalRequestLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    clientRequestBody,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
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
    metadata: {
      upstreamMethod: "POST",
      upstreamUrl: "https://api.anthropic.com/v1/messages?beta=true",
    },
  });
  recordAttempt("passthrough", "passthrough");

  let response: Response;
  try {
    response = await fetchAnthropicUpstream(
      "https://api.anthropic.com/v1/messages?beta=true",
      {
        method: "POST",
        headers: upstreamHeaders,
        body: bodyStr,
        signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
      },
    );
  } catch (fetchErr) {
    const errMsg =
      fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    recordAttemptError("passthrough", "passthrough", 502);
    tracer?.setError("network_error", errMsg);
    upstreamSpan?.end();
    tracer?.end(502, Date.now() - requestStartTime);
    logFinalRequest(502, "passthrough", "passthrough", "network_error", errMsg);
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

  // Passthrough uses the caller's own credentials, so there is no account pool
  // to report — but the upstream quota headers are still the caller's real
  // limits. Published before the ok/non-ok split so a 429 carries them too.
  {
    const passthroughQuota = parseQuotaHeaders(response.headers, {
      model: body.model,
    });
    publishLimitHeaders(ctx, {
      upstreamHeaders: response.headers,
      quota: passthroughQuota,
      source: passthroughQuota ? "live" : "none",
      accountType: "passthrough",
      servedBy: "anthropic",
      attempt: 1,
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    recordAttemptError(
      "passthrough",
      "passthrough",
      response.status,
      response.status === 429 ? "quota" : undefined,
    );
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
    logFinalRequest(
      response.status,
      "passthrough",
      "passthrough",
      response.status === 429 ? "rate_limit_error" : "api_error",
      errorText,
    );
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
      logFinalRequest,
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
    logFinalRequest,
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
  logFinalRequest: ClaudeFinalRequestLogger;
}): Promise<Response> {
  const {
    ctx,
    bodyStr,
    response,
    tracer,
    requestStartTime,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
    logFinalRequest,
  } = args;
  const responseHeaders = { ...upstreamResponseHeaders };
  const { stream: clientCaptureStream, capture: clientCapture } =
    createRawStreamCapture();
  const responseBody = response.body;
  if (!responseBody) {
    recordAttemptError("passthrough", "passthrough", 502);
    throw new Error("Expected passthrough stream response body");
  }
  const trackedStream = trackUpstreamReadableStream(responseBody);
  let streamSource: ReadableStream<Uint8Array> = trackedStream.stream;
  let streamFinalized = false;
  const finalizeStream = (
    status: number,
    errorType?: string,
    errorMessage?: string,
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ): boolean => {
    if (streamFinalized) {
      return false;
    }
    streamFinalized = true;
    if (errorType === "stream_error") {
      recordAttemptError("passthrough", "passthrough", status);
    }
    logFinalRequest(
      status,
      "passthrough",
      "passthrough",
      errorType,
      errorMessage,
      usage,
    );
    return true;
  };

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

          finalizeStream(
            failure?.status ?? response.status,
            failure?.errorType,
            failure?.message,
            {
              inputTokens: data.usage.inputTokens,
              outputTokens: data.usage.outputTokens,
              cacheCreationTokens: data.usage.cacheCreationInputTokens,
              cacheReadTokens: data.usage.cacheReadInputTokens,
            },
          );
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
          if (streamFinalized) {
            return;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          capturedTracer.setError("stream_telemetry_error", message);
          capturedUpstreamSpan?.end();
          capturedTracer.end(500, Date.now() - requestStartTime);
          finalizeStream(500, "stream_telemetry_error", message);
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
        finalizeStream(
          failure?.status ?? response.status,
          failure?.errorType,
          failure?.message,
        );
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
          finalizeStream(
            failure?.status ?? response.status,
            failure?.errorType,
            failure?.message,
            {
              inputTokens: data.usage.inputTokens,
              outputTokens: data.usage.outputTokens,
              cacheCreationTokens: data.usage.cacheCreationInputTokens,
              cacheReadTokens: data.usage.cacheReadInputTokens,
            },
          );
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
          if (!streamFinalized) {
            finalizeStream(
              500,
              "stream_telemetry_error",
              error instanceof Error ? error.message : String(error),
            );
          }
        });
    } catch {
      // Streaming capture is best-effort; the tracked source still propagates
      // the transport failure to the client.
      trackedStream.outcome.then((outcome) => {
        const failure = getStreamFailureDetails(outcome);
        finalizeStream(
          failure?.status ?? response.status,
          failure?.errorType,
          failure?.message,
        );
      });
    }
  }

  const clientStream = streamSource.pipeThrough(clientCaptureStream);
  return new Response(clientStream, {
    status: response.status,
    // Upstream headers first, then the proxy's own — passthrough already
    // forwarded everything Anthropic sent, so this only adds the x-neurolink-*
    // fields the client cannot derive on its own.
    headers: {
      ...responseHeaders,
      ...((ctx.responseHeaders ?? {}) as Record<string, string>),
    },
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
  logFinalRequest: ClaudeFinalRequestLogger;
}): Promise<unknown> {
  const {
    bodyStr,
    response,
    tracer,
    requestStartTime,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
    logFinalRequest,
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

    logFinalRequest(
      response.status,
      "passthrough",
      "passthrough",
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
    tracer?.end(response.status, Date.now() - requestStartTime);
    logFinalRequest(response.status, "passthrough", "passthrough");
  }

  return responseJson;
}

/**
 * Narrow the pool to what the current borrowed request's grant may use.
 *
 * A no-op — and one map lookup — for the node's own traffic, which is every
 * request on a proxy that shares nothing.
 *
 * When the filter empties the pool the refusal must be share-shaped, not the
 * generic "no credentials" 401: the borrower has perfectly good credentials,
 * the lender is simply holding capacity back. Saying it precisely is what lets
 * the borrower fall through to another peer instead of re-authenticating.
 */
async function applyShareAccountGates(args: {
  accounts: ProxyPassthroughAccount[];
}): Promise<{
  accounts: ProxyPassthroughAccount[];
  refusal?: DeferredClaudeAccountFailure;
}> {
  const share = getShareContext();
  if (!share) {
    return { accounts: args.accounts };
  }
  if (args.accounts.length === 0) {
    // Nothing to withhold. Claiming a share refusal here would tell the
    // borrower the lender is holding capacity back, when in fact the lender has
    // no usable accounts at all — a different problem with a different fix,
    // and the existing no-credentials path already words it correctly.
    return { accounts: args.accounts };
  }

  const now = Date.now();
  const views: ProxyShareAccountView[] = await Promise.all(
    args.accounts.map(async (account) => {
      const quota = getOrCreateRuntimeState(account.key).quota;
      const sessionResetAt = resetEpochToMs(quota?.sessionResetAt, now) ?? null;
      const weeklyResetAt = resetEpochToMs(quota?.weeklyResetAt, now) ?? null;
      const borrowed = await readShareWindowUsage(
        share.grantId,
        account.key,
        sessionResetAt,
        weeklyResetAt,
      );
      return {
        accountKey: account.key,
        sessionUsed: quota?.sessionUsed ?? null,
        weeklyUsed: quota?.weeklyUsed ?? null,
        sessionResetAt,
        weeklyResetAt,
        borrowedSessionFraction: borrowed.sessionFraction,
        borrowedWeeklyFraction: borrowed.weeklyFraction,
      };
    }),
  );

  const grant = await getShareGrant(share.grantId);
  if (!grant) {
    return { accounts: args.accounts };
  }
  // Pool-wide first: how much of the pool this grant has already taken. The
  // denominator is the accounts the grant may actually draw on — an
  // `--accounts`-restricted grant divides by those, not by every credential
  // this node holds, or its ceiling would scale with the size of a pool it
  // cannot reach.
  const poolUsage = await readSharePoolWindowUsage(
    share.grantId,
    accountsInGrantScope(grant.gates, views).inScope,
  );
  const decision = filterAccountsForGrant(grant, views, now, poolUsage);
  const allowed = new Set(decision.allowed);
  const survivors = args.accounts.filter((account) => allowed.has(account.key));

  if (survivors.length > 0) {
    return { accounts: survivors };
  }

  const reason = summarizeAccountExclusions(decision.excluded);
  const refusal = buildShareRefusal(reason, {
    status: shareRefusalStatus(reason),
    grant,
    retryAfterSeconds: earliestShareRecoverySeconds(views, now),
  });
  logger.always(
    `[proxy] share ${share.peerLabel} withheld: ${reason} (${decision.excluded.length} accounts)`,
  );
  return {
    accounts: [],
    refusal: {
      status: refusal.status,
      message: refusal.body.error.message,
      errorType: refusal.body.error.type,
      responseHeaders: refusal.headers,
    },
  };
}

/**
 * Withhold credentials a lender provisioned here whose lease has lapsed.
 *
 * A complete-mode credential keeps working while the lender is unreachable —
 * that is what it is for — but only for as long as the lease allows. Past that,
 * the honest thing is to stop using it, and the borrower is the only party in a
 * position to do so.
 *
 * A no-op for a node with no resident grants, which is every node until someone
 * provisions one.
 */
async function dropExpiredResidentAccounts(
  accounts: ProxyPassthroughAccount[],
): Promise<{
  accounts: ProxyPassthroughAccount[];
  withheld: Array<{ label: string; reason: string }>;
}> {
  const survivors: ProxyPassthroughAccount[] = [];
  const withheld: Array<{ label: string; reason: string }> = [];
  for (const account of accounts) {
    const verdict = await evaluateResidentAccount(account.key);
    if (!verdict) {
      survivors.push(account);
      continue;
    }
    if (!isLeaseRefusal(verdict)) {
      survivors.push(account);
      continue;
    }
    logger.always(
      `[proxy] withholding leased account=${account.label}: ${verdict.reason}`,
    );
    withheld.push({ label: account.label, reason: verdict.reason });
  }
  return { accounts: survivors, withheld };
}

/**
 * Enforce a lender's model allowlist on the credential they provisioned here.
 *
 * A live share checks this at the lender's gate. A complete share has no gate in
 * the request path, so the borrower has to hold the line itself — otherwise a
 * grant that says "Sonnet only" becomes "anything" the moment it is provisioned,
 * which is exactly the property that would make complete mode unshippable.
 */
async function dropLeaseDisallowedAccounts(
  accounts: ProxyPassthroughAccount[],
  requestedModel: string | undefined,
): Promise<{
  accounts: ProxyPassthroughAccount[];
  withheld: Array<{ label: string; reason: string }>;
}> {
  const survivors: ProxyPassthroughAccount[] = [];
  const withheld: Array<{ label: string; reason: string }> = [];
  const now = Date.now();
  for (const account of accounts) {
    const resident = await getResidentGrantForAccount(account.key);
    if (!resident) {
      survivors.push(account);
      continue;
    }
    const gates = resident.lease.gates;

    // Request-level gates first: they do not depend on any window figure, and
    // saying "this share does not cover Opus" is more useful than saying the
    // slice is spent when both are true.
    if (!isModelAllowed(gates.models, requestedModel)) {
      logger.always(
        `[proxy] leased account=${account.label} does not cover model ${sanitizeForLog(requestedModel ?? "unknown")}`,
      );
      withheld.push({ label: account.label, reason: "model_not_allowed" });
      continue;
    }
    if (gates.schedule && !isWithinSchedule(gates.schedule, now)) {
      logger.always(
        `[proxy] leased account=${account.label} is outside its allowed hours`,
      );
      withheld.push({ label: account.label, reason: "out_of_window" });
      continue;
    }

    // Account-level gates through the lender's own evaluator, on the lender's
    // own numbers. A resident credential is minted from exactly one account, so
    // the pool of the pool-wide slice is that one account and the formula
    // collapses to the per-account case — which is precisely why the same code
    // can serve both sides.
    const quota = getOrCreateRuntimeState(account.key).quota;
    const sessionResetAt = resetEpochToMs(quota?.sessionResetAt, now) ?? null;
    const weeklyResetAt = resetEpochToMs(quota?.weeklyResetAt, now) ?? null;
    const borrowed = await readShareWindowUsage(
      resident.grantId,
      account.key,
      sessionResetAt,
      weeklyResetAt,
    );
    const view: ProxyShareAccountView = {
      accountKey: account.key,
      sessionUsed: quota?.sessionUsed ?? null,
      weeklyUsed: quota?.weeklyUsed ?? null,
      sessionResetAt,
      weeklyResetAt,
      borrowedSessionFraction: borrowed.sessionFraction,
      borrowedWeeklyFraction: borrowed.weeklyFraction,
    };
    const poolUsage = await readSharePoolWindowUsage(resident.grantId, [view]);
    // `gates.accounts` names the *lender's* accounts and means nothing here —
    // the credential this lease governs is the only account in scope by
    // construction. Carrying it over would filter the account out by its local
    // label and withhold every leased request.
    const { accounts: _lenderAccounts, ...localGates } = gates;
    const decision = filterAccountsForGrant(
      leaseAsGrant(resident, localGates),
      [view],
      now,
      poolUsage,
    );
    if (decision.allowed.length === 0) {
      const reason = summarizeAccountExclusions(decision.excluded);
      logger.always(
        `[proxy] withholding leased account=${account.label}: ${reason}`,
      );
      withheld.push({ label: account.label, reason });
      continue;
    }
    survivors.push(account);
  }
  return { accounts: survivors, withheld };
}

/**
 * Dress a lease up as the grant its gates came from.
 *
 * The borrower has no grant record — only the signed projection of one — but the
 * admission evaluator takes a grant. Rebuilding one here means both sides run
 * the identical gate code rather than a borrower-side reimplementation that
 * drifts from the lender's the first time a gate is added.
 */
function leaseAsGrant(
  resident: ProxyResidentGrant,
  gates: ProxyShareGates,
): ProxyShareGrant {
  const snapshot = resident.lease.entitlementSnapshot;
  return {
    schemaVersion: 1,
    id: resident.grantId,
    peerLabel: resident.lease.peerLabel,
    // Never compared: the lease's own signature is what authenticates it, and
    // it was checked before this account was allowed to reach here at all.
    tokenHash: "",
    tokenSalt: "",
    level: "complete",
    state: "active",
    entitlement:
      snapshot === "unlimited"
        ? { ledger: "unlimited" }
        : { ledger: "coins", coins: snapshot },
    gates,
    createdAt: resident.lease.issuedAt,
    updatedAt: resident.lease.issuedAt,
  };
}

/**
 * Attribute a window movement to the grant that caused it.
 *
 * A no-op for the node's own traffic. Fire-and-forget: bookkeeping must never
 * delay or fail a response the borrower is already receiving.
 */
function recordBorrowedWindowDelta(
  accountKey: string,
  before: AccountQuota | undefined,
  after: AccountQuota,
): void {
  const now = Date.now();
  const observe = (grantId: string): void => {
    void recordShareWindowDelta({
      grantId,
      accountKey,
      sessionBefore: before?.sessionUsed ?? null,
      sessionAfter: after.sessionUsed,
      sessionResetAt: resetEpochToMs(after.sessionResetAt, now) ?? null,
      weeklyBefore: before?.weeklyUsed ?? null,
      weeklyAfter: after.weeklyUsed,
      weeklyResetAt: resetEpochToMs(after.weeklyResetAt, now) ?? null,
    });
  };

  const share = getShareContext();
  if (share) {
    observe(share.grantId);
    return;
  }
  // Not borrowed *from* us — but it may be borrowed *by* us. A leased account's
  // windows move because this node spent them, and the lease's slice ceiling has
  // nothing to measure unless that movement is recorded against the grant. The
  // lender keeps the same book on its side; both read it with the same formula.
  void getResidentGrantForAccount(accountKey)
    .then((resident) => {
      if (resident) {
        observe(resident.grantId);
      }
    })
    .catch(() => {
      // Bookkeeping only — never fail a response the client already has.
    });
}

/**
 * Charge a completed borrowed request against its grant.
 *
 * A no-op for the node's own traffic, and fire-and-forget for the same reason
 * as the window delta above.
 */
/**
 * Bill a request served by a credential a lender provisioned here.
 *
 * The mirror of `settleBorrowedRequest`: that one charges a borrower on the
 * lender's node, this one records what *this* node owes a lender whose
 * credential it is holding. Without it a complete-mode heartbeat reports zero
 * forever and the lender's balance never moves.
 */
function recordLeasedAccountSpend(
  accountLabel: string,
  model: string | undefined,
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  },
): void {
  const coins = usageToCoins(
    {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      ...(usage.cacheCreationTokens !== undefined
        ? { cacheCreationTokens: usage.cacheCreationTokens }
        : {}),
      ...(usage.cacheReadTokens !== undefined
        ? { cacheReadTokens: usage.cacheReadTokens }
        : {}),
    },
    model,
  );
  void recordResidentSpend(accountLabel, coins).catch(() => {
    // Bookkeeping only — never fail a response the client already has.
  });
}

/**
 * Charge a served non-streaming response to whichever ledger owns the account.
 *
 * Both sides are no-ops unless the account is actually borrowed or leased, so
 * this is safe to call on every response — which is the point: gating it on
 * anything else is how it came to be skipped.
 */
function settleFromResponseUsage(
  account: ProxyPassthroughAccount,
  responseJson: unknown,
): void {
  if (!responseJson || typeof responseJson !== "object") {
    return;
  }
  const usage = (responseJson as Record<string, unknown>).usage as
    | Record<string, number>
    | undefined;
  if (!usage) {
    return;
  }
  const model = servedModelName(responseJson);
  const tokens = {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  };
  settleBorrowedRequest(account.key, model, tokens);
  recordLeasedAccountSpend(account.label, model, tokens);
}

function settleBorrowedRequest(
  accountKey: string,
  model: string | undefined,
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  },
): void {
  const share = getShareContext();
  if (!share) {
    return;
  }
  void settleShareUsage({
    grantId: share.grantId,
    accountKey,
    model: model ?? share.model,
    usage: {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      ...(usage.cacheCreationTokens !== undefined
        ? { cacheCreationTokens: usage.cacheCreationTokens }
        : {}),
      ...(usage.cacheReadTokens !== undefined
        ? { cacheReadTokens: usage.cacheReadTokens }
        : {}),
    },
    ...(share.holdId ? { holdId: share.holdId } : {}),
  });
}

/**
 * Remove what a borrower has no business seeing.
 *
 * `x-neurolink-account` carries the lender's account label, which for an OAuth
 * account is their email address; the pool counters describe the shape of a
 * pool that is not the borrower's. The borrower's own routing needs the quota
 * and grant headers, and nothing else here.
 *
 * A no-op for the node's own traffic, where these headers are exactly the
 * diagnostics the operator wants.
 */
function redactHeadersForBorrower(
  headers: Record<string, string>,
): Record<string, string> {
  if (!getShareContext()) {
    return headers;
  }
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      lower === "x-neurolink-account" ||
      lower === "x-neurolink-account-type"
    ) {
      continue;
    }
    if (lower.startsWith("x-neurolink-pool-")) {
      continue;
    }
    redacted[key] = value;
  }
  return redacted;
}

/**
 * Record a heartbeat against the account's real utilization, and pause the grant
 * when the two have disagreed too many times in a row.
 *
 * The lender's own request count on that account is read from its usage stats:
 * an interval this node also used is not evidence about anybody, so the audit
 * abstains rather than guessing.
 */
async function auditCompleteShareHeartbeat(
  grant: ProxyShareGrant,
  reportedCoins: number,
): Promise<{ paused: boolean; detail: string }> {
  const accountLabel = grant.provisionedAccount;
  if (!accountLabel) {
    // Nothing to audit against: the grant predates provisioning or was attached
    // by hand. Say nothing rather than inventing a baseline.
    return { paused: false, detail: "no provisioned account recorded" };
  }
  const state = accountRuntimeState.get(`anthropic:${accountLabel}`);
  const stats = getAccountStats(accountLabel, "oauth");
  const { verdict, shouldPause } = await recordAuditObservation({
    grantId: grant.id,
    accountLabel,
    lenderRequestsTotal: stats?.successCount ?? 0,
    observation: {
      at: Date.now(),
      sessionUsed: state?.quota?.sessionUsed ?? null,
      weeklyUsed: state?.quota?.weeklyUsed ?? null,
      reportedCoins,
      // Replaced with the per-interval delta by the recorder.
      lenderRequests: 0,
    },
  });

  if (shouldPause) {
    await setShareGrantState(grant.id, "paused");
    return {
      paused: true,
      detail: verdict.drifted ? verdict.detail : "repeated unexplained usage",
    };
  }
  return {
    paused: false,
    detail: verdict.drifted ? verdict.detail : "consistent",
  };
}

/**
 * Apply a complete-mode borrower's self-reported spend to their balance.
 *
 * Deliberately trusting at this layer and deliberately verified elsewhere: the
 * lender cannot see a resident credential's traffic directly, but it can see the
 * account's true utilization through the usage API, so under-reporting shows up
 * as drift rather than as free capacity.
 */
async function recordReportedResidentSpend(
  grant: ProxyShareGrant,
  coins: number,
): Promise<void> {
  await debitShareGrantCoins(grant.id, coins);
}

/**
 * Compare a presented secret against the stored one without leaking where they
 * diverge. Hand-rolled rather than `crypto.timingSafeEqual` for the same reason
 * as `shareGrants.digestsMatch`: this module is reachable from a build whose
 * `node:crypto` stub does not carry it.
 */
function secretsMatch(expected: string, presented: string): boolean {
  if (expected.length !== presented.length || expected.length === 0) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ presented.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * Peer wire protocol version. Bumped when a borrower would misread an older
 * node's answers — not when a field is added, which every version tolerates.
 */
const PEER_PROTOCOL_VERSION = 1;

/** What this node can do for a peer, so a borrower need not probe to find out. */
const PEER_CAPABILITIES = ["live", "complete", "handshake", "limits"] as const;

/**
 * What a borrower may know about the lender's pool.
 *
 * Deliberately shaped as "what is left for *you*", never "what the lender has":
 * no labels, no per-account figures, no counts that would let a borrower infer
 * how many credentials sit behind the tunnel. Enough to route on and nothing
 * more, which is what `/peer/limits` is for.
 */
async function buildPeerLimitsSnapshot(
  grant: ProxyShareGrant,
  allowlist: AccountAllowlist | undefined,
): Promise<ProxyPeerLimitsSnapshot> {
  const now = Date.now();
  const accounts = await listAnthropicAccountsForUsage(allowlist);
  const views: ProxyShareAccountView[] = await Promise.all(
    accounts.map(async (account) => {
      const quota = getOrCreateRuntimeState(account.key).quota;
      const sessionResetAt = resetEpochToMs(quota?.sessionResetAt, now) ?? null;
      const weeklyResetAt = resetEpochToMs(quota?.weeklyResetAt, now) ?? null;
      const borrowed = await readShareWindowUsage(
        grant.id,
        account.key,
        sessionResetAt,
        weeklyResetAt,
      );
      return {
        accountKey: account.key,
        sessionUsed: quota?.sessionUsed ?? null,
        weeklyUsed: quota?.weeklyUsed ?? null,
        sessionResetAt,
        weeklyResetAt,
        borrowedSessionFraction: borrowed.sessionFraction,
        borrowedWeeklyFraction: borrowed.weeklyFraction,
      };
    }),
  );

  const inScope = accountsInGrantScope(grant.gates, views).inScope;
  const poolUsage = await readSharePoolWindowUsage(grant.id, inScope);
  const decision = filterAccountsForGrant(grant, views, now, poolUsage);
  const left = (ceiling: number | undefined, taken: number): number | null =>
    ceiling === undefined ? null : Math.max(0, ceiling - taken * 100);

  return {
    grantState: grant.state,
    level: grant.level,
    ledger: grant.entitlement.ledger,
    ...(grant.entitlement.ledger === "coins"
      ? { remainingCoins: Math.max(0, Math.floor(availableCoins(grant))) }
      : {}),
    servable: decision.allowed.length > 0,
    ...(decision.allowed.length === 0 && decision.excluded.length > 0
      ? { withheldReason: summarizeAccountExclusions(decision.excluded) }
      : {}),
    sliceLeftPct: {
      session: left(
        grant.gates.maxSlice?.session5hPct,
        poolUsage.sessionFraction,
      ),
      weekly: left(grant.gates.maxSlice?.weekly7dPct, poolUsage.weeklyFraction),
    },
    ...(decision.allowed.length === 0
      ? (() => {
          const retry = earliestShareRecoverySeconds(views, now);
          return retry === undefined ? {} : { retryAfterSeconds: retry };
        })()
      : {}),
  };
}

/**
 * Resolve the share token on a `/peer/*` call.
 *
 * These routes sit outside the request gate — they consume no capacity, and
 * running them through it would spend the grant's rate allowance on a call that
 * exists to ask whether spending is possible — so each one authenticates itself.
 */
/**
 * Narrow a peer-auth outcome to its refusing half.
 *
 * Explicit rather than `!auth.ok`, because one of the package's build steps
 * compiles this file without `strictNullChecks`, where TypeScript will not
 * narrow a boolean discriminant at all — the same reason `isShareRefusal` and
 * `isLeaseRefusal` exist.
 */
function isPeerAuthRefusal(
  outcome: ProxyPeerAuthOutcome,
): outcome is { ok: false; body: ProxyShareRefusalResponse["body"] } {
  return !outcome.ok;
}

async function authenticatePeerRequest(
  headers: Record<string, string | undefined>,
): Promise<ProxyPeerAuthOutcome> {
  const token = extractShareToken(headers);
  if (!token) {
    return {
      ok: false,
      body: buildShareRefusal("missing_token", { status: 401 }).body,
    };
  }
  const grant = await resolveShareToken(token);
  if (!grant) {
    return {
      ok: false,
      body: buildShareRefusal("unknown_token", { status: 401 }).body,
    };
  }
  return { ok: true, grant };
}

/** The model an upstream JSON response says it served, when it says so. */
function servedModelName(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const model = (payload as Record<string, unknown>).model;
  return typeof model === "string" ? model : undefined;
}

/**
 * Soonest window reset across the pool, in seconds.
 *
 * A withheld borrower's honest answer to "when should I come back" is when the
 * lender's tightest window turns over — anything sooner is a guess that invites
 * a retry storm.
 */
function earliestShareRecoverySeconds(
  views: readonly ProxyShareAccountView[],
  now: number,
): number | undefined {
  const resets = views
    .flatMap((view) => [view.sessionResetAt, view.weeklyResetAt])
    .filter((value): value is number => value !== null && value > now);
  if (resets.length === 0) {
    return undefined;
  }
  return Math.max(1, Math.round((Math.min(...resets) - now) / 1000));
}

async function loadClaudeProxyAccounts(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  accountStrategy: "round-robin" | "fill-first";
  primaryAccountKey?: string;
  accountAllowlist?: AccountAllowlist;
  quotaRoutingEnabled?: boolean;
  sessionSoftLimit?: number;
  sessionResetToleranceMs?: number;
  setRoutingDecision: (decision: ProxyAccountRoutingDecision) => void;
}): Promise<
  LoadedClaudeAccountContext | { failure: DeferredClaudeAccountFailure }
> {
  const {
    ctx,
    body,
    accountStrategy,
    primaryAccountKey,
    accountAllowlist,
    quotaRoutingEnabled = isQuotaRoutingEnabled(),
    sessionSoftLimit = getSessionSoftLimit(),
    sessionResetToleranceMs = getSessionResetToleranceMs(),
    setRoutingDecision,
  } = args;
  const fs = await import("fs");
  const os = await import("os");
  const accounts: ProxyPassthroughAccount[] = [];
  const legacyCredPath = `${(os as typeof import("os")).homedir()}/.neurolink/anthropic-credentials.json`;
  const { tokenStore } = await import("../../auth/tokenStore.js");
  const persistedCooldowns = await loadAccountCooldowns();

  if (!startupPruneDone) {
    startupPrune ??= tokenStore
      .pruneExpired()
      .then(() => {
        startupPruneDone = true;
      })
      .finally(() => {
        startupPrune = undefined;
      });
    await startupPrune;
  }

  const inventory = await tokenStore.getProviderSnapshot();
  const compoundKeys = Object.keys(inventory).filter((key) =>
    key.startsWith("anthropic:"),
  );
  // Tracked so an empty pool can name the real cause: "every account is
  // entitlement-blocked" is a different problem from "no credentials".
  const entitlementBlockedLabels: string[] = [];
  let skippedDisabledCount = 0;
  let skippedForOtherReasons = 0;
  for (const key of compoundKeys) {
    if (!isAccountAllowed(key, accountAllowlist)) {
      logger.debug(
        `[proxy] skipping account=${key} (not in account allowlist)`,
      );
      continue;
    }
    if (inventory[key].disabled) {
      const existingState = getOrCreateRuntimeState(key);
      const disabledReason = inventory[key].disabledReason;
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
        if (disabledReason === "entitlement_blocked") {
          entitlementBlockedLabels.push(key.split(":")[1] ?? key);
        }
        skippedDisabledCount += 1;
        continue;
      }
    }

    const tokens = inventory[key].tokens;
    if (!tokens) {
      skippedForOtherReasons += 1;
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
      const refreshed = await refreshTokenFromLatest(tempAccount, {
        providerKey: key,
      });
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
    // Once every account has been disabled on entitlement the loop never runs,
    // so this is the only place the client can learn why. A flat 401 here would
    // send the user to re-authenticate, which cannot fix an org policy.
    if (
      entitlementBlockedLabels.length > 0 &&
      entitlementBlockedLabels.length === skippedDisabledCount &&
      skippedForOtherReasons === 0
    ) {
      const entitlementMessage = buildEntitlementErrorMessage({
        status: 403,
        accounts: entitlementBlockedLabels,
        message: "OAuth authentication is not allowed for this organization.",
        errorCode: "oauth_not_allowed_for_organization",
      });
      return {
        failure: {
          status: 403,
          message: entitlementMessage,
          errorType: "permission_error",
        },
      };
    }
    const noCredentialsMessage = accountAllowlist
      ? "No allowed Anthropic credentials are currently available"
      : compoundKeys.length > 0
        ? "Configured Anthropic accounts are disabled or unavailable"
        : "No Anthropic credentials found";
    return {
      failure: {
        status: 401,
        message: noCredentialsMessage,
        errorType: "authentication_error",
      },
    };
  }

  for (const account of accounts) {
    reconcileEligibleAccountRuntimeState(account);
  }

  await seedRuntimeQuotasFromDisk(accounts);

  const eligibleAccounts = accounts.filter((account) => {
    return !getOrCreateRuntimeState(account.key).permanentlyDisabled;
  });

  // Peer-sharing account gates. A borrowed request may only draw on accounts
  // its grant allows, that still leave the lender's reserved headroom intact,
  // and whose window slice the grant has not already spent. These are account
  // properties rather than request properties, which is why they filter the
  // pool here instead of refusing at the inbound gate.
  const leaseExpiryFiltered =
    await dropExpiredResidentAccounts(eligibleAccounts);
  const leaseScopeFiltered = await dropLeaseDisallowedAccounts(
    leaseExpiryFiltered.accounts,
    typeof body.model === "string" ? body.model : undefined,
  );
  const leaseFiltered = {
    accounts: leaseScopeFiltered.accounts,
    withheld: [...leaseExpiryFiltered.withheld, ...leaseScopeFiltered.withheld],
  };
  const leasedAccounts = leaseFiltered.accounts;
  if (leasedAccounts.length === 0 && leaseFiltered.withheld.length > 0) {
    // Every account here belongs to a lender whose lease has lapsed. The
    // re-authentication message below would be actively wrong — it would send
    // the borrower to OAuth into somebody else's account, which cannot work and
    // should not be attempted. Say what actually happened instead.
    const detail = leaseFiltered.withheld
      .map((entry) => `${entry.label} (${entry.reason})`)
      .join(", ");
    // Scope and lifetime need different advice. Telling someone to re-sync when
    // the lender simply never lent them this model sends them in circles.
    const scopeOnly = leaseFiltered.withheld.every(
      (entry) => entry.reason === "model_not_allowed",
    );
    const leaseMessage = scopeOnly
      ? `Borrowed account(s) do not cover the requested model: ${detail}. ` +
        `Ask the lender to widen the share, or use a model it allows.`
      : `Borrowed account(s) are no longer covered by a lease: ${detail}. ` +
        `Run 'neurolink proxy peer sync' to check in with the lender, or ask them to resume the share.`;
    return {
      failure: {
        status: 403,
        message: leaseMessage,
        errorType: "permission_error",
      },
    };
  }

  const shareFiltered = await applyShareAccountGates({
    accounts: leasedAccounts,
  });
  if (shareFiltered.refusal) {
    return { failure: shareFiltered.refusal };
  }
  const enabledAccounts = shareFiltered.accounts;

  if (enabledAccounts.length === 0) {
    const reauthMsg = formatReauthMessage(
      accounts.map((account) => account.label),
    );
    return {
      failure: {
        status: 401,
        message: reauthMsg,
        errorType: "authentication_error",
      },
    };
  }

  const { orderedAccounts, metricsByKey } = selectClaudeProxyAccountOrder({
    enabledAccounts,
    accountStrategy,
    primaryAccountKey,
    quotaRoutingEnabled,
    sessionSoftLimit,
    sessionResetToleranceMs,
    requestedModel: typeof body.model === "string" ? body.model : undefined,
    setRoutingDecision,
  });
  if (
    accountStrategy === "fill-first" &&
    quotaRoutingEnabled &&
    enabledAccounts.length > 1
  ) {
    scheduleAdaptiveQuotaRefreshes(
      enabledAccounts,
      orderedAccounts,
      sessionSoftLimit,
      metricsByKey,
    );
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
  /**
   * Idle timeout for the fallback stream, in ms. Defaults to
   * FALLBACK_STREAM_IDLE_TIMEOUT_MS.
   *
   * Injectable purely so a test can drive the timeout path in milliseconds
   * instead of two minutes. The alternative the coverage used before was
   * patching `globalThis.setTimeout` to fire every timer at 0ms for the
   * duration of an await — which rewrites the delay of ANY timer created in
   * that window, not just this one's, inside a 280-case suite sharing a single
   * process. That is not a hypothetical: an attempt to measure the patched
   * case with its own `setTimeout`-based watchdog had the watchdog rewritten
   * out from under it and reported an instant false hang.
   */
  idleTimeoutMs?: number;
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
    idleTimeoutMs = FALLBACK_STREAM_IDLE_TIMEOUT_MS,
  } = args;
  const fallbackAbortController = new AbortController();
  let streamResult: StreamResult;
  try {
    streamResult = await withTimeout(
      ctx.neurolink.stream({
        ...options,
        abortSignal: fallbackAbortController.signal,
      }),
      idleTimeoutMs,
      `Fallback ${providerLabel} initialization timed out after ${idleTimeoutMs}ms`,
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
          idleTimeoutMs,
          `Fallback ${providerLabel} stream timed out after ${idleTimeoutMs}ms of inactivity`,
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
        `[proxy] retrying fallback=${args.providerLabel} after transient network error (${retry + 1}/${MAX_FALLBACK_NETWORK_RETRIES}) in ${delayMs}ms: ${redactProviderErrorMessage(describeTransportError(error))}`,
      );
      await sleep(delayMs);
    }
  }
  throw lastError;
}

/**
 * Run the configured `codex` fallback through the native pooled Codex route.
 *
 * Streaming clients receive incremental output. Once the stream is returned,
 * failures are terminal SSE errors; only pre-output failures may try a fallback.
 */
async function executeClaudeCodexFallback(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  model: string;
  reasoningEffort?: CodexReasoningEffort;
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
}): Promise<unknown> {
  const {
    ctx,
    body,
    model,
    reasoningEffort,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
  } = args;
  const codexCtx: ServerContext = {
    ...ctx,
    requestId: `${ctx.requestId}:codex-fallback`,
    method: "POST",
    path: "/backend-api/codex/responses",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    query: {},
    params: {},
    body: convertClaudeRequestToCodex(body, model, reasoningEffort),
    metadata: { ...ctx.metadata, "neurolink.codexFallback": true },
    // Keep the child attribution isolated until its stream has passed
    // validation. A failed Codex attempt must not look like a served request.
    responseHeaders: {},
  };
  const codexResponse = await handleCodexResponsesRequest(codexCtx);
  const codexHeaders = { ...(codexCtx.responseHeaders ?? {}) };

  if (body.stream) {
    const bridge = await createCodexFallbackStream(codexResponse, body.model);
    ctx.responseHeaders ??= {};
    Object.assign(ctx.responseHeaders, redactHeadersForBorrower(codexHeaders));
    const account = codexHeaders["x-neurolink-account"] ?? "";
    const accountType =
      codexHeaders["x-neurolink-account-type"] ?? "codex-oauth";
    let settled = false;
    let captured = "";
    let responseBytes = 0;
    const finish = (
      status: number,
      result?: CodexFallbackResult,
      errorType?: string,
      message?: string,
    ): void => {
      if (settled) {
        return;
      }
      settled = true;
      ctx.abortSignal?.removeEventListener("abort", cancel);
      if (status >= 400) {
        ctx.metadata.terminalErrorType = errorType;
      }
      tracer?.end(status, Date.now() - requestStartTime);
      logFinalRequest(status, account, accountType, errorType, message, {
        inputTokens: result?.usage?.input,
        outputTokens: result?.usage?.output,
        cacheCreationTokens: result?.usage?.cacheCreationTokens,
        cacheReadTokens: result?.usage?.cacheReadTokens,
      });
      recordFallbackAttempt({
        provider: "codex",
        model,
        status: status < 400 ? "success" : "failure",
        durationMs: Date.now() - requestStartTime,
        ...(message ? { errorMessage: message } : {}),
      });
      logProxyBody({
        phase: "client_response",
        contentType: "text/event-stream",
        body: captured,
        bodySize: responseBytes,
        responseStatus: status,
        durationMs: Date.now() - requestStartTime,
      });
    };
    const cancel = (): void => {
      finish(
        499,
        undefined,
        "client_cancelled",
        "Client cancelled Codex fallback stream",
      );
      void bridge.cancel();
    };
    ctx.abortSignal?.addEventListener("abort", cancel, { once: true });
    registerProxyResponseObserver(ctx.metadata, {
      onTerminal: ({ outcome }) => {
        if (outcome === "client_cancelled") {
          cancel();
        } else if (outcome === "stream_error") {
          finish(
            502,
            undefined,
            "stream_error",
            "Codex fallback stream failed",
          );
          void bridge.cancel();
        }
      },
    });
    const capture = (frame: string): string => {
      responseBytes += Buffer.byteLength(frame);
      if (captured.length < 1024 * 1024) {
        captured += frame.slice(0, 1024 * 1024 - captured.length);
      }
      return frame;
    };
    async function* relay(): AsyncGenerator<string> {
      try {
        if (ctx.abortSignal?.aborted) {
          cancel();
          return;
        }
        let pending = bridge.frames.next();
        while (!settled) {
          let timer: NodeJS.Timeout | undefined;
          const heartbeat = new Promise<null>((resolve) => {
            timer = setTimeout(() => resolve(null), 15_000);
            timer.unref();
          });
          let next: IteratorResult<string, CodexFallbackResult> | null;
          try {
            next = await Promise.race([pending, heartbeat]);
          } finally {
            clearTimeout(timer);
          }
          if (settled) {
            return;
          }
          if (next === null) {
            yield capture(ClaudeStreamSerializer.pingEvent());
            continue;
          }
          if (next.done === true) {
            finish(200, next.value);
            return;
          }
          const frame = capture(next.value);
          if (frame.startsWith("event: message_stop\n")) {
            // Finalize before exposing the terminal frame: a client can close
            // immediately after receiving it without making another pull.
            const completion = await bridge.frames.next();
            if (completion.done !== true) {
              throw new Error(
                "Codex fallback emitted output after message_stop",
              );
            }
            if (settled) {
              return;
            }
            finish(200, completion.value);
            yield frame;
            return;
          }
          yield frame;
          pending = bridge.frames.next();
        }
      } catch (error) {
        if (!settled) {
          const detail = redactProviderErrorMessage(
            describeTransportError(error),
          );
          logger.always(`[proxy] Codex fallback stream failed: ${detail}`);
          const serializer = new ClaudeStreamSerializer(body.model);
          const frames = [
            ...serializer.emitError(502, "Codex fallback stream failed"),
          ].map(capture);
          finish(502, undefined, "stream_error", detail);
          yield* frames;
        }
      } finally {
        ctx.abortSignal?.removeEventListener("abort", cancel);
        if (!settled) {
          cancel();
        }
        await bridge.cancel();
        await bridge.frames
          .return({ text: "", toolCalls: [], finishReason: "end_turn" })
          .catch(() => undefined);
      }
    }
    return relay();
  }

  let parsed: CodexFallbackResult;
  try {
    parsed = await consumeCodexFallbackResponse(codexResponse);
  } catch (error) {
    if (error instanceof CodexFallbackResponseError) {
      logger.always(
        `[proxy] Codex fallback returned ${error.status}: ${sanitizeForLog(error.responseBody, 500)}`,
      );
    }
    throw error;
  }
  if (Object.keys(codexHeaders).length > 0) {
    ctx.responseHeaders ??= {};
    Object.assign(ctx.responseHeaders, redactHeadersForBorrower(codexHeaders));
  }

  const accountLabel = codexHeaders["x-neurolink-account"] ?? "";
  const accountType = codexHeaders["x-neurolink-account-type"] ?? "codex-oauth";
  const internal: InternalResult = {
    content: parsed.text,
    // Keep the original Anthropic model in the client wire response. The
    // attribution headers above expose that Codex served the fallback.
    model: body.model,
    finishReason: parsed.finishReason,
    ...(parsed.usage ? { usage: parsed.usage } : {}),
    toolCalls: parsed.toolCalls,
  };

  tracer?.end(200, Date.now() - requestStartTime);
  const clientResponse = serializeClaudeResponse(internal, body.model);
  logFinalRequest(200, accountLabel, accountType, undefined, undefined, {
    inputTokens: parsed.usage?.input,
    outputTokens: parsed.usage?.output,
    cacheCreationTokens: parsed.usage?.cacheCreationTokens,
    cacheReadTokens: parsed.usage?.cacheReadTokens,
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

/**
 * Try each borrowable peer in priority order once the local pool is spent.
 *
 * Returns a `Response` for a stream — which must keep streaming — the parsed
 * JSON body otherwise, or `null` when no peer served, leaving the provider
 * fallback chain to take over. The two success shapes are what the rest of this
 * module returns as well; the route adapter tells them apart.
 *
 * Deliberately one attempt per peer: this path only runs after every local
 * account has already been tried, so the request has spent most of its latency
 * budget. Re-trying a peer that just declined would spend the rest of it.
 *
 * A borrowed request is never itself forwarded to a peer. Chaining a lend onto
 * a lend would spend a third party's capacity under a grant that says nothing
 * about them, and a cycle between two nodes would bounce a single request
 * between them until something timed out.
 */
async function tryBorrowFromPeers(args: {
  body: ClaudeRequest;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
  ) => void;
}): Promise<Response | Record<string, unknown> | null> {
  if (getShareContext()) {
    return null;
  }

  const peers = await selectBorrowablePeers();
  if (peers.length === 0) {
    return null;
  }

  const stream = args.body.stream === true;
  // Re-serialize the request as the client shaped it. The peer runs its own
  // routing and its own pool, so forwarding our resolved account or attempt
  // state would mean nothing to it.
  const forwardBody = JSON.stringify(args.body);
  for (const peer of peers) {
    logger.always(`[proxy] local pool spent — trying peer=${peer.name}`);
    const attempt = await forwardToPeer({ peer, body: forwardBody, stream });
    if (attempt.ok) {
      logger.always(`[proxy] served by peer=${peer.name}`);
      args.logFinalRequest(
        attempt.response.status,
        `peer:${peer.name}`,
        "peer",
      );
      // Hand back what the rest of this module hands back: a locally
      // constructed Response for a stream, a parsed object for JSON. Returning
      // the fetch Response itself would be serialized to `{}` by the route
      // adapter, which only recognizes Responses this process created.
      if (stream) {
        return new Response(attempt.response.body, {
          status: attempt.response.status,
          headers: {
            "content-type":
              attempt.response.headers.get("content-type") ??
              "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          },
        });
      }
      return (await attempt.response.json().catch(() => null)) ?? null;
    }
  }
  return null;
}

function getCodexFallbackInvalidRequestFailure(
  error: unknown,
): AnthropicInvalidRequestFailure | null {
  if (!(error instanceof CodexFallbackResponseError) || error.status !== 400) {
    return null;
  }
  return {
    status: error.status,
    body: error.responseBody,
    contentType: "application/json",
  };
}

async function tryConfiguredClaudeFallbackChain(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  parsedFallbackRequest: ParsedClaudeRequest;
  fallbackPlan?: ProxyTranslationPlan;
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
}): Promise<{
  response: unknown | null;
  lastErrorMessage?: string;
  invalidRequestFailure?: AnthropicInvalidRequestFailure;
  terminalFailure?: { status: number; message: string; errorType: string };
}> {
  const {
    ctx,
    body,
    parsedFallbackRequest,
    fallbackPlan: providedFallbackPlan,
    modelRouter,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
  } = args;
  const fallbackPlan =
    providedFallbackPlan ??
    buildProxyTranslationPlan(
      { provider: "anthropic", model: body.model },
      modelRouter?.getFallbackChain() ?? [],
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
  let terminalFailure:
    | { status: number; message: string; errorType: string }
    | undefined;
  let invalidRequestFailure: AnthropicInvalidRequestFailure | undefined;

  for (const fallback of fallbackPlan.attempts.slice(1)) {
    if (!fallback.provider || !fallback.model) {
      continue;
    }
    const fallbackStart = Date.now();
    try {
      logger.always(
        `[proxy] fallback → ${fallback.provider}/${fallback.model}${fallback.reasoningEffort ? ` reasoning=${fallback.reasoningEffort}` : ""}`,
      );
      let response: unknown;
      if (fallback.provider === "codex") {
        // Codex is a local OAuth account pool, not a generic SDK provider.
        // Calling its native route preserves account rotation and cooldowns.
        response = await executeClaudeCodexFallback({
          ctx,
          body,
          model: fallback.model,
          reasoningEffort: fallback.reasoningEffort,
          tracer,
          requestStartTime,
          logProxyBody,
          logFinalRequest,
        });
      } else {
        const availability =
          await ProviderHealthChecker.checkFallbackProviderAvailability(
            fallback.provider,
            fallback.model,
          );
        if (!availability.available) {
          const reason = availability.reason ?? "provider unavailable";
          logger.always(
            `[proxy] fallback ${fallback.provider}/${fallback.model} health-check failed (${reason}), skipping`,
          );
          recordFallbackAttempt({
            provider: fallback.provider,
            model: fallback.model,
            status: "failure",
            errorMessage: `[unavailable] ${reason}`,
            durationMs: 0,
          });
          lastFallbackError = `[${fallback.provider}/${fallback.model}] unavailable: ${reason}`;
          continue;
        }
        const options = buildProxyFallbackOptions(parsedFallbackRequest, {
          provider: fallback.provider,
          model: fallback.model,
        });
        response = await executeClaudeFallbackWithRetry({
          ctx,
          body,
          tracer,
          requestStartTime,
          logProxyBody,
          logFinalRequest,
          options: options as Parameters<
            ServerContext["neurolink"]["stream"]
          >[0],
          providerLabel: fallback.provider,
        });
      }
      if (fallback.provider === "codex" && body.stream) {
        return { response };
      }
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
      if (fallback.provider !== "codex") {
        // A different provider produced this response — say so, and report no
        // quota. Emitting the last Anthropic snapshot here would attribute one
        // provider's capacity to another's output.
        publishLimitHeaders(ctx, {
          quota: null,
          source: "none",
          servedBy: fallback.provider,
        });
      }
      return { response };
    } catch (fallbackErr) {
      const status = ctx.abortSignal?.aborted
        ? 499
        : fallbackErr instanceof CodexFallbackResponseError
          ? fallbackErr.status
          : 502;
      terminalFailure = {
        status,
        message: `Configured fallback ${fallback.provider}/${fallback.model} failed (HTTP ${status})`,
        errorType:
          status === 499
            ? "client_cancelled"
            : status === 429
              ? "rate_limit_error"
              : status === 401
                ? "authentication_error"
                : status === 403
                  ? "permission_error"
                  : status === 400
                    ? "invalid_request_error"
                    : "api_error",
      };
      invalidRequestFailure =
        getCodexFallbackInvalidRequestFailure(fallbackErr) ?? undefined;
      const errMsg = redactProviderErrorMessage(
        fallbackErr instanceof Error
          ? fallbackErr.message
          : String(fallbackErr),
      );

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
        `[proxy] fallback ${fallback.provider}/${fallback.model} failed [${errorClass}]: ${redactProviderErrorMessage(describeTransportError(fallbackErr))}`,
      );
      recordFallbackAttempt({
        provider: fallback.provider,
        model: fallback.model,
        status: "failure",
        errorMessage: `[${errorClass}] ${errMsg}`,
        durationMs: Date.now() - fallbackStart,
      });
      lastFallbackError = `[${fallback.provider}/${fallback.model}] ${redactProviderErrorMessage(describeTransportError(fallbackErr))}`;
      if (ctx.abortSignal?.aborted) {
        break;
      }
    }
  }

  return {
    response: null,
    lastErrorMessage: lastFallbackError,
    terminalFailure,
    ...(invalidRequestFailure ? { invalidRequestFailure } : {}),
  };
}

/** Preserve the final fallback status through every HTTP route adapter. */
function buildConfiguredClaudeFallbackFailure(args: {
  failure: { status: number; message: string; errorType: string };
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
  tracer?: ProxyTracer;
  requestStartTime: number;
}): Response {
  const { failure, buildLoggedClaudeError, tracer, requestStartTime } = args;
  tracer?.setError(failure.errorType, failure.message);
  tracer?.end(failure.status, Date.now() - requestStartTime);
  const body = buildLoggedClaudeError(
    failure.status,
    failure.message,
    failure.errorType,
  );
  return new Response(JSON.stringify(body), {
    status: failure.status,
    headers: { "content-type": "application/json" },
  });
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
      true,
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
    // See the configured-chain path: never attribute Anthropic quota to a
    // response another provider produced.
    publishLimitHeaders(ctx, {
      quota: null,
      source: "none",
      servedBy: "auto-provider",
    });
    return { response };
  } catch (fallbackErr) {
    const errorMessage = redactProviderErrorMessage(
      describeTransportError(fallbackErr),
    );
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

/** Human-readable list that stays short when the pool is large. */
function joinAccountLabels(labels: string[], max = 5): string {
  const unique = [...new Set(labels)];
  if (unique.length <= max) {
    return unique.join(", ");
  }
  return `${unique.slice(0, max).join(", ")} and ${unique.length - max} more`;
}

/**
 * The client-facing text for "every account is blocked by an organization
 * entitlement policy". Names the accounts and the remedy, because the upstream
 * message alone ("OAuth authentication is currently not allowed…") gives no
 * indication that a pool was involved or which credential to fix.
 */
function buildEntitlementErrorMessage(
  failure: AnthropicEntitlementFailure,
): string {
  const count = new Set(failure.accounts).size;
  const code = failure.errorCode ? ` (${failure.errorCode})` : "";
  return (
    `All ${count} Anthropic account${count === 1 ? "" : "s"} are blocked by an ` +
    `organization entitlement policy${code}. Accounts: ${joinAccountLabels(
      failure.accounts,
    )}. Upstream: "${failure.message}". Ask an organization admin to re-enable ` +
    `Claude Code OAuth access, then run: neurolink auth enable anthropic:<account>.`
  );
}

/** Name the subscription window a set of cooldowns is waiting on. */
function describeCoolingWindow(states: RuntimeAccountState[]): string {
  const reasons = new Set(states.map((state) => state.coolingReason));
  if (reasons.size === 1) {
    switch ([...reasons][0]) {
      case "session":
        return "5-hour subscription window";
      case "weekly":
        return "7-day subscription window";
      case "unified":
        return "subscription limit";
      case "transient":
        return "upstream burst limit";
      default:
        break;
    }
  }
  return "upstream rate limits";
}

/**
 * The provider's stated reason that paid extra usage is unavailable, taken from
 * the first account that reports one. Anthropic sends this on every response
 * (e.g. "org_level_disabled"); without it an exhausted pool looks like a proxy
 * failure rather than a billing policy.
 */
function findOverageDisabledReason(
  accounts: ProxyPassthroughAccount[],
): string | undefined {
  for (const account of accounts) {
    const quota = accountRuntimeState.get(account.key)?.quota;
    if (
      quota?.overageDisabledReason &&
      quota.overageStatus?.trim().toLowerCase() !== "allowed"
    ) {
      return quota.overageDisabledReason;
    }
  }
  return undefined;
}

/** Suffix explaining why paid overage cannot absorb an exhausted window. */
function buildOverageUnavailableSuffix(reason: string | undefined): string {
  if (!reason) {
    return "";
  }
  return (
    ` Paid extra usage is unavailable for this organization (${reason}), so ` +
    `there is no additional capacity before the window resets.`
  );
}

/**
 * The client-facing text for "every account has spent its model-scoped cap".
 * Distinct from a normal rate limit: the same accounts remain healthy for every
 * other model, so switching model is a real remedy and backing off is not.
 */
function buildScopedExhaustionMessage(
  exhaustion: AnthropicScopedExhaustion,
): string {
  const count = new Set(exhaustion.accounts).size;
  return (
    `All ${count} Anthropic account${count === 1 ? "" : "s"} have exhausted the ` +
    `model-scoped limit for ${exhaustion.model} (window "${exhaustion.scopeModel}"). ` +
    `Other models remain available on this pool — switch model, or add an account ` +
    `with remaining ${exhaustion.scopeModel} capacity. Earliest reset at ` +
    `${new Date(exhaustion.earliestResetMs).toISOString()}.` +
    buildOverageUnavailableSuffix(exhaustion.overageDisabledReason)
  );
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
  entitlementFailure: AnthropicEntitlementFailure | null;
  scopedExhaustion: AnthropicScopedExhaustion | null;
  sawNetworkError: boolean;
  sawTransientFailure: boolean;
  sawRateLimit: boolean;
  lastError: unknown;
  lastTransportErrorCode?: string;
  lastTransportScope?: "shared_provider_transport" | "connection_transport";
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
    entitlementFailure,
    scopedExhaustion,
    sawNetworkError,
    sawTransientFailure,
    sawRateLimit,
    lastError,
    lastTransportErrorCode,
    lastTransportScope,
    fallbackFailureMessage,
    orderedAccounts,
    buildLoggedClaudeError,
    logProxyBody,
    logFinalRequest,
  } = args;

  // Ranked above the auth rung on purpose: an organization policy block is a
  // more specific diagnosis than "authentication failed". But only when the
  // policy explains the *whole* pool — otherwise a single blocked account would
  // mask four genuine 5xx failures behind a 403, telling the client not to retry
  // when retrying is exactly right. No retry-after: waiting cannot fix a policy.
  const entitlementExplainsPool =
    entitlementFailure !== null &&
    orderedAccounts.length > 0 &&
    new Set(entitlementFailure.accounts).size >= orderedAccounts.length;
  if (entitlementExplainsPool && entitlementFailure && !sawRateLimit) {
    const message = buildEntitlementErrorMessage(entitlementFailure);
    tracer?.setError("permission_error", message);
    tracer?.end(403, Date.now() - requestStartTime);
    return buildLoggedClaudeError(403, message, "permission_error");
  }

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

  if (invalidRequestFailure && !sawRateLimit) {
    const parsedUpstream = parseClaudeErrorBody(invalidRequestFailure.body);
    const preserveUpstreamBody = parsedUpstream.message !== undefined;
    const message = summarizeErrorMessage(
      parsedUpstream.message ?? invalidRequestFailure.body,
    );
    const errorBodyText = preserveUpstreamBody
      ? invalidRequestFailure.body
      : JSON.stringify(
          buildClaudeError(
            invalidRequestFailure.status,
            message,
            "invalid_request_error",
          ),
        );
    const contentType = preserveUpstreamBody
      ? (invalidRequestFailure.contentType ?? "application/json")
      : "application/json";
    tracer?.setError("invalid_request_error", message);
    tracer?.end(invalidRequestFailure.status, Date.now() - requestStartTime);
    logFinalRequest(
      invalidRequestFailure.status,
      "",
      "final",
      "invalid_request_error",
      message,
    );
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": contentType },
      body: errorBodyText,
      bodySize: Buffer.byteLength(errorBodyText, "utf8"),
      contentType,
      responseStatus: invalidRequestFailure.status,
      durationMs: Date.now() - requestStartTime,
    });
    return new Response(errorBodyText, {
      status: invalidRequestFailure.status,
      headers: { "content-type": contentType },
    });
  }

  if ((sawNetworkError || sawTransientFailure) && !sawRateLimit) {
    const fallbackSuffix = fallbackFailureMessage
      ? ` Fallback also failed: ${fallbackFailureMessage}`
      : "";
    const transportDescription =
      lastTransportScope === "shared_provider_transport"
        ? "shared Anthropic network"
        : lastTransportScope === "connection_transport"
          ? "Anthropic connection"
          : null;
    const msg = `${transportDescription ? `${transportDescription} failure prevented safe cross-account rotation` : "All Anthropic accounts failed due to transient upstream/network errors"}. Last error${lastTransportErrorCode ? ` (${lastTransportErrorCode})` : ""}: ${
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
      {
        ...(lastTransportErrorCode
          ? { errorCode: lastTransportErrorCode }
          : {}),
        ...(lastTransportScope ? { transportScope: lastTransportScope } : {}),
      },
    );
  }

  /** Emit the 429 the client sees, with an honest retry-after. */
  const respondRateLimited = (
    message: string,
    retryAfterSec: number,
  ): Response => {
    const errorBody = buildClaudeError(429, message, "overloaded_error");
    tracer?.setError("rate_limit_error", message);
    tracer?.end(429, Date.now() - requestStartTime);
    logFinalRequest(429, "", "final", "rate_limit_error", message);
    const errorBodyText = JSON.stringify(errorBody);
    const headers = {
      "content-type": "application/json",
      "retry-after": String(retryAfterSec),
    };
    logProxyBody({
      phase: "client_response",
      headers,
      body: errorBodyText,
      bodySize: Buffer.byteLength(errorBodyText, "utf8"),
      contentType: "application/json",
      responseStatus: 429,
      durationMs: Date.now() - requestStartTime,
    });
    return new Response(errorBodyText, { status: 429, headers });
  };

  // A model-scoped cap is spent on every account. No upstream call was made, so
  // sawRateLimit is false and this must be caught before the generic
  // "all accounts failed" 502 below, which would report the wrong cause and
  // invite an immediate, guaranteed-to-fail retry.
  if (scopedExhaustion) {
    const message = buildScopedExhaustionMessage(scopedExhaustion);
    logger.always(
      `[proxy] model-scoped limit exhausted for ${scopedExhaustion.model} on all accounts`,
    );
    return respondRateLimited(
      message,
      Math.max(
        1,
        Math.ceil((scopedExhaustion.earliestResetMs - Date.now()) / 1000),
      ),
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
  // Name the window that actually ran out. "rate limits" alone cannot be acted
  // on: a 5-hour session window and a 7-day weekly window call for very
  // different responses from the caller.
  const windowLabel = describeCoolingWindow(activeRateLimitCooldowns);
  const overageSuffix = buildOverageUnavailableSuffix(
    findOverageDisabledReason(orderedAccounts),
  );
  const errorMessage = allAccountsCooling
    ? `All ${orderedAccounts.length} Anthropic accounts are cooling after the ${windowLabel} was exhausted. Earliest retry at ${new Date(earliestRetryAt).toISOString()}.${overageSuffix}`
    : `All ${orderedAccounts.length} accounts rate-limited after per-account retries.${overageSuffix}`;
  logger.always(
    `[proxy] all accounts rate-limited, retry in ${retryAfterSec}s`,
  );
  return respondRateLimited(errorMessage, retryAfterSec);
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
  onStreamTerminal?: () => void;
  /** Accounts eligible for this request, used to report pool headroom. */
  poolAccounts?: ReadonlyArray<ProxyPassthroughAccount>;
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
    onStreamTerminal,
    poolAccounts,
    logFinalRequest,
  } = args;
  accountState.consecutiveRefreshFailures = 0;
  logger.always(`[proxy] ← ${response.status} account=${account.label}`);

  const quota = parseQuotaHeaders(response.headers, { model: body.model });
  if (quota) {
    // Attribute the window movement to the borrowing grant before the snapshot
    // is overwritten — this is the only moment both the previous and the new
    // utilization are in hand, and a slice ceiling is meaningless without it.
    recordBorrowedWindowDelta(account.key, accountState.quota, quota);
    // Stash the latest quota on runtime state so the next request can pick the
    // account whose window resets soonest (max-utilization) and proactively
    // skip rejected windows unless Anthropic explicitly permits overage.
    accountState.quota = mergeQuotaSnapshot(accountState.quota, quota);
    const cooldownUpdate = reconcileCooldownFromQuota(
      accountState,
      quota,
      Date.now(),
    );
    if (cooldownUpdate?.kind === "cooled") {
      saveAccountCooldown(
        account.key,
        cooldownUpdate.coolingUntil,
        cooldownUpdate.coolingReason,
      ).catch(() => {
        // Non-fatal: cooldown is already active in memory.
      });
    } else if (cooldownUpdate?.kind === "cleared") {
      clearAccountCooldown(account.key, cooldownUpdate.coolingUntil).catch(
        () => {
          // Non-fatal: the next successful response will reconcile again.
        },
      );
    }
    saveAccountQuota(account.key, quota).catch(() => {
      // Non-fatal: quota persistence is best-effort
    });
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  tracer?.logUpstreamResponseHeaders(responseHeaders);

  // Surface limits to the client. `quota` is non-null only when this upstream
  // response actually carried the unified headers; otherwise fall back to the
  // account's last snapshot and label it as such, so a consumer never mistakes
  // a carried-over reading for a fresh one.
  publishLimitHeaders(ctx, {
    upstreamHeaders: response.headers,
    quota: quota ?? accountState.quota ?? null,
    source: quota ? "live" : accountState.quota ? "snapshot" : "none",
    account,
    accountState,
    servedBy: "anthropic",
    attempt: attemptNumber,
    ...(poolAccounts ? { poolAccounts } : {}),
  });

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
      onStreamTerminal,
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
    logAttempt,
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
  onStreamTerminal?: () => void;
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
    responseHeaders,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logAttempt,
    logProxyBody,
    onStreamTerminal,
    logFinalRequest,
  } = args;
  if (!response.body) {
    recordAttemptError(account.label, account.type, 502);
    logAttempt(502, "stream_error", "No response body from upstream");
    upstreamSpan?.end();
    tracer?.setError("stream_error", "No response body from upstream");
    tracer?.end(502, Date.now() - requestStartTime);
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
    // The POST has already returned a response. The upstream may have started
    // processing it, so replaying it on another account could duplicate work.
    logger.always(
      `[proxy] stream failed before first chunk account=${account.label}: ${message}; returning terminal error to avoid replaying an ambiguous request`,
    );
    recordAttemptError(account.label, account.type, 502);
    logAttempt(502, "stream_error", message, { retryable: false });
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
      response: finalizeAnthropicTerminalTransportError({
        account,
        tracer,
        requestStartTime,
        attemptNumber,
        logProxyBody,
        logFinalRequest,
        errorType: "stream_error",
        message,
      }),
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
    const quota = parseQuotaHeaders(responseHeaders, { model: body.model });
    const now = Date.now();
    if (isRateLimit) {
      const cooldownPlan = planCooldownFor429(
        quota,
        parseRetryAfterMs(responseHeaders["retry-after"] ?? null),
        now,
        getUnifiedRateLimitStatus(responseHeaders),
        overagePolicy,
        typeof body.model === "string" ? body.model : undefined,
      );
      accountState.quota = quota
        ? mergeQuotaSnapshot(accountState.quota, quota)
        : accountState.quota;
      const rateLimitKind =
        cooldownPlan.reason === "transient" ? "transient" : "quota";
      if (
        cooldownPlan.scope === "account" &&
        (!accountState.coolingUntil ||
          cooldownPlan.coolingUntil > accountState.coolingUntil)
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
      failure: {
        message: preflight.message,
        rateLimit: isRateLimit,
        ...(preflight.errorType === "overloaded_error"
          ? { retryDelayMs: getOverloadRotationDelayMs(attemptNumber) }
          : {}),
      },
    };
  }

  logAttempt(response.status, undefined, undefined, {
    attemptDurationMs: Date.now() - fetchStartMs,
  });
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

  const { response: result, telemetryDone } =
    attachAnthropicSuccessStreamTelemetry({
      ctx,
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
  void telemetryDone.then(
    () => onStreamTerminal?.(),
    () => onStreamTerminal?.(),
  );
  return { response: result, holdsAccountAdmission: true };
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

function recordCommittedAnthropicStreamAttemptFailure(
  outcome: StreamTerminalOutcome,
  account: ProxyPassthroughAccount,
): void {
  if (outcome.kind === "upstream_error") {
    recordAttemptError(account.label, account.type, 502);
  }
}

function attachAnthropicSuccessStreamTelemetry(args: {
  ctx: ServerContext;
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
}): { response: Response; telemetryDone: Promise<void> } {
  const {
    ctx,
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
  let telemetryDone: Promise<void>;

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
      const capturedAccountKey = account.key;

      telemetryDone = Promise.all([telemetry, clientCapture, streamOutcome])
        .then(([data, clientBody, rawOutcome]) => {
          const terminalOutcome = mergeStreamTerminalOutcome(
            rawOutcome,
            data.streamErrorMessage,
          );
          recordCommittedAnthropicStreamAttemptFailure(
            terminalOutcome,
            account,
          );
          capturedTracer.setUsage({
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          });
          // Bill the borrowing grant from the same totals. A stream's usage is
          // only final at message_delta, which is exactly here.
          settleBorrowedRequest(capturedAccountKey, data.model, {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          });
          recordLeasedAccountSpend(capturedAccountLabel, data.model, {
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
            "stream_telemetry_error",
            error instanceof Error ? error.message : String(error),
          );
          capturedUpstreamSpan?.end();
          capturedTracer.end(500, Date.now() - requestStartTime);
          logFinalRequest(
            500,
            capturedAccountLabel,
            account.type,
            "stream_telemetry_error",
            error instanceof Error ? error.message : String(error),
          );
        });
    } catch {
      // Interceptor attachment failed after stream setup. Preserve delivery but
      // still settle the request from the actual stream terminal outcome.
      telemetryDone = streamOutcome
        .then((outcome) => {
          recordCommittedAnthropicStreamAttemptFailure(outcome, account);
          const failure = getStreamFailureDetails(outcome);
          upstreamSpan?.end();
          if (failure) {
            tracer.setError(failure.errorType, failure.message);
            tracer.end(failure.status, Date.now() - requestStartTime);
            logFinalRequest(
              failure.status,
              account.label,
              account.type,
              failure.errorType,
              failure.message,
            );
          } else {
            tracer.end(response.status, Date.now() - requestStartTime);
            logFinalRequest(response.status, account.label, account.type);
          }
        })
        .catch(() => undefined);
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
      const capturedAccountKey = account.key;
      telemetryDone = Promise.all([
        noTracerTelemetry,
        clientCapture,
        streamOutcome,
      ])
        .then(([data, clientBody, rawOutcome]) => {
          const terminalOutcome = mergeStreamTerminalOutcome(
            rawOutcome,
            data.streamErrorMessage,
          );
          recordCommittedAnthropicStreamAttemptFailure(
            terminalOutcome,
            account,
          );
          const failure = getStreamFailureDetails(terminalOutcome);
          const usage = {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          };
          // Settled on the untraced path too: whether telemetry is exported has
          // nothing to do with whether a borrower should be charged.
          settleBorrowedRequest(capturedAccountKey, data.model, usage);
          recordLeasedAccountSpend(capturedAccountLabel, data.model, usage);
          if (failure) {
            logFinalRequest(
              failure.status,
              capturedAccountLabel,
              account.type,
              failure.errorType,
              failure.message,
              usage,
            );
          } else {
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
      telemetryDone = streamOutcome
        .then((outcome) => {
          recordCommittedAnthropicStreamAttemptFailure(outcome, account);
          const failure = getStreamFailureDetails(outcome);
          if (failure) {
            logFinalRequest(
              failure.status,
              account.label,
              account.type,
              failure.errorType,
              failure.message,
            );
          } else {
            logFinalRequest(response.status, account.label, account.type);
          }
        })
        .catch(() => undefined);
    }
  }

  const clientStream = streamSource.pipeThrough(clientCaptureStream);
  // Limit headers published on the context are applied here rather than left
  // to the runtime wrapper: this Response goes straight to the client on every
  // mount (proxy runtime and the generic server adapters alike), so the
  // streaming path has to carry them itself. The previous five-name allowlist
  // forwarded only the legacy counters and dropped the unified subscription
  // windows entirely.
  const clientResponseHeaders: Record<string, string> = {
    ...((ctx.responseHeaders ?? {}) as Record<string, string>),
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  };

  return {
    response: new Response(clientStream, {
      status: response.status,
      headers: clientResponseHeaders,
    }),
    telemetryDone,
  };
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
  const responseText = await response.text();
  logAttempt(response.status, undefined, undefined, {
    attemptDurationMs: Date.now() - fetchStartMs,
  });
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

  // Settlement is not diagnostics. It ran inside the tracer branch, so a node
  // with tracing off served every borrowed request for free and the lender's
  // ledger never moved — settle from the response itself instead.
  settleFromResponseUsage(account, responseJson);

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

async function handleAnthropicSuccessfulNonStreamRetryResponse(args: {
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  requestedModel?: string;
  retryResp: Response;
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
}): Promise<Response | unknown> {
  const {
    account,
    accountState,
    requestedModel,
    retryResp,
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
  const retryQuota = parseQuotaHeaders(retryResp.headers, {
    model: requestedModel,
  });
  if (retryQuota) {
    // Keep the auth-retry success path in parity with the main success path:
    // stash quota for proactive selection and reconcile a rejected window.
    accountState.quota = mergeQuotaSnapshot(accountState.quota, retryQuota);
    const cooldownUpdate = reconcileCooldownFromQuota(
      accountState,
      retryQuota,
      Date.now(),
    );
    if (cooldownUpdate?.kind === "cooled") {
      saveAccountCooldown(
        account.key,
        cooldownUpdate.coolingUntil,
        cooldownUpdate.coolingReason,
      ).catch(() => {
        // Non-fatal: cooldown is already active in memory.
      });
    } else if (cooldownUpdate?.kind === "cleared") {
      clearAccountCooldown(account.key, cooldownUpdate.coolingUntil).catch(
        () => {
          // Non-fatal: the next successful response will reconcile again.
        },
      );
    }
    saveAccountQuota(account.key, retryQuota).catch((error) => {
      logger.debug("[proxy] Failed to persist account quota after auth retry", {
        account: account.label,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  const retryRespHeaders = Object.fromEntries([...retryResp.headers.entries()]);
  const retryText = await retryResp.text();
  logAttempt(retryResp.status, undefined, undefined, {
    attemptDurationMs: Date.now() - fetchStartMs,
  });
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
  // A response served after an auth retry is a served response: it costs the
  // lender's account exactly what any other one does.
  settleFromResponseUsage(account, retryJson);
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
  url: string;
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  tracer?: ProxyTracer;
  requestStartTime: number;
  allocateAttemptNumber: () => number;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
  onStreamTerminal?: () => void;
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
  entitlementFailure: AnthropicEntitlementFailure | null;
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
    url,
    enabledAccounts,
    orderedAccounts,
    tracer,
    requestStartTime,
    allocateAttemptNumber,
    upstreamSpan,
    logAttempt,
    logProxyBody,
    onStreamTerminal,
    logFinalRequest,
    lastError,
    authFailureMessage,
    entitlementFailure,
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
  let currentEntitlementFailure = entitlementFailure;
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
    const refreshSucceeded = await refreshTokenFromLatest(
      account,
      account.persistTarget,
    );
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
        attemptDurationMs:
          extra?.attemptDurationMs ?? Date.now() - retryAttemptStartedAt,
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
      metadata: { upstreamMethod: "POST", upstreamUrl: url },
    });

    try {
      const retryResp = await fetchAnthropicUpstream(url, {
        method: "POST",
        headers,
        body: retryBodyStr,
        signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
      });
      if (retryResp.ok) {
        authRetrySucceeded = true;
        accountState.consecutiveRefreshFailures = 0;
        logger.always(
          `[proxy] ← 200 account=${account.label} (after ${authRetry + 1} refresh(es))`,
        );
        const successResult = body.stream
          ? await handleAnthropicSuccessfulResponse({
              ctx,
              body,
              account,
              accountState,
              response: retryResp,
              tracer,
              requestStartTime,
              fetchStartMs: retryFetchStartMs,
              attemptNumber: retryAttemptNumber,
              finalBodyStr: retryBodyStr,
              upstreamSpan: currentUpstreamSpan,
              logAttempt: retryLogAttempt,
              logProxyBody,
              logFinalRequest,
              onStreamTerminal,
            })
          : {
              response: await handleAnthropicSuccessfulNonStreamRetryResponse({
                account,
                accountState,
                requestedModel: body.model,
                retryResp,
                tracer,
                requestStartTime,
                fetchStartMs: retryFetchStartMs,
                attemptNumber: retryAttemptNumber,
                finalBodyStr: retryBodyStr,
                upstreamSpan: currentUpstreamSpan,
                logAttempt: retryLogAttempt,
                logProxyBody,
                logFinalRequest,
              }),
            };
        if ("retryNextAccount" in successResult) {
          const failure = successResult.failure;
          return {
            continueLoop: true,
            ...(failure?.retryDelayMs
              ? { retryDelayMs: failure.retryDelayMs }
              : {}),
            lastError: failure?.message ?? currentLastError,
            authFailureMessage: currentAuthFailureMessage,
            entitlementFailure: currentEntitlementFailure,
            sawRateLimit: currentSawRateLimit || Boolean(failure?.rateLimit),
            sawTransientFailure:
              currentSawTransientFailure ||
              Boolean(failure && !failure.rateLimit),
            sawNetworkError: currentSawNetworkError,
            upstreamSpan: undefined,
          };
        }
        return {
          response: successResult.response,
          holdsAccountAdmission: successResult.holdsAccountAdmission,
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          entitlementFailure: currentEntitlementFailure,
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
          entitlementFailure: currentEntitlementFailure,
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
        const retryQuota429 = parseQuotaHeaders(retryRespHeaders, {
          model: body.model,
        });
        if (retryQuota429) {
          accountState.quota = mergeQuotaSnapshot(
            accountState.quota,
            retryQuota429,
          );
        }
        const retryPlan = planCooldownFor429(
          retryQuota429,
          parseRetryAfterMs(retryRespHeaders["retry-after"] ?? null),
          nowRetry,
          getUnifiedRateLimitStatus(retryRespHeaders),
          overagePolicy,
          typeof body.model === "string" ? body.model : undefined,
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
          retryPlan.scope === "account" &&
          (!accountState.coolingUntil ||
            retryPlan.coolingUntil > accountState.coolingUntil)
        ) {
          accountState.coolingUntil = retryPlan.coolingUntil;
          accountState.coolingReason = retryPlan.reason;
        }
        if (retryQuota429) {
          saveAccountQuota(account.key, retryQuota429).catch(() => {
            // Non-fatal: routing already has the in-memory snapshot.
          });
        }
        if (retryPlan.scope === "account") {
          await saveAccountCooldown(
            account.key,
            accountState.coolingUntil ?? retryPlan.coolingUntil,
            accountState.coolingReason ?? retryPlan.reason,
          ).catch(() => {
            // Non-fatal: routing already has the in-memory cooldown.
          });
        }
        advancePrimaryIfCurrent(
          account.key,
          enabledAccounts.length,
          orderedAccounts[0]?.key,
        );
        break;
      }

      if (retryStatus === 401 || retryStatus === 402 || retryStatus === 403) {
        // An organization/plan entitlement refusal is not an authentication
        // problem: the token just minted is valid and refreshing again cannot
        // change the verdict. Rotate now instead of burning the remaining
        // refresh cycles and their one-second waits on a certain failure.
        if (isAccountEntitlementError(retryStatus, retryBody)) {
          const parsedRetry = parseClaudeErrorBody(retryBody);
          recordAttemptError(account.label, account.type, retryStatus);
          retryLogAttempt(
            retryStatus,
            "permission_error",
            summarizeErrorMessage(retryBody),
          );
          currentEntitlementFailure = {
            status: retryStatus,
            accounts: [
              ...(currentEntitlementFailure?.accounts ?? []),
              account.label,
            ],
            message:
              currentEntitlementFailure?.message ??
              parsedRetry.message ??
              summarizeErrorMessage(retryBody),
            ...(parsedRetry.errorCode
              ? { errorCode: parsedRetry.errorCode }
              : {}),
          };
          if (
            account.type === "oauth" &&
            isDurableEntitlementBlock(retryStatus, retryBody)
          ) {
            await disableAccountUntilReauth(
              account,
              accountState,
              "entitlement_blocked",
            );
          }
          authRetryError = `entitlement blocked for account=${account.label}`;
          currentLastError = authRetryError;
          logger.always(
            `[proxy] ← ${retryStatus} account=${account.label} entitlement blocked after refresh; advancing to next account`,
          );
          break;
        }
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
          entitlementFailure: currentEntitlementFailure,
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
          entitlementFailure: currentEntitlementFailure,
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
      const retryable = isRetryableNetworkError(retryFetchErr);
      retryLogAttempt(502, "network_error", message, {
        retryable,
        errorCode: getErrorCode(retryFetchErr) ?? "unknown",
      });
      logger.debug(`[proxy] ${authRetryError}`);
      if (!retryable) {
        // Once a POST has left this process, a reset/timeout or unknown fetch
        // failure is ambiguous: retrying it on another account can duplicate
        // the request. Only connection-establishment failures are replay-safe.
        currentUpstreamSpan?.end();
        return {
          response: finalizeAnthropicTerminalTransportError({
            account,
            tracer,
            requestStartTime,
            attemptNumber: retryAttemptNumber,
            logProxyBody,
            logFinalRequest,
            errorType: "network_error",
            message,
          }),
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          entitlementFailure: currentEntitlementFailure,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: undefined,
        };
      }
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
    entitlementFailure: currentEntitlementFailure,
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

function finalizeAnthropicTerminalTransportError(args: {
  account: ProxyPassthroughAccount;
  tracer?: ProxyTracer;
  requestStartTime: number;
  attemptNumber: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: ClaudeFinalRequestLogger;
  errorType: "network_error" | "stream_error";
  message: string;
}): Response | unknown {
  const {
    account,
    tracer,
    requestStartTime,
    attemptNumber,
    logProxyBody,
    logFinalRequest,
    errorType,
    message,
  } = args;
  tracer?.setError(errorType, message);
  tracer?.end(502, Date.now() - requestStartTime);
  logFinalRequest(502, account.label, account.type, errorType, message);
  const clientError = buildClaudeError(502, message);
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
  return clientError;
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
  entitlementFailure: AnthropicEntitlementFailure | null;
  allowConfiguredModelFallback?: boolean;
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
    entitlementFailure,
    allowConfiguredModelFallback = false,
  } = args;
  let currentLastError = lastError;
  let currentAuthFailureMessage = authFailureMessage;
  let currentSawTransientFailure = sawTransientFailure;
  let currentInvalidRequestFailure = invalidRequestFailure;
  let currentEntitlementFailure = entitlementFailure;

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
    if (isSubscriptionBetaRejection(response.status, errBody)) {
      // Subscription-specific beta rejection (an account whose plan tier lacks
      // an optional beta the proxy injected). The SAME request can succeed on
      // another account whose tier grants the beta — or on a fallback provider —
      // so advance to the next account instead of failing the client here.
      //
      // Deliberately do NOT store this in `currentInvalidRequestFailure`: that
      // field is a deterministic "malformed request" signal that both
      // suppresses provider fallback (shouldAttemptClaudeFallback) and outranks
      // transient/rate-limit failures in the final response. A beta rejection is
      // neither terminal nor higher-priority — a later account's real 429/5xx
      // must still take precedence, and fallback must stay eligible. The reason
      // is carried in `lastError`, so if every account rejects the beta the
      // exhaustion response still explains why.
      logger.always(
        `[proxy] ← ${response.status} account=${account.label} beta unavailable for subscription; advancing to next account`,
      );
      logAttempt(
        response.status,
        "invalid_request_error",
        summarizeErrorMessage(errBody),
      );
      tracer?.setError("invalid_request_error", summarizeErrorMessage(errBody));
      tracer?.recordRetry(account.label, "beta_unavailable");
      // A tier's lack of a beta is stable, not transient — advance the
      // fill-first primary pointer (like the auth/rate-limit rotation paths) so
      // this account stops being retried first on every future request.
      advancePrimaryIfCurrent(
        account.key,
        enabledAccounts.length,
        orderedAccounts[0]?.key,
      );
      currentLastError = summarizeErrorMessage(errBody);
      return {
        continueLoop: true,
        lastError: currentLastError,
        authFailureMessage: currentAuthFailureMessage,
        sawTransientFailure: currentSawTransientFailure,
        invalidRequestFailure: currentInvalidRequestFailure,
        entitlementFailure: currentEntitlementFailure,
        upstreamSpan: undefined,
      };
    }
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
      entitlementFailure: currentEntitlementFailure,
      upstreamSpan: undefined,
    };
  }

  if (
    account.type === "oauth" &&
    isAccountEntitlementError(response.status, errBody)
  ) {
    // Anthropic refuses this credential on organization/plan policy, e.g.
    // "OAuth authentication is currently not allowed for this organization."
    // Neither a retry nor a token refresh can fix it, but another account may
    // not be subject to the same policy — so rotate rather than fail the client.
    //
    // Must precede the no-refresh-token branch below: that branch matches the
    // same 401/402/403 statuses and would disable the account as
    // `missing_refresh_token`, telling the user to re-login — which cannot help
    // and burns a working credential.
    //
    // Like the beta-rejection branch above, deliberately sets neither
    // `currentInvalidRequestFailure` (would suppress provider fallback and
    // outrank a later account's real 429) nor `currentAuthFailureMessage`
    // (would surface a misleading "re-authenticate" 401).
    const parsed = parseClaudeErrorBody(errBody);
    recordAttemptError(account.label, account.type, response.status);
    currentEntitlementFailure = {
      status: response.status,
      accounts: [...(currentEntitlementFailure?.accounts ?? []), account.label],
      message:
        currentEntitlementFailure?.message ??
        parsed.message ??
        summarizeErrorMessage(errBody),
      ...(parsed.errorCode ? { errorCode: parsed.errorCode } : {}),
    };
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} entitlement blocked${
        parsed.errorCode ? ` (${parsed.errorCode})` : ""
      }; advancing to next account`,
    );
    logAttempt(
      response.status,
      "permission_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.setError("permission_error", summarizeErrorMessage(errBody));
    tracer?.recordRetry(account.label, "entitlement_blocked");
    if (
      account.type === "oauth" &&
      isDurableEntitlementBlock(response.status, errBody)
    ) {
      await disableAccountUntilReauth(
        account,
        accountState,
        "entitlement_blocked",
      );
    }
    advancePrimaryIfCurrent(
      account.key,
      enabledAccounts.length,
      orderedAccounts[0]?.key,
    );
    currentLastError = summarizeErrorMessage(errBody);
    return {
      continueLoop: true,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      entitlementFailure: currentEntitlementFailure,
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
      entitlementFailure: currentEntitlementFailure,
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
      entitlementFailure: currentEntitlementFailure,
      upstreamSpan: undefined,
    };
  }

  if (response.status === 404) {
    if (
      allowConfiguredModelFallback &&
      isAnthropicModelNotFound(response.status, errBody)
    ) {
      // An upstream model retirement is provider-wide, not an account failure.
      // Do not cool or disable an account; leave the configured translation
      // fallback eligible so legacy Anthropic aliases can use the Codex target.
      logger.always(
        `[proxy] ← 404 account=${account.label} model unavailable; trying configured fallback`,
      );
      logAttempt(404, "not_found_error", summarizeErrorMessage(errBody));
      tracer?.setError("not_found_error", summarizeErrorMessage(errBody));
      tracer?.recordRetry(account.label, "model_not_found");
      currentLastError = summarizeErrorMessage(errBody);
      return {
        continueLoop: false,
        lastError: currentLastError,
        authFailureMessage: currentAuthFailureMessage,
        sawTransientFailure: currentSawTransientFailure,
        invalidRequestFailure: currentInvalidRequestFailure,
        entitlementFailure: currentEntitlementFailure,
        upstreamSpan: undefined,
      };
    }
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
      entitlementFailure: currentEntitlementFailure,
      upstreamSpan: undefined,
    };
  }

  if (isTransientHttpFailure(response.status, errBody)) {
    const upstreamOverload = isUpstreamOverload(response.status, errBody);
    recordAttemptError(
      account.label,
      account.type,
      response.status,
      response.status === 429 ? "transient" : undefined,
    );
    currentSawTransientFailure = true;
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} (${upstreamOverload ? "overloaded" : "transient"})`,
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
    tracer?.setError(
      upstreamOverload ? "overloaded_error" : "transient_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.recordRetry(
      account.label,
      upstreamOverload ? "overloaded" : "transient",
    );
    return {
      continueLoop: true,
      retrySameAccount: !upstreamOverload,
      ...(upstreamOverload
        ? { retryDelayMs: getOverloadRotationDelayMs(attemptNumber) }
        : {}),
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      entitlementFailure: currentEntitlementFailure,
      upstreamSpan: undefined,
    };
  }

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
    entitlementFailure: currentEntitlementFailure,
    upstreamSpan: undefined,
  };
}

function createClaudeRequestRuntimeContext(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  clientRequestBody: string;
}): RoutedClaudeRequestRuntimeContext {
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
  let routingDecision: ProxyAccountRoutingDecision | undefined;
  const setRoutingDecision = (decision: ProxyAccountRoutingDecision): void => {
    if (routingDecision) {
      logger.debug(
        `[claude-proxy] ignored duplicate routing decision for request ${ctx.requestId}`,
      );
      return;
    }
    routingDecision = decision;
  };
  let finalRequestLogged = false;
  const logFinalRequest: ClaudeFinalRequestLogger = (
    status,
    accountLabel,
    accountType,
    errorType,
    errorMessage,
    extra,
  ) => {
    if (finalRequestLogged) {
      logger.debug(
        `[claude-proxy] ignored duplicate finalization for request ${ctx.requestId}`,
      );
      return;
    }
    finalRequestLogged = true;
    const finalAccountLabel =
      accountLabel ||
      (status >= 400 ? PROXY_INTERNAL_ACCOUNT_LABEL : undefined);
    const finalAccountType = accountLabel
      ? accountType || undefined
      : status >= 400
        ? PROXY_INTERNAL_ACCOUNT_TYPE
        : undefined;
    const finalAccountIdentity = resolveRequestLogAccountIdentity(
      finalAccountLabel,
      finalAccountType,
    );
    if (status >= 400) {
      recordFinalError(status, finalAccountLabel, finalAccountType, {
        requestId: ctx.requestId,
        ...(finalAccountIdentity.accountKey
          ? { accountKey: finalAccountIdentity.accountKey }
          : {}),
        errorType,
        terminalOutcome:
          errorType === "client_cancelled"
            ? "client_cancelled"
            : errorType?.includes("stream")
              ? "stream_error"
              : "handler_error",
        message: errorMessage,
        errorCode: extra?.errorCode,
      });
    } else {
      recordFinalSuccess(finalAccountLabel, finalAccountType);
    }
    const traceCtx = tracer?.getTraceContext();
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: !!body.stream,
      toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
      account: finalAccountLabel ?? "",
      ...(finalAccountIdentity.accountKey
        ? { accountKey: finalAccountIdentity.accountKey }
        : {}),
      accountType: finalAccountType ?? "",
      ...(finalAccountIdentity.provider
        ? { provider: finalAccountIdentity.provider }
        : {}),
      ...buildClientAttribution(ctx.headers),
      responseStatus: status,
      responseTimeMs: Date.now() - requestStartTime,
      ...(errorType ? { errorType } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(extra?.errorCode ? { errorCode: extra.errorCode } : {}),
      ...(extra?.transportScope
        ? { transportScope: extra.transportScope }
        : {}),
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
      ...(routingDecision ? { routingDecision } : {}),
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
    logFinalRequest(
      status,
      extra?.account ?? "",
      extra?.accountType ?? "final",
      errorType,
      message,
      extra,
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
    setRoutingDecision,
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
  const accountIdentity = resolveRequestLogAccountIdentity(
    account.label,
    account.type,
  );
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
      accountKey: account.key,
      accountType: account.type,
      ...(accountIdentity.provider
        ? { provider: accountIdentity.provider }
        : {}),
      responseStatus: status,
      responseTimeMs: attemptCompletedAt - requestStart,
      attemptDurationMs:
        extra?.attemptDurationMs ?? attemptCompletedAt - attemptStartedAt,
      ...(errorType ? { errorType } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(extra?.errorCode ? { errorCode: extra.errorCode } : {}),
      ...(extra?.transportScope
        ? { transportScope: extra.transportScope }
        : {}),
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
      ...(extra?.connectPhase !== undefined
        ? { connectPhase: extra.connectPhase }
        : {}),
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
    const refreshed = await refreshTokenFromLatest(
      account,
      account.persistTarget,
    );
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
    metadata: { upstreamMethod: "POST", upstreamUrl: url },
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
  requestedModel?: string;
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
    requestedModel,
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
    response = await fetchAnthropicUpstream(url, {
      method: "POST",
      headers,
      body: finalBodyStr,
      signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
    });
  } catch (fetchErr) {
    const retryable = isRetryableNetworkError(fetchErr);
    const connectPhase = isConnectPhaseNetworkError(fetchErr);
    const transportScope = classifyNetworkTransportScope(fetchErr);
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
      connectPhase,
      errorCode,
      transportScope,
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
      transportScope,
      errorCode,
      connectPhase,
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
    const quota = parseQuotaHeaders(errRespHeaders, { model: requestedModel });
    const unifiedStatus = getUnifiedRateLimitStatus(errRespHeaders);
    const cooldownPlan = planCooldownFor429(
      quota,
      retryAfterMs,
      now,
      unifiedStatus,
      overagePolicy,
      requestedModel,
    );
    const rateLimitKind =
      cooldownPlan.reason === "transient" ? "transient" : "quota";
    recordAttemptError(account.label, account.type, 429, rateLimitKind);
    logger.always(
      `[proxy] ← 429 account=${account.label} reason=${cooldownPlan.reason} scope=${cooldownPlan.scope} ` +
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

function buildDeferredClaudeAccountFailureResponse(args: {
  ctx: ServerContext;
  tracer?: ProxyTracer;
  requestStartTime: number;
  failure: DeferredClaudeAccountFailure;
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
}): unknown {
  const { ctx, tracer, requestStartTime, failure, buildLoggedClaudeError } =
    args;
  if (failure.responseHeaders) {
    ctx.responseHeaders = {
      ...(ctx.responseHeaders ?? {}),
      ...failure.responseHeaders,
    };
  }
  tracer?.setError(failure.errorType, failure.message);
  tracer?.end(failure.status, Date.now() - requestStartTime);
  return buildLoggedClaudeError(
    failure.status,
    failure.message,
    failure.errorType,
  );
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
  setRoutingDecision: (decision: ProxyAccountRoutingDecision) => void;
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
    setRoutingDecision,
  } = args;
  const parsedRequest = parseClaudeRequest(body);
  const configuredFallbackPlan = buildProxyTranslationPlan(
    { provider: "anthropic", model: body.model },
    modelRouter?.getFallbackChain() ?? [],
    body.model,
    parsedRequest,
  );
  const hasConfiguredFallback = configuredFallbackPlan.attempts
    .slice(1)
    .some((attempt) => Boolean(attempt.provider && attempt.model));
  const loadedAccounts = await loadClaudeProxyAccounts({
    ctx,
    body,
    accountStrategy,
    primaryAccountKey,
    accountAllowlist,
    quotaRoutingEnabled,
    sessionSoftLimit,
    sessionResetToleranceMs,
    setRoutingDecision,
  });
  if ("failure" in loadedAccounts) {
    // No usable local account. A node that has none of its own — or whose only
    // accounts are disabled — is still entitled to borrow: that is the whole
    // point of being lent capacity. Peers and explicitly configured fallbacks
    // are tried before returning the credential error.
    const peerOnlyResult = await tryBorrowFromPeers({ body, logFinalRequest });
    if (peerOnlyResult) {
      return peerOnlyResult;
    }
    const configuredFallbackResult = await tryConfiguredClaudeFallbackChain({
      ctx,
      body,
      parsedFallbackRequest: parsedRequest,
      fallbackPlan: configuredFallbackPlan,
      modelRouter,
      tracer,
      requestStartTime,
      logProxyBody,
      logFinalRequest,
    });
    if (configuredFallbackResult.response) {
      return configuredFallbackResult.response;
    }
    if (configuredFallbackResult.invalidRequestFailure) {
      return buildClaudeAnthropicFailureResponse({
        tracer,
        requestStartTime,
        authFailureMessage: null,
        authCooldownMessage: null,
        invalidRequestFailure: configuredFallbackResult.invalidRequestFailure,
        entitlementFailure: null,
        scopedExhaustion: null,
        sawNetworkError: false,
        sawTransientFailure: false,
        sawRateLimit: false,
        lastError: undefined,
        orderedAccounts: [],
        buildLoggedClaudeError,
        logProxyBody,
        logFinalRequest,
      });
    }
    if (configuredFallbackResult.terminalFailure) {
      const failure = configuredFallbackResult.terminalFailure;
      return buildConfiguredClaudeFallbackFailure({
        failure,
        buildLoggedClaudeError,
        tracer,
        requestStartTime,
      });
    }
    return buildDeferredClaudeAccountFailureResponse({
      ctx,
      tracer,
      requestStartTime,
      failure: loadedAccounts.failure,
      buildLoggedClaudeError,
    });
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
  // Snapshot the operator policy once. Reading the module value later would let
  // a concurrent /limits call or a hot config reload change this request's
  // answer partway through its own account loop.
  const requestOveragePolicy = currentOveragePolicy();
  const loopState: AnthropicLoopState = {
    lastError: undefined,
    sawRateLimit: false,
    sawNetworkError: false,
    sawTransientFailure: false,
    invalidRequestFailure: null,
    authFailureMessage: null,
    authCooldownMessage: null,
    entitlementFailure: null,
    scopedExhaustion: null,
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

  // Second eligibility gate, alongside cooldowns: an account whose model-scoped
  // cap for THIS model is spent will 429 with certainty. Unlike a cooldown the
  // condition is per-model, so it must not park the account — it stays fully
  // available for every other model.
  const scopedExhaustion = evaluateScopedExhaustion(
    effectiveAccounts,
    typeof body.model === "string" ? body.model : undefined,
    Date.now(),
    requestOveragePolicy,
  );
  if (scopedExhaustion.eligible.length > 0) {
    effectiveAccounts = scopedExhaustion.eligible;
  } else if (scopedExhaustion.exhaustion) {
    // Every account is scoped out on evidence we trust. Record it and let the
    // loop fall through to the post-loop path, so a configured fallback chain
    // still runs and only the terminal message changes. Returning here instead
    // would silently drop that fallback.
    loopState.scopedExhaustion = scopedExhaustion.exhaustion;
    loopState.lastError = `Model-scoped limit exhausted for ${scopedExhaustion.exhaustion.model}`;
    effectiveAccounts = [];
  }
  // Otherwise the scoped evidence was stale or absent: attempt the request
  // anyway rather than let a mis-parsed window take the pool down.

  const accountAdmissionCapacity = modelRouter?.getMaxInflightPerAccount?.();
  // When every eligible account is busy, reserve the first account that frees
  // instead of arbitrarily waiting behind the last configured account.
  let queuedAccountAdmission:
    | { accountKey: string; lease: AccountAdmissionLease }
    | undefined;
  if (
    accountAdmissionCapacity !== undefined &&
    effectiveAccounts.length > 0 &&
    effectiveAccounts.every(
      (account) =>
        !isAccountAdmissionAvailable(account.key, accountAdmissionCapacity),
    )
  ) {
    queuedAccountAdmission = await acquireFirstAvailableAccountAdmission(
      effectiveAccounts.map((account) => account.key),
      accountAdmissionCapacity,
      ctx.abortSignal,
    );
  }

  accountLoop: for (const [
    accountIndex,
    account,
  ] of effectiveAccounts.entries()) {
    const hasNextAccount = accountIndex < effectiveAccounts.length - 1;
    const accountState = getOrCreateRuntimeState(account.key);
    let transientSameAccountRetries = 0;
    let rateLimitSameAccountRetries = 0;

    while (true) {
      const transportPermit = await providerTransportCoordinator.acquire(
        ctx.abortSignal,
      );
      if (transportPermit.allowed === false) {
        loopState.sawNetworkError = true;
        loopState.lastTransportErrorCode =
          transportPermit.errorCode ?? undefined;
        loopState.lastTransportScope = transportPermit.transportScope;
        loopState.lastError = `Anthropic transport recovery probe failed (${transportPermit.errorCode ?? "unknown"})`;
        // The probe that failed was another request's attempt; this one has
        // sent nothing. Give it the same bounded same-account budget a direct
        // transport failure gets, instead of failing every queued request the
        // moment one probe times out.
        const probeRetryBudget = transportPermit.connectPhase
          ? MAX_CONNECT_PHASE_SAME_ACCOUNT_RETRIES
          : MAX_TRANSIENT_SAME_ACCOUNT_RETRIES;
        if (transientSameAccountRetries < probeRetryBudget) {
          transientSameAccountRetries += 1;
          const delayMs = getTransientSameAccountRetryDelayMs(
            transientSameAccountRetries,
          );
          logger.always(
            `[proxy] retrying same account=${account.label} after failed transport recovery probe (${transientSameAccountRetries}/${probeRetryBudget}) in ${delayMs}ms`,
          );
          await sleep(delayMs);
          continue;
        }
        break accountLoop;
      }
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
        if (transportPermit.probe) {
          providerTransportCoordinator.reportProbeAbandoned(transportPermit);
        }
        continue accountLoop;
      }

      let admissionLease: AccountAdmissionLease | undefined;
      if (queuedAccountAdmission?.accountKey === account.key) {
        admissionLease = queuedAccountAdmission.lease;
        queuedAccountAdmission = undefined;
      } else {
        admissionLease = tryAcquireAccountAdmission(
          account.key,
          accountAdmissionCapacity,
        );
        if (admissionLease && queuedAccountAdmission) {
          // A preferred account became available while the race was being
          // established; release the lower-priority reservation.
          queuedAccountAdmission.lease.release();
          queuedAccountAdmission = undefined;
        }
      }
      if (!admissionLease) {
        // A later account may be immediately available. Preserve the routing
        // order but do not leave a request queued behind a busy first choice.
        if (transportPermit.probe) {
          providerTransportCoordinator.reportProbeAbandoned(transportPermit);
        }
        continue accountLoop;
      }
      let admissionTransferredToStream = false;
      try {
        let fetchResult: AnthropicUpstreamFetchResult;
        try {
          fetchResult = await fetchAnthropicAccountResponse({
            url,
            headers: preparedAttempt.headers,
            finalBodyStr: preparedAttempt.finalBodyStr,
            requestedModel: body.model,
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
        } catch (error) {
          if (transportPermit.probe) {
            providerTransportCoordinator.reportProbeAbandoned(transportPermit);
          }
          throw error;
        }
        if (fetchResult.transportScope) {
          providerTransportCoordinator.reportTransportFailure(
            fetchResult.errorCode,
            fetchResult.transportScope,
            transportPermit,
            fetchResult.connectPhase === true,
          );
        } else {
          providerTransportCoordinator.reportSuccess(transportPermit);
        }
        loopState.lastError = fetchResult.lastError;
        loopState.sawRateLimit = fetchResult.sawRateLimit;
        loopState.sawNetworkError = fetchResult.sawNetworkError;
        if (fetchResult.transportScope) {
          loopState.lastTransportScope = fetchResult.transportScope;
          loopState.lastTransportErrorCode = fetchResult.errorCode;
        }
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
              accountState.quota = mergeQuotaSnapshot(
                accountState.quota,
                fetchResult.quota,
              );
              saveAccountQuota(account.key, fetchResult.quota).catch(() => {
                // Non-fatal: routing already has the in-memory snapshot.
              });
            }
            // Publish the cooldown before retrying so requests arriving behind
            // this one skip the throttled account instead of joining the burst.
            let cooldownExtended = false;
            if (
              plan.scope === "account" &&
              (!accountState.coolingUntil ||
                plan.coolingUntil > accountState.coolingUntil)
            ) {
              accountState.coolingUntil = plan.coolingUntil;
              accountState.coolingReason = plan.reason;
              cooldownExtended = true;
            }
            if (cooldownExtended && plan.scope === "account") {
              await saveAccountCooldown(
                account.key,
                accountState.coolingUntil ?? plan.coolingUntil,
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
              rateLimitSameAccountRetries <
                MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES &&
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
            if (plan.rotateImmediately) {
              scheduleHandoffQuotaRefresh(
                account,
                effectiveAccounts[accountIndex + 1],
                plan.coolingUntil,
                sessionSoftLimit,
              );
            }
            continue accountLoop;
          }
          // Transient error retry (network errors, 529 overloaded). A failure
          // from the connect phase sent nothing, so it earns the larger budget.
          const sameAccountRetryBudget = fetchResult.connectPhase
            ? MAX_CONNECT_PHASE_SAME_ACCOUNT_RETRIES
            : MAX_TRANSIENT_SAME_ACCOUNT_RETRIES;
          if (
            fetchResult.retrySameAccount &&
            transientSameAccountRetries < sameAccountRetryBudget
          ) {
            transientSameAccountRetries += 1;
            const delayMs = getTransientSameAccountRetryDelayMs(
              transientSameAccountRetries,
            );
            logger.always(
              `[proxy] retrying same account=${account.label} after transient network error (${transientSameAccountRetries}/${sameAccountRetryBudget}) in ${delayMs}ms`,
            );
            await sleep(delayMs);
            continue;
          }
          if (fetchResult.retrySameAccount && !fetchResult.transportScope) {
            logger.always(
              `[proxy] exhausted transient same-account retries for account=${account.label}; rotating`,
            );
          }
          if (fetchResult.transportScope) {
            logger.always(
              `[proxy] Anthropic ${fetchResult.transportScope} failure code=${fetchResult.errorCode ?? "unknown"}; suppressing cross-account rotation after ${transientSameAccountRetries + 1} attempts`,
            );
            break accountLoop;
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
            url,
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
            onStreamTerminal: admissionLease.release,
            lastError: loopState.lastError,
            authFailureMessage: loopState.authFailureMessage,
            entitlementFailure: loopState.entitlementFailure,
            sawRateLimit: loopState.sawRateLimit,
            sawTransientFailure: loopState.sawTransientFailure,
            sawNetworkError: loopState.sawNetworkError,
          });
          loopState.lastError = authRetryResult.lastError;
          loopState.authFailureMessage = authRetryResult.authFailureMessage;
          loopState.entitlementFailure = authRetryResult.entitlementFailure;
          loopState.sawRateLimit = authRetryResult.sawRateLimit;
          loopState.sawTransientFailure = authRetryResult.sawTransientFailure;
          loopState.sawNetworkError = authRetryResult.sawNetworkError;
          upstreamSpan = authRetryResult.upstreamSpan;
          if (authRetryResult.response !== undefined) {
            admissionTransferredToStream =
              authRetryResult.holdsAccountAdmission === true;
            return authRetryResult.response;
          }
          if (authRetryResult.continueLoop) {
            if (hasNextAccount && authRetryResult.retryDelayMs) {
              logger.always(
                `[proxy] pacing cross-account SSE overload rotation for ${authRetryResult.retryDelayMs}ms after auth refresh`,
              );
              await sleep(authRetryResult.retryDelayMs);
            }
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
            entitlementFailure: loopState.entitlementFailure,
            allowConfiguredModelFallback: hasConfiguredFallback,
          });
          loopState.lastError = nonOkResult.lastError;
          loopState.authFailureMessage = nonOkResult.authFailureMessage;
          loopState.sawTransientFailure = nonOkResult.sawTransientFailure;
          loopState.invalidRequestFailure = nonOkResult.invalidRequestFailure;
          loopState.entitlementFailure = nonOkResult.entitlementFailure;
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
            if (hasNextAccount && nonOkResult.retryDelayMs) {
              logger.always(
                `[proxy] pacing cross-account overload rotation for ${nonOkResult.retryDelayMs}ms`,
              );
              await sleep(nonOkResult.retryDelayMs);
            }
            continue accountLoop;
          }
          break accountLoop;
        }

        // Clear cooling on success — but only if the stored cooldown has already
        // expired, so an older in-flight success can't wipe an active exhaustion
        // cooldown just set by a concurrent 429. The success handler re-applies a
        // cooldown via reconcileCooldownFromQuota when fresh quota headers
        // report a rejected window without explicit overage availability.
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
          onStreamTerminal: admissionLease.release,
          poolAccounts: enabledAccounts,
        });
        if ("retryNextAccount" in successResult) {
          if (successResult.failure) {
            loopState.lastError = successResult.failure.message;
            loopState.sawRateLimit ||= successResult.failure.rateLimit;
            loopState.sawTransientFailure ||= !successResult.failure.rateLimit;
            if (hasNextAccount && successResult.failure.retryDelayMs) {
              logger.always(
                `[proxy] pacing cross-account SSE overload rotation for ${successResult.failure.retryDelayMs}ms`,
              );
              await sleep(successResult.failure.retryDelayMs);
            }
          }
          continue accountLoop;
        }
        admissionTransferredToStream =
          successResult.holdsAccountAdmission === true;
        return successResult.response;
      } finally {
        if (!admissionTransferredToStream) {
          admissionLease.release();
        }
      }
    }
  }

  queuedAccountAdmission?.lease.release();

  if (loopState.attemptNumber === 0) {
    acctSelectionSpan?.end();
  }

  // Deterministic invalid requests (for example, prompt-too-long) cannot be
  // repaired by changing providers. Preserve the authoritative Anthropic 400
  // rather than delaying it or returning unrelated fallback output.
  if (shouldAttemptClaudeFallback(loopState)) {
    let fallbackFailureMessage: string | undefined;

    // Peers first. A peer serves the same models over the same wire format, so
    // borrowing costs one extra hop, while the provider chain below has to
    // reshape the request for a different API and answers as a different model.
    const peerResult = await tryBorrowFromPeers({ body, logFinalRequest });
    if (peerResult) {
      return peerResult;
    }

    const configuredFallbackResult = await tryConfiguredClaudeFallbackChain({
      ctx,
      body,
      parsedFallbackRequest: parsedRequest,
      fallbackPlan: configuredFallbackPlan,
      modelRouter,
      tracer,
      requestStartTime,
      logProxyBody,
      logFinalRequest,
    });
    if (configuredFallbackResult.response) {
      return configuredFallbackResult.response;
    }
    if (configuredFallbackResult.invalidRequestFailure) {
      // Surface the failure of the provider actually attempted last.
      return buildClaudeAnthropicFailureResponse({
        tracer,
        requestStartTime,
        authFailureMessage: null,
        authCooldownMessage: null,
        invalidRequestFailure: configuredFallbackResult.invalidRequestFailure,
        entitlementFailure: null,
        scopedExhaustion: null,
        sawNetworkError: false,
        sawTransientFailure: false,
        sawRateLimit: false,
        lastError: undefined,
        orderedAccounts: [],
        buildLoggedClaudeError,
        logProxyBody,
        logFinalRequest,
      });
    }
    fallbackFailureMessage = configuredFallbackResult.lastErrorMessage;

    // A translation-layer-selected provider is only permitted by an explicit
    // routing setting. Empty fallback chains otherwise stay within OAuth.
    if (
      loopState.invalidRequestFailure === null &&
      !loopState.sawRateLimit &&
      modelRouter?.isAutoFallbackEnabled?.()
    ) {
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

    if (
      configuredFallbackResult.terminalFailure &&
      !configuredFallbackResult.invalidRequestFailure
    ) {
      const failure = configuredFallbackResult.terminalFailure;
      return buildConfiguredClaudeFallbackFailure({
        failure,
        buildLoggedClaudeError,
        tracer,
        requestStartTime,
      });
    }
    loopState.fallbackFailureMessage = fallbackFailureMessage;
  }

  // Terminal failure — usually "every account is rate-limited". This is the
  // response a caller most needs limit data on, and historically the one that
  // carried none. No single account served it, so report the account we would
  // have tried first plus pool headroom, explicitly marked as a snapshot.
  {
    const primary = orderedAccounts[0];
    const primaryState = primary
      ? accountRuntimeState.get(primary.key)
      : undefined;
    publishLimitHeaders(ctx, {
      quota: primaryState?.quota ?? null,
      source: primaryState?.quota ? "snapshot" : "none",
      ...(primary ? { account: primary } : {}),
      ...(primaryState ? { accountState: primaryState } : {}),
      attempt: loopState.attemptNumber,
      poolAccounts: enabledAccounts,
    });
  }

  return buildClaudeAnthropicFailureResponse({
    tracer,
    requestStartTime,
    authFailureMessage: loopState.authFailureMessage,
    authCooldownMessage: loopState.authCooldownMessage,
    invalidRequestFailure: loopState.invalidRequestFailure,
    entitlementFailure: loopState.entitlementFailure,
    scopedExhaustion: loopState.scopedExhaustion,
    sawNetworkError: loopState.sawNetworkError,
    sawTransientFailure: loopState.sawTransientFailure,
    sawRateLimit: loopState.sawRateLimit,
    lastError: loopState.lastError,
    lastTransportErrorCode: loopState.lastTransportErrorCode,
    lastTransportScope: loopState.lastTransportScope,
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

function buildEarlyClaudeRequestError(args: {
  ctx: ServerContext;
  body: ClaudeRequest | undefined;
  status: number;
  message: string;
  errorType: string;
}): unknown {
  const { ctx, body, status, message, errorType } = args;
  recordFinalError(
    status,
    PROXY_INTERNAL_ACCOUNT_LABEL,
    PROXY_INTERNAL_ACCOUNT_TYPE,
    {
      requestId: ctx.requestId,
      errorType,
      terminalOutcome: "handler_error",
      message,
    },
  );
  void logRequest({
    timestamp: new Date().toISOString(),
    requestId: ctx.requestId,
    method: ctx.method,
    path: ctx.path,
    model: typeof body?.model === "string" ? body.model : "",
    stream: body?.stream ?? false,
    toolCount: Array.isArray(body?.tools) ? body.tools.length : 0,
    account: PROXY_INTERNAL_ACCOUNT_LABEL,
    accountType: PROXY_INTERNAL_ACCOUNT_TYPE,
    responseStatus: status,
    responseTimeMs: 0,
    errorType,
    errorMessage: message,
  });
  return buildClaudeError(status, message);
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

/**
 * Quota timestamps arrive in two units. `sessionResetAt`, `weeklyResetAt` and
 * each window's `resetsAt` are unix SECONDS; `lastUpdated`, `updatedAt` and
 * `coolingUntil` are already MILLISECONDS. Blanket-multiplying would push the
 * millisecond fields tens of thousands of years into the future, so only the
 * seconds fields are converted, and 0 becomes null rather than epoch zero.
 */
function toMillis(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value * 1000)
    : null;
}

/**
 * Normalise one account's quota for a dashboard consumer.
 *
 * `severity` and `isActive` are absent on header-sourced windows — a
 * structural property of how those rows are parsed, not a transient gap — so
 * every consumer would otherwise need the same fallback branch.
 */
function normalizeQuotaForAccounts(quota: unknown): JsonObject | null {
  if (!quota || typeof quota !== "object") {
    return null;
  }
  const q = { ...(quota as Record<string, unknown>) };
  q.sessionResetAtMs = toMillis(q.sessionResetAt);
  q.weeklyResetAtMs = toMillis(q.weeklyResetAt);

  if (Array.isArray(q.windows)) {
    q.windows = q.windows.map((raw) => {
      const w = { ...(raw as Record<string, unknown>) };
      w.resetsAtMs = toMillis(w.resetsAt);
      w.severity =
        w.severity ?? (w.status === "rejected" ? "critical" : "normal");
      w.isActive = w.isActive ?? false;
      return w;
    });
  }
  return q as JsonObject;
}

/** "rejected" and "throttled" both mean degraded; unknown strings stay unknown. */
function quotaHealth(status: unknown): "ok" | "degraded" | "unknown" {
  if (status === "allowed") {
    return "ok";
  }
  if (status === "rejected" || status === "throttled") {
    return "degraded";
  }
  return "unknown";
}

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
            useOverage: "auto",
          };
          setOveragePolicy(requestRouting.useOverage);
          const requestModelRouter = requestRouting.modelRouter;
          const body = ctx.body as ClaudeRequest | undefined;

          // 1. Validate
          if (
            typeof body?.model !== "string" ||
            !Array.isArray(body?.messages)
          ) {
            return buildEarlyClaudeRequestError({
              ctx,
              body,
              status: 400,
              message: "Missing required fields: model, messages",
              errorType: "invalid_request_error",
            });
          }

          // 2. Resolve model via router (or pass through to anthropic)
          // Guard: without a model router, only Claude models are allowed.
          const modelLower = body.model.toLowerCase();
          if (!requestModelRouter && !modelLower.startsWith("claude-")) {
            return buildEarlyClaudeRequestError({
              ctx,
              body,
              status: 404,
              message:
                `Model '${body.model}' is not an Anthropic model. ` +
                `The proxy only supports Claude models. ` +
                `Use a model router to route non-Claude models to other providers.`,
              errorType: "not_found_error",
            });
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
            setRoutingDecision,
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
                  logFinalRequest,
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
                setRoutingDecision,
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
      // POST /peer/heartbeat -- complete-mode check-in
      //
      // The only control surface a complete-mode borrower still touches. It
      // answers with a fresh lease while the grant is active, and with a stop
      // once it is not — which is how a pause reaches a borrower whose requests
      // never come through here at all.
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/peer/heartbeat`,
        handler: async (ctx: ServerContext) => {
          const token = ctx.headers["x-neurolink-share-token"];
          const grantId = ctx.headers["x-neurolink-grant-id"];
          if (!token || !grantId) {
            // A stop, not an HTTP error: the borrower reads `ok`/`stop` from
            // the body, and a status code here would be discarded by the route
            // adaptor while reading as though it were enforced.
            return { ok: false, stop: true, reason: "no grant identified" };
          }
          const grant = await getShareGrant(grantId);
          // The lease secret is the shared credential for this surface: the
          // borrower proves identity with the same secret it verifies leases
          // with, so a heartbeat needs no separate token to leak.
          if (
            !grant ||
            !grant.leaseSecret ||
            !secretsMatch(grant.leaseSecret, token)
          ) {
            return { ok: false, stop: true, reason: "grant not recognized" };
          }
          if (grant.level !== "complete") {
            return {
              ok: false,
              stop: true,
              reason: "grant is not a complete share",
            };
          }
          if (grant.state !== "active") {
            return { ok: false, stop: true, reason: grant.state };
          }

          // Fold in what the borrower says it spent. This is self-reported and
          // treated as such — `share status` reconciles it against the
          // account's real utilization, which the borrower cannot influence.
          const body = ctx.body as
            | { coinsSpent?: number; requests?: number }
            | undefined;
          const reported = Number(body?.coinsSpent ?? 0);
          if (Number.isFinite(reported) && reported > 0) {
            await recordReportedResidentSpend(grant, reported);
          }

          // Weigh the claim against what the account actually did. A borrower
          // that stops reporting is invisible in every other signal we have.
          const drift = await auditCompleteShareHeartbeat(
            grant,
            Number.isFinite(reported) ? reported : 0,
          );
          if (drift.paused) {
            logger.always(
              `[proxy] auto-paused share ${grant.peerLabel}: ${drift.detail}`,
            );
            return { ok: false, stop: true, reason: "usage drift" };
          }

          return { ok: true, lease: issueLease(grant) };
        },
        description: "Complete-share heartbeat: report spend, renew the lease",
        tags: ["claude-proxy", "sharing"],
      },

      // =====================================================================
      // GET /peer/handshake -- version and capability negotiation
      //
      // The cheapest possible "are we still on speaking terms": it touches no
      // account, spends no capacity and reaches no upstream, so a borrower can
      // call it on a timer. It reports the grant's own state and nothing about
      // the pool behind it.
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/peer/handshake`,
        handler: async (ctx: ServerContext) => {
          const auth = await authenticatePeerRequest(ctx.headers);
          if (isPeerAuthRefusal(auth)) {
            return auth.body;
          }
          return {
            ok: true,
            protocol: PEER_PROTOCOL_VERSION,
            capabilities: PEER_CAPABILITIES,
            grant: {
              peerLabel: auth.grant.peerLabel,
              level: auth.grant.level,
              state: auth.grant.state,
              ledger: auth.grant.entitlement.ledger,
            },
          };
        },
        description:
          "Peer handshake: protocol version, capabilities, grant state",
        tags: ["claude-proxy", "sharing"],
      },

      // =====================================================================
      // POST /peer/provision -- borrower lodges a PKCE challenge
      //
      // Split provisioning: the borrower keeps the verifier and sends only its
      // digest, so the lender is never in possession of anything that could
      // become a credential. The lender authorizes in its own browser and
      // relays back a code that is useless without the verifier.
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/peer/provision`,
        handler: async (ctx: ServerContext) => {
          const auth = await authenticatePeerRequest(ctx.headers);
          if (isPeerAuthRefusal(auth)) {
            return auth.body;
          }
          if (auth.grant.state !== "active") {
            return buildShareRefusal(
              auth.grant.state === "paused" ? "paused" : "revoked",
              { status: 403, grant: auth.grant },
            ).body;
          }
          if (auth.grant.level !== "complete") {
            return {
              type: "error",
              error: {
                type: "invalid_request_error",
                message:
                  "This is a live share. Ask the lender to run " +
                  "`neurolink proxy share level --to complete` first.",
              },
            };
          }
          const body = ctx.body as
            | { codeChallenge?: string; state?: string }
            | undefined;
          const opened = await openProvisionRequest({
            grantId: auth.grant.id,
            codeChallenge: String(body?.codeChallenge ?? ""),
            state: String(body?.state ?? ""),
          });
          if (opened.ok !== true) {
            return {
              type: "error",
              error: {
                type: "invalid_request_error",
                message: opened.reason,
              },
            };
          }
          logger.always(
            `[proxy] ${auth.grant.peerLabel} asked to be provisioned — run ` +
              `\`neurolink proxy share provision --peer ${auth.grant.peerLabel}\``,
          );
          return {
            ok: true,
            status: "pending",
            expiresAt: opened.request.expiresAt,
          };
        },
        description:
          "Lodge a PKCE challenge for a resident credential (complete shares)",
        tags: ["claude-proxy", "sharing"],
      },

      // =====================================================================
      // GET /peer/provision -- borrower collects its authorization code
      //
      // Answers once. A code that could be claimed twice would let a replay
      // mint a second credential on the lender's account, so consumption is
      // recorded before the value is handed over.
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/peer/provision`,
        handler: async (ctx: ServerContext) => {
          const auth = await authenticatePeerRequest(ctx.headers);
          if (isPeerAuthRefusal(auth)) {
            return auth.body;
          }
          const claimed = await claimProvisionRequest(auth.grant.id);
          if (claimed.status !== "ready") {
            return { ok: true, status: claimed.status };
          }
          // The heartbeat address the borrower will call home on. Without it a
          // resident grant can never renew and stops at its offline grace.
          const lenderUrl = await getNodePublicUrl();
          return {
            ok: true,
            status: "ready",
            claim: buildProvisionClaim({
              grant: auth.grant,
              // The borrower renames this locally at `peer request --name`;
              // here it only has to make the token-store label unique.
              lenderName: "lender",
              ...(lenderUrl ? { lenderUrl } : {}),
              code: claimed.code,
              state: claimed.state,
            }),
          };
        },
        description: "Collect the authorization code the lender produced",
        tags: ["claude-proxy", "sharing"],
      },

      // =====================================================================
      // GET /peer/receipts -- collect signed statements of what was charged
      //
      // So the lender's word is not the only record. Each receipt carries the
      // usage it was computed from, and sequences are contiguous, so a borrower
      // can recompute every charge and see a withheld one as a gap.
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/peer/receipts`,
        handler: async (ctx: ServerContext) => {
          const auth = await authenticatePeerRequest(ctx.headers);
          if (isPeerAuthRefusal(auth)) {
            return auth.body;
          }
          const since = Number(ctx.query?.since ?? 0);
          const collected = await listShareReceipts(
            auth.grant.id,
            Number.isFinite(since) ? since : 0,
          );
          return { ok: true, receipts: collected };
        },
        description: "Collect signed receipts for this grant's settled charges",
        tags: ["claude-proxy", "sharing"],
      },

      // =====================================================================
      // POST /peer/net -- settle one round of reciprocal netting
      //
      // Both sides state cumulative positions, and the round forgives the
      // overlap not yet forgiven. Cumulative rather than incremental is what
      // makes a replayed round free rather than a second payout.
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/peer/net`,
        handler: async (ctx: ServerContext) => {
          const auth = await authenticatePeerRequest(ctx.headers);
          if (isPeerAuthRefusal(auth)) {
            return auth.body;
          }
          const secret = auth.grant.receiptSecret;
          if (!secret) {
            return {
              type: "error",
              error: {
                type: "invalid_request_error",
                message:
                  "This grant predates receipts and cannot be netted. " +
                  "Ask the lender to re-issue it.",
              },
            };
          }
          const body = ctx.body as
            | {
                consumedByYou?: number;
                alreadyNetted?: number;
                signature?: string;
              }
            | undefined;
          const consumedByYou = Number(body?.consumedByYou ?? NaN);
          const alreadyNetted = Number(body?.alreadyNetted ?? NaN);
          if (
            !Number.isFinite(consumedByYou) ||
            !Number.isFinite(alreadyNetted)
          ) {
            return {
              type: "error",
              error: {
                type: "invalid_request_error",
                message: "A netting claim needs both cumulative totals.",
              },
            };
          }
          // The claim is the peer's own accounting, so it is signed: a figure
          // that credits the caller must not be forgeable by anyone who merely
          // reaches the port.
          const authentic = verifySharePayload(
            { consumedByYou, alreadyNetted, grantId: auth.grant.id },
            String(body?.signature ?? ""),
            secret,
          );
          if (!authentic) {
            return buildShareRefusal("unknown_token", { status: 401 }).body;
          }
          const result = await applyReciprocalNetting({
            grantId: auth.grant.id,
            consumedFromPeer: consumedByYou,
            peerAlreadyNetted: alreadyNetted,
          });
          return { ok: true, ...result };
        },
        description:
          "Settle one round of reciprocal netting against this grant",
        tags: ["claude-proxy", "sharing"],
      },

      // =====================================================================
      // POST /peer/note -- check or redeem a transferable coin note
      //
      // Holding the note is the credential for a check; redeeming additionally
      // needs a grant to credit. Marking spent and crediting happen under one
      // lock, so two holders racing the same note produce exactly one credit.
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/peer/note`,
        handler: async (ctx: ServerContext) => {
          const body = ctx.body as
            | { note?: string; redeem?: boolean }
            | undefined;
          const note = decodeShareNote(String(body?.note ?? ""));
          if (!note) {
            return {
              type: "error",
              error: {
                type: "invalid_request_error",
                message: "That is not a NeuroLink coin note.",
              },
            };
          }
          const secret = await getNoteSecret();
          if (!body?.redeem) {
            // A status check needs no grant: the note itself is the credential,
            // and the answer tells a stranger nothing they did not already hold.
            const inspected = await inspectShareNote(note, secret);
            return { ok: true, ...inspected };
          }
          const auth = await authenticatePeerRequest(ctx.headers);
          if (isPeerAuthRefusal(auth)) {
            return auth.body;
          }
          if (auth.grant.entitlement.ledger !== "coins") {
            return {
              type: "error",
              error: {
                type: "invalid_request_error",
                message:
                  "This grant is unlimited — there is no balance to redeem into.",
              },
            };
          }
          const redeemed = await redeemShareNote({
            note,
            grantId: auth.grant.id,
            secret,
          });
          if (redeemed.ok !== true) {
            return {
              ok: false,
              status: redeemed.status,
              error: {
                type: "invalid_request_error",
                message: `That note is ${redeemed.status}.`,
              },
            };
          }
          return {
            ok: true,
            status: "redeemed",
            coins: redeemed.coins,
            balance: redeemed.balance ?? null,
          };
        },
        description: "Check or redeem a transferable coin note",
        tags: ["claude-proxy", "sharing"],
      },

      // =====================================================================
      // GET /peer/limits -- what this grant may still do
      //
      // So a borrower can decide *before* spending a request whether this peer
      // is worth the extra hop. Everything here is scoped to the caller's own
      // grant: no account labels, no per-account figures, nothing that would
      // describe the lender's pool.
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/peer/limits`,
        handler: async (ctx: ServerContext) => {
          const auth = await authenticatePeerRequest(ctx.headers);
          if (isPeerAuthRefusal(auth)) {
            return auth.body;
          }
          const limitsRouting = runtimeConfigProvider?.();
          const snapshot = await buildPeerLimitsSnapshot(
            auth.grant,
            limitsRouting?.accountAllowlist ?? accountAllowlist,
          );
          return { ok: true, ...snapshot };
        },
        description:
          "Peer limits: remaining coins, slice left, whether the grant can be served",
        tags: ["claude-proxy", "sharing"],
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

      // =====================================================================
      // GET /limits -- Fresh account limits from Anthropic's usage endpoint
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/limits`,
        handler: async (ctx: ServerContext) => {
          // `/limits` names every account and its quota — for an OAuth account
          // the label is the operator's email. That is an operator diagnostic,
          // not something a borrower may read, and a refresh also drives real
          // usage-API calls on the lender's accounts. Borrowed traffic gets
          // `/peer/limits`, which answers the same routing question about the
          // borrower's own grant without describing the pool.
          if (getShareContext()) {
            return buildShareRefusal("no_capacity", {
              status: 403,
              message:
                "This proxy does not expose pool limits to peers. " +
                "Use GET /peer/limits for what your grant may still do.",
            }).body;
          }
          const limitsRouting = runtimeConfigProvider?.();
          const effectiveAllowlist =
            limitsRouting?.accountAllowlist ?? accountAllowlist;
          // A refresh reconciles cooldowns from the fetched quota, so it makes
          // the same overage judgement the request path does and needs the same
          // operator policy in scope.
          setOveragePolicy(limitsRouting?.useOverage);
          const snapshotOnly =
            ctx.query?.snapshot === "true" || ctx.query?.snapshot === "1";
          const accountFilter = ctx.query?.account;
          return withSpan(
            {
              name: "neurolink.http.claudeProxy.limits",
              tracer: tracers.http,
              attributes: { "http.route": `${basePath}/limits` },
            },
            async () => {
              // Single-flight: concurrent full refreshes share one sweep.
              if (!snapshotOnly && !accountFilter) {
                if (!limitsRefreshInFlight) {
                  limitsRefreshInFlight = refreshAccountLimits({
                    accountAllowlist: effectiveAllowlist,
                  }).finally(() => {
                    limitsRefreshInFlight = null;
                  });
                }
                return limitsRefreshInFlight;
              }
              return refreshAccountLimits({
                accountAllowlist: effectiveAllowlist,
                accountFilter,
                snapshotOnly,
              });
            },
          );
        },
        description:
          "Fetch fresh per-account limits from Anthropic (usage API). " +
          "?account=<label> for one account, ?snapshot=true for stored state",
        tags: ["claude-proxy", "limits"],
      },

      // =====================================================================
      // GET /accounts -- One dashboard-shaped row per account
      // =====================================================================
      // Joins what previously took two calls with incompatible schemas plus a
      // client-side merge: request counters from the usage snapshot, quota from
      // the limits snapshot, and today's tokens and cost from the request log.
      {
        method: "GET",
        path: `${basePath}/accounts`,
        handler: async (ctx: ServerContext) => {
          const routing = runtimeConfigProvider?.();
          const effectiveAllowlist =
            routing?.accountAllowlist ?? accountAllowlist;
          // Hot-reloaded routing wins over the value baked in at construction,
          // the same precedence the request path uses.
          const effectivePrimaryKey =
            routing?.primaryAccountKey ?? primaryAccountKey;
          // Rows carry a bare label in one loop and a full pool key in the
          // other; anthropicAccountKeysEqual normalises both, so neither can
          // miss the match on prefix alone.
          const isPrimaryAccount = (keyOrLabel: string | null): boolean =>
            !!effectivePrimaryKey &&
            !!keyOrLabel &&
            anthropicAccountKeysEqual(keyOrLabel, effectivePrimaryKey);

          // Cached by default. This endpoint is built to be polled, and a live
          // refresh spends the user's own OAuth credentials against Anthropic's
          // usage API — one dashboard on a short interval would hammer it.
          const live = ctx.query?.refresh === "true";

          // A live refresh reconciles cooldowns from the fetched quota, so it
          // makes the same overage judgement the request path does and needs
          // the same operator policy in scope — exactly as /limits sets it.
          if (live) {
            setOveragePolicy(routing?.useOverage);
          }

          // Every other source in this handler degrades to a partial row on
          // failure; quota must too, or one upstream hiccup 500s a dashboard.
          let limits: Awaited<ReturnType<typeof refreshAccountLimits>> = {
            fetchedAt: Date.now(),
            snapshot: !live,
            results: [],
          } as Awaited<ReturnType<typeof refreshAccountLimits>>;
          let quotaError: string | null = null;
          try {
            limits = await refreshAccountLimits({
              accountAllowlist: effectiveAllowlist,
              snapshotOnly: !live,
            });
          } catch (error) {
            quotaError = error instanceof Error ? error.message : String(error);
          }

          const { getUsageSnapshot } =
            await import("../../proxy/usageStats.js");
          const statsAccounts = getUsageSnapshot().stats.accounts;

          // `cooling` is the field an operator actually acts on, and one small
          // file read answers it. `allowed`/`expired` additionally need the
          // token store, which /status guards behind its own timeouts — this
          // route reports them as null rather than taking that latency.
          const now = Date.now();
          // Typed from the loader, NOT re-asserted into a local shape. The
          // first version cast this to `{ until?: number }` and read
          // `.until` — a field PersistedAccountCooldown does not have, so
          // every row reported cooling: false and the assertion is precisely
          // what stopped the compiler from saying so.
          let cooldowns: Record<string, PersistedAccountCooldown> = {};
          try {
            cooldowns = await loadAccountCooldowns();
          } catch {
            // Non-fatal: every row simply reports cooling: false.
          }
          const isCooling = (key: string | null): boolean => {
            if (!key) {
              return false;
            }
            const until = cooldowns[key]?.coolingUntil;
            return typeof until === "number" && until > now;
          };

          let usageByAccount = new Map<string, CliAccountUsageTotals>();
          let usageError: string | null = null;
          let usageDate = "";
          try {
            const { readAccountUsage, currentUsageDate } =
              await import("../../proxy/accountLedger.js");
            usageDate = currentUsageDate();
            usageByAccount = await readAccountUsage(usageDate);
          } catch (error) {
            // Usage is the optional half; quota and status must still render.
            usageError = error instanceof Error ? error.message : String(error);
          }

          // Joined by provider-qualified KEY, never by label. One email can
          // be logged in to both engines; joined by label, the Codex login was
          // swallowed by the Anthropic row (and its counters could land on
          // that row, last write winning). Legacy stats entries that predate
          // the key carry only a label and a type, which is enough to derive
          // it; a keyed entry for the same login wins over a legacy one.
          const statsByKey = new Map<
            string,
            (typeof statsAccounts)[string] & { identityKey: string }
          >();
          for (const [mapKey, entry] of Object.entries(statsAccounts)) {
            const identity = resolveProxyStatusAccountIdentity(
              entry.label,
              entry.type,
              entry.key ?? mapKey,
            );
            const identityKey = identity.key ?? mapKey;
            const existing = statsByKey.get(identityKey);
            if (!existing || (entry.key && !existing.key)) {
              statsByKey.set(identityKey, { ...entry, identityKey });
            }
          }

          // Which logins exist at all, disabled ones included. A stats entry
          // with no login behind it is a REMOVED account, not an unrouted one.
          // If the store cannot be read, err towards showing rows: hiding a
          // real login is the worse mistake, and the old behaviour.
          let knownKeys: Set<string> | null;
          try {
            knownKeys = await listKnownAccountKeys();
          } catch {
            knownKeys = null;
          }

          const rows: CliAccountsRow[] = [];
          const claimed = new Set<string>();

          // Real logins drive the row set. Building it from the log instead
          // would silently drop any account that happened to serve no traffic
          // today, which is exactly when an operator most wants to see it.
          for (const result of limits.results) {
            const label = result.account;
            claimed.add(result.key);
            const stat = statsByKey.get(result.key);
            const quota = normalizeQuotaForAccounts(result.quota);
            const cooling = isCooling(result.key ?? null);
            rows.push({
              label,
              key: result.key ?? null,
              provider: result.provider,
              kind: "account",
              type: result.type ?? stat?.type ?? "oauth",
              // result.status describes how the quota was obtained
              // ("snapshot"/"fetched"), not the account's health, so it must
              // not leak into a field consumers read as health.
              // BOTH quota windows, not just the weekly one. A session
              // window that is rejected or throttled stops the account
              // serving right now — this same file gates routing on
              // `sessionStatus` (see the overage checks above) — so an
              // account with a healthy weekly window and a degraded session
              // window would otherwise be reported "active" while being
              // unable to take work.
              status: cooling
                ? "cooling"
                : quotaHealth(quota?.weeklyStatus) === "degraded" ||
                    quotaHealth(quota?.sessionStatus) === "degraded"
                  ? "exhausted"
                  : "active",
              cooling,
              allowed: null,
              expired: null,
              isPrimary: isPrimaryAccount(result.key ?? label),
              requests: stat ? stat.successCount + stat.errorCount : null,
              errors: stat?.errorCount ?? null,
              rateLimits: stat?.rateLimitCount ?? null,
              quotaRateLimits: stat?.quotaRateLimitCount ?? null,
              quota: quota
                ? ({
                    ...quota,
                    sessionHealth: quotaHealth(quota.sessionStatus),
                    weeklyHealth: quotaHealth(quota.weeklyStatus),
                  } as JsonObject)
                : null,
              usage: usageByAccount.get(result.key) ?? null,
            });
          }

          // Plumbing rows are still reported, but tagged, so a consumer can
          // show or hide them rather than rendering them as credentials.
          //
          // A real login can land here too: the listers skip accounts the
          // token store has disabled or the allowlist excludes, so a login
          // with real usage history but no current route is absent from
          // limits.results. Tagging that as plumbing hid the one account an
          // operator is looking for when they ask why traffic stopped. It
          // stays kind "account", with a status saying why it has no quota
          // block — but only while the login still EXISTS. A stats entry whose
          // login has been removed from the store is history, not a
          // credential, and rendering it as "unrouted" put a phantom account
          // on every dashboard for as long as the counters file lived.
          for (const entry of statsByKey.values()) {
            const identity = resolveProxyStatusAccountIdentity(
              entry.label,
              entry.type,
              entry.identityKey,
            );
            if (identity.key !== null && claimed.has(identity.key)) {
              continue;
            }
            const isLogin = identity.provider !== "other";
            if (
              isLogin &&
              identity.key !== null &&
              knownKeys !== null &&
              !knownKeys.has(identity.key)
            ) {
              continue;
            }
            rows.push({
              label: entry.label,
              key: isLogin ? identity.key : null,
              ...(isLogin ? { provider: identity.provider } : {}),
              kind: isLogin
                ? "account"
                : entry.type === "translation"
                  ? "translation"
                  : "internal",
              // The row's type is the credential kind; the engine is
              // `provider`. Stats record Codex logins as "codex-oauth", which
              // consumers that only know the credential kinds read as
              // plumbing, so it is reported as the OAuth login it is.
              type: identity.provider === "codex" ? "oauth" : entry.type,
              status: isLogin ? "unrouted" : null,
              cooling: false,
              allowed: null,
              expired: null,
              isPrimary: isLogin ? isPrimaryAccount(identity.key) : false,
              requests: entry.successCount + entry.errorCount,
              errors: entry.errorCount,
              rateLimits: entry.rateLimitCount,
              quotaRateLimits: entry.quotaRateLimitCount,
              quota: null,
              // Looked up the same way the routed rows do. These accounts are
              // built FROM today's usage stats, so an account that served
              // requests and was then disabled or excluded still has tokens
              // and cost in the ledger — hardcoding null here discarded
              // exactly the usage an operator is looking for when they ask
              // why traffic stopped.
              usage:
                identity.key !== null
                  ? (usageByAccount.get(identity.key) ?? null)
                  : null,
            });
          }

          const response: CliAccountsResponse = {
            generatedAt: Date.now(),
            usageDate,
            quotaFromSnapshot: !live,
            usageError,
            quotaError,
            // Pooled accounts bill by subscription. This is what the recorded
            // tokens would have cost at published rates — a value estimate, not
            // an invoice — and consumers must label it that way.
            costBasis: "api-equivalent",
            accounts: rows,
          };
          return response;
        },
        description:
          "One row per account: status, quota, and today's tokens and " +
          "API-equivalent cost. ?refresh=true forces a live quota fetch",
        tags: ["claude-proxy", "accounts"],
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

function reconcileEligibleAccountRuntimeState(
  account: ProxyPassthroughAccount,
): void {
  const state = getOrCreateRuntimeState(account.key);
  const tokenChanged =
    state.lastToken !== account.token ||
    state.lastRefreshToken !== account.refreshToken;
  const wasPermanentlyDisabled = state.permanentlyDisabled;
  if (wasPermanentlyDisabled) {
    logger.always(
      `[proxy] account=${account.label} is enabled in the token store; clearing stale runtime auth-disable state`,
    );
  }
  state.permanentlyDisabled = false;
  if (tokenChanged || wasPermanentlyDisabled) {
    state.consecutiveRefreshFailures = 0;
  }
  state.lastToken = account.token;
  state.lastRefreshToken = account.refreshToken;
}

async function disableAccountUntilReauth(
  account: ProxyPassthroughAccount,
  state: RuntimeAccountState,
  reason: "missing_refresh_token" | "refresh_invalid" | "entitlement_blocked",
): Promise<boolean> {
  try {
    const { tokenStore } = await import("../../auth/tokenStore.js");
    const providerKey =
      account.persistTarget &&
      typeof account.persistTarget !== "string" &&
      "providerKey" in account.persistTarget
        ? account.persistTarget.providerKey
        : undefined;
    if (providerKey) {
      const disabled = await tokenStore.markDisabledIfCurrent(
        providerKey,
        {
          accessToken: account.token,
          refreshToken: account.refreshToken,
          expiresAt: account.expiresAt ?? 0,
        },
        reason,
      );
      if (!disabled) {
        state.permanentlyDisabled = false;
        logger.always(
          `[proxy] account=${account.label} credentials changed while authentication was in flight; ignored stale disable`,
        );
        return false;
      }
    } else {
      await tokenStore.markDisabled(account.key, reason);
    }
  } catch (e) {
    logger.debug(
      `[proxy] failed to persist disabled state for ${account.label}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  state.permanentlyDisabled = true;
  logger.always(
    reason === "entitlement_blocked"
      ? `[proxy] account=${account.label} disabled: the organization blocks Claude Code OAuth. Ask an admin to re-enable it, then run: neurolink auth enable ${account.key}`
      : `[proxy] account=${account.label} disabled until re-authentication. Run: neurolink auth login anthropic --method oauth`,
  );
  return true;
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

export function getOverloadRotationDelayMs(attemptNumber: number): number {
  const index = Math.min(
    Math.max(attemptNumber - 1, 0),
    OVERLOAD_ACCOUNT_ROTATION_DELAYS_MS.length - 1,
  );
  return jitteredDelay(OVERLOAD_ACCOUNT_ROTATION_DELAYS_MS[index] ?? 250);
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
 * Whether a transport failure provably happened while connecting, before any
 * byte of the request left the process.
 *
 * Node tags its connect errors with `syscall: "connect"`; with happy-eyeballs
 * enabled (the default) the error is an AggregateError whose every entry is
 * one such attempt, and undici wraps either as `fetch failed` with the
 * original as `cause`. The code alone cannot make this call: an `ETIMEDOUT`
 * from the connect timer and an `ETIMEDOUT` from a socket that went quiet
 * after dispatch look identical by code, and only the first is safe to
 * retry. Both proxies behind one lossy Wi-Fi uplink returned 116 terminal
 * 502s in a day on exactly that ambiguity.
 */
function isConnectPhaseNetworkError(error: unknown): boolean {
  const seen = new Set<object>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as {
      syscall?: unknown;
      errors?: unknown;
      cause?: unknown;
    };
    if (candidate.syscall === "connect") {
      return true;
    }
    if (Array.isArray(candidate.errors) && candidate.errors.length > 0) {
      return candidate.errors.every(
        (entry) =>
          entry !== null &&
          typeof entry === "object" &&
          (entry as { syscall?: unknown }).syscall === "connect",
      );
    }
    current = candidate.cause;
  }
  return false;
}

/**
 * Determine whether a POST can be retried without risking duplicate provider
 * work. Only failures that prove connection establishment did not complete are
 * safe; a reset, socket error, or response timeout can happen after dispatch.
 */
function isRetryableNetworkError(error: unknown): boolean {
  if (isConnectPhaseNetworkError(error)) {
    return true;
  }
  const code = getErrorCode(error);

  return (
    code !== undefined &&
    [
      "ECONNREFUSED",
      "EADDRNOTAVAIL",
      // The Anthropic host is fixed, so ENOTFOUND can be a transient resolver
      // outage. Keep it inside the existing bounded same-account retry budget.
      "ENOTFOUND",
      "EAI_AGAIN",
      "EHOSTUNREACH",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_CONNECT",
    ].includes(code)
  );
}

function classifyNetworkTransportScope(
  error: unknown,
): "shared_provider_transport" | "connection_transport" {
  const code = getErrorCode(error);
  return code === "ENOTFOUND" || code === "EAI_AGAIN"
    ? "shared_provider_transport"
    : "connection_transport";
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
      error?: {
        type?: unknown;
        message?: unknown;
        details?: { error_code?: unknown } | null;
      };
    };
    if (
      parsed &&
      parsed.type === "error" &&
      parsed.error &&
      typeof parsed.error === "object"
    ) {
      const errorCode = parsed.error.details?.error_code;
      return {
        errorType:
          typeof parsed.error.type === "string" ? parsed.error.type : undefined,
        message:
          typeof parsed.error.message === "string"
            ? parsed.error.message
            : undefined,
        ...(typeof errorCode === "string" ? { errorCode } : {}),
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
 * A 404 for a retired model can be served by an explicitly configured fallback;
 * other 404s remain terminal so a bad endpoint or resource is never disguised.
 */
function isAnthropicModelNotFound(status: number, errBody: string): boolean {
  if (status !== 404) {
    return false;
  }
  const parsed = parseClaudeErrorBody(errBody);
  return (
    parsed.errorType === "not_found_error" &&
    (parsed.message ?? "").toLowerCase().includes("model")
  );
}

/**
 * A subscription-specific beta rejection. Anthropic returns
 * `400 invalid_request_error` with a message like
 * "The long context beta is not yet available for this subscription." when an
 * account's plan tier does not grant an optional beta the proxy injected (see
 * CLAUDE_CODE_OAUTH_BETAS in anthropicOAuth.ts). Unlike a genuinely malformed
 * request, the SAME request can succeed on a different account whose tier
 * grants the beta — so this must be treated as retryable on the next account
 * rather than a terminal client-facing 400.
 */
export function isSubscriptionBetaRejection(
  status: number,
  errBody: string,
): boolean {
  if (status !== 400) {
    return false;
  }
  const parsed = parseClaudeErrorBody(errBody);
  if (parsed.errorType !== "invalid_request_error") {
    return false;
  }
  const message = (parsed.message ?? "").toLowerCase();
  return (
    message.includes("beta") &&
    message.includes("subscription") &&
    message.includes("available")
  );
}

/**
 * Organization/plan entitlement codes Anthropic reports in `error.details`.
 * Membership here is what promotes a rejection from "rotate" to "remember".
 */
const ENTITLEMENT_ERROR_CODES = new Set([
  "oauth_not_allowed_for_organization",
  "oauth_not_allowed",
  "organization_disabled",
]);

/**
 * An entitlement rejection: Anthropic refuses THIS credential on organization
 * or plan policy, e.g. `403 permission_error` /
 * "OAuth authentication is currently not allowed for this organization."
 *
 * The taxonomy makes this safe to rotate on: `permission_error` is reserved for
 * credential/organization permission, distinct from `invalid_request_error`
 * (request shape) and `not_found_error`, both already terminal above. No
 * `permission_error` is caused by the request body, so the identical request
 * can succeed on a different account.
 *
 * Deliberately broad — rotation is cheap and reversible. Persisting the block
 * is gated on the narrower {@link isDurableEntitlementBlock}.
 */
export function isAccountEntitlementError(
  status: number,
  errBody: string,
): boolean {
  if (status !== 401 && status !== 402 && status !== 403) {
    return false;
  }
  const parsed = parseClaudeErrorBody(errBody);
  if (parsed.errorType === "permission_error") {
    return true;
  }
  return (
    parsed.errorCode !== undefined &&
    ENTITLEMENT_ERROR_CODES.has(parsed.errorCode)
  );
}

/**
 * Whether an entitlement rejection is specific enough to disable the account
 * until someone re-enables it. Narrower than {@link isAccountEntitlementError}
 * because disabling is sticky and user-visible: an unrecognised
 * `permission_error` should rotate through the pool and surface a 403, never
 * durably remove a credential on a guess.
 */
export function isDurableEntitlementBlock(
  status: number,
  errBody: string,
): boolean {
  if (!isAccountEntitlementError(status, errBody)) {
    return false;
  }
  const parsed = parseClaudeErrorBody(errBody);
  return (
    parsed.errorCode !== undefined &&
    ENTITLEMENT_ERROR_CODES.has(parsed.errorCode)
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

/**
 * An upstream overload is already a capacity signal. Retrying it on the same
 * OAuth account only consumes its remaining concurrency and delays rotation.
 */
export function isUpstreamOverload(status: number, errBody: string): boolean {
  return (
    status === 529 ||
    parseClaudeErrorBody(errBody).errorType === "overloaded_error"
  );
}

/** Remove provider credentials before they enter persistent proxy diagnostics. */
const MAX_PROVIDER_ERROR_MESSAGE_LENGTH = 500;

export function redactProviderErrorMessage(message: string): string {
  return sanitizeForLog(message, MAX_PROVIDER_ERROR_MESSAGE_LENGTH);
}

// ---------------------------------------------------------------------------
// Test hooks (not part of the public SDK API). Only consumed by the proxy
// continuous-test-suite to drive the in-process resolver/reset logic without
// spinning up a full proxy. Keep this surface small.
// ---------------------------------------------------------------------------

export const __testHooks = {
  normalizeQuotaForAccounts,
  resolveHomeIndex,
  maybeResetPrimaryToHome,
  planCooldownFor429,
  reconcileCooldownFromQuota,
  refreshAccountLimits,
  applyAccountUsageResult,
  clearLimitsRefreshStateForTests: (): void => {
    lastUsageFetchAt.clear();
    limitsRefreshInFlight = null;
    accountQuotaRefreshCoordinator.clear();
  },
  setAccountDirectoryForTests: (
    override: ProxyAccountDirectoryOverride | null,
  ): void => {
    accountDirectoryOverride = override;
  },
  isRetryableNetworkError,
  isConnectPhaseNetworkError,
  MAX_CONNECT_PHASE_SAME_ACCOUNT_RETRIES,
  clearProviderTransportCoordinatorForTests: (): void => {
    providerTransportCoordinator.clear();
  },
  isPermanentRefreshFailure,
  getStreamFailureDetails,
  trackUpstreamReadableStream,
  orderAccountsByQuota,
  scheduleAdaptiveQuotaRefreshes,
  scheduleHandoffQuotaRefresh,
  getQuotaRefreshState: (key: string) =>
    accountQuotaRefreshCoordinator.getState(key),
  buildQuotaRoutingDecision: (
    accounts: ProxyPassthroughAccount[],
    now: number,
    primaryKey: string | undefined,
    sessionSoftLimit: number = getSessionSoftLimit(),
    sessionResetToleranceMs: number = getSessionResetToleranceMs(),
    requestedModel?: string,
  ): ProxyAccountRoutingDecision | undefined => {
    const order = orderAccountsByQuotaWithMetrics(
      accounts,
      now,
      primaryKey,
      sessionSoftLimit,
      sessionResetToleranceMs,
      requestedModel,
    );
    return buildRoutingDecision({
      accounts,
      orderedAccounts: order.orderedAccounts,
      metricsByKey: order.metricsByKey,
      evaluatedAt: now,
      strategy: "fill-first",
      primaryKey,
      quotaRoutingEnabled: true,
      quotaOrdered: accounts.length > 1,
      sessionSoftLimit,
      sessionResetToleranceMs,
      rotationOffset: 0,
    });
  },
  buildRoutingDecision,
  resetEpochToMs,
  seedRuntimeQuotasFromDisk,
  reconcileEligibleAccountRuntimeState,
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
    accountAdmissionStates.clear();
    accountQuotaRefreshCoordinator.clear();
    providerTransportCoordinator.clear();
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
  handleAnthropicNonOkResponse,
  handleAnthropicAuthRetry,
  handleAnthropicStreamingSuccessResponse,
  claimTransientRateLimitRetry,
  claimTransientCooldownAdmission,
  waitForTransientAccountAvailability,
  acquireAccountAdmission,
  acquireFirstAvailableAccountAdmission,
  tryAcquireAccountAdmission,
  enqueueAccountAdmission,
  getAccountAdmissionSnapshot: (accountKey: string) => {
    const state = accountAdmissionStates.get(accountKey);
    return state
      ? { active: state.active, waiting: state.waiters.length }
      : { active: 0, waiting: 0 };
  },
  // The snapshot above reports {active:0, waiting:0} both for "no entry" and
  // for "empty entry", so it cannot see a stranded allocation. This can.
  hasAccountAdmissionState: (accountKey: string): boolean =>
    accountAdmissionStates.has(accountKey),
  describeTransportError,
  redactProviderErrorMessage,
  isUpstreamOverload,
  getOverloadRotationDelayMs,
  redactHeadersForBorrower,
  shouldAttemptClaudeFallback,
  isAnthropicModelNotFound,
  getCodexFallbackInvalidRequestFailure,
  executeClaudeFallbackWithRetry,
  buildClaudeAnthropicFailureResponse,
  isAccountEntitlementError,
  isDurableEntitlementBlock,
  evaluateScopedExhaustion,
  matchScopedQuotaWindow,
  setOveragePolicy,
};
