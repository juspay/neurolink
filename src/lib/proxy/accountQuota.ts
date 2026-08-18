/**
 * Per-Account Quota Tracking
 *
 * Captures Anthropic rate-limit / utilisation headers from proxy responses
 * and persists them to ~/.neurolink/account-quotas.json so the CLI can
 * display remaining session & weekly capacity per account.
 *
 * Hot-path design: parseQuotaHeaders is pure CPU (no I/O). saveAccountQuota
 * updates an in-memory cache and debounces disk writes so the request/response
 * path is never blocked by file I/O.
 */

import { join } from "path";
import { homedir } from "os";
import { promises as fs } from "fs";
import type { AccountQuota, AccountQuotaWindow } from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

// ---------------------------------------------------------------------------
// Header parsing (pure CPU — no I/O, safe for hot path)
// ---------------------------------------------------------------------------

function getHeader(
  headers: Headers | Record<string, string>,
  name: string,
): string | undefined {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const rec = headers as Record<string, string>;
  if (rec[name] !== undefined) {
    return rec[name];
  }
  const lower = name.toLowerCase();
  for (const key of Object.keys(rec)) {
    if (key.toLowerCase() === lower) {
      return rec[key];
    }
  }
  return undefined;
}

/** Enumerate header names, working for both `Headers` and a plain record. */
function forEachHeaderName(
  headers: Headers | Record<string, string>,
  visit: (name: string) => void,
): void {
  if (typeof (headers as Headers).forEach === "function") {
    (headers as Headers).forEach((_value, name) => visit(name));
    return;
  }
  for (const name of Object.keys(headers as Record<string, string>)) {
    visit(name);
  }
}

/**
 * Collapse a wire model id to its family by dropping the snapshot date, so
 * `claude-fable-5-20260115` and `claude-fable-5-20260320` both tag the same
 * scoped window. Without this a window would stop matching the day Anthropic
 * ships a new snapshot.
 */
export function modelFamilyToken(model: string): string {
  return model
    .trim()
    .replace(/[-_](latest)$/i, "")
    .replace(/-\d{6,8}$/, "");
}

/** Unified header window tokens that map to the flat session/weekly fields. */
const FLAT_UNIFIED_WINDOW_TOKENS = new Set(["5h", "7d"]);

const UNIFIED_UTILIZATION_HEADER =
  /^anthropic-ratelimit-unified-([a-z0-9_]+)-utilization$/;

/**
 * Discover model-scoped rate-limit windows from response headers.
 *
 * Anthropic reports a per-model weekly cap as its own header family — today
 * `anthropic-ratelimit-unified-7d_oi-*`, sent only on responses for the model
 * that cap applies to. The token is matched generically rather than hardcoded
 * so a future `7d_xx` is captured without a code change, mirroring how
 * `mapUsageLimit` preserves the provider's vocabulary verbatim.
 *
 * Requires the request's model: the header states a limit but never says which
 * model it scopes, and an untagged window cannot be matched to a later request.
 */
function parseScopedQuotaWindows(
  headers: Headers | Record<string, string>,
  model: string | undefined,
  now: number,
): AccountQuotaWindow[] {
  if (!model) {
    return [];
  }
  const scopeModel = modelFamilyToken(model);
  if (!scopeModel) {
    return [];
  }
  const tokens: string[] = [];
  forEachHeaderName(headers, (name) => {
    const match = UNIFIED_UTILIZATION_HEADER.exec(name.toLowerCase());
    if (match?.[1] && !FLAT_UNIFIED_WINDOW_TOKENS.has(match[1])) {
      tokens.push(match[1]);
    }
  });
  const windows: AccountQuotaWindow[] = [];
  for (const token of tokens) {
    const P = `anthropic-ratelimit-unified-${token}-`;
    const used = parseFloat(getHeader(headers, `${P}utilization`) ?? "");
    if (Number.isNaN(used)) {
      continue;
    }
    const resetRaw = getHeader(headers, `${P}reset`);
    const status = getHeader(headers, `${P}status`)?.trim().toLowerCase();
    windows.push({
      kind: token.startsWith("7d") ? "weekly_scoped" : "session_scoped",
      group: token.startsWith("7d") ? "weekly" : "session",
      used,
      status: status ?? "unknown",
      resetsAt: resetRaw ? parseInt(resetRaw, 10) || 0 : 0,
      scopeModel,
      scopeModelId: model,
      headerWindow: token,
      source: "headers",
      updatedAt: now,
    });
  }
  return windows;
}

/** Read and normalize Anthropic's authoritative top-level unified status. */
export function getUnifiedRateLimitStatus(
  headers: Headers | Record<string, string>,
): string | undefined {
  const value = getHeader(headers, "anthropic-ratelimit-unified-status");
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

/**
 * Whether Anthropic explicitly permits a request to use overage after a
 * subscription window is exhausted. An active overage signal is authoritative;
 * otherwise fresh responses require explicit fallback and upgrade-path signals.
 * Older persisted snapshots predate those raw fields, but retain a positive
 * fallback percentage together with an allowed overage status, which is the
 * equivalent provider state.
 */
export function isQuotaOverageAvailable(
  quota:
    | Pick<
        AccountQuota,
        | "fallbackPercentage"
        | "fallbackStatus"
        | "overageStatus"
        | "overageInUse"
        | "overageEnabled"
        | "overageDisabledReason"
        | "upgradePaths"
      >
    | null
    | undefined,
): boolean {
  // `extra_usage.is_enabled` from the usage API is the account's own setting and
  // is reported even for an account that has never served a request, which the
  // header signals below cannot cover. Positive only: it is refreshed far less
  // often than headers are, so a stale `false` must not veto live evidence that
  // overage is actually serving.
  //
  // It is also sticky — the merge carries it forward whenever a payload omits
  // `extra_usage` — so a live header saying overage is switched off must be
  // able to veto it. Without that veto an org disabling extra usage would leave
  // the flag true forever, suppressing every cooldown and sending request after
  // request that is certain to 429.
  const overageStatus = quota?.overageStatus?.trim().toLowerCase();
  const providerDisabledOverage =
    overageStatus === "rejected" || quota?.overageDisabledReason !== undefined;
  if (quota?.overageEnabled === true && !providerDisabledOverage) {
    return true;
  }
  // Explicit null check: overageStatus is now read before this point, so the
  // optional-chain no longer narrows `quota` for the accesses below.
  if (!quota || overageStatus !== "allowed") {
    return false;
  }
  if (quota.overageInUse === true) {
    return true;
  }
  const explicitFallback = quota.fallbackStatus?.trim().toLowerCase();
  const hasExplicitOveragePath = (quota.upgradePaths ?? "")
    .split(",")
    .map((path) => path.trim().toLowerCase())
    .includes("overage");
  if (explicitFallback === "available" && hasExplicitOveragePath) {
    return true;
  }
  return explicitFallback === undefined && (quota.fallbackPercentage ?? 0) > 0;
}

/**
 * Parse Anthropic rate-limit / quota headers into an `AccountQuota`.
 * Returns `null` when key headers are absent.
 * Pure computation — no I/O, no blocking.
 */
export function parseQuotaHeaders(
  headers: Headers | Record<string, string>,
  opts?: { model?: string; now?: number },
): AccountQuota | null {
  // Anthropic prefixes all quota headers with "anthropic-ratelimit-"
  const P = "anthropic-ratelimit-";
  const sessionUtilRaw = getHeader(headers, `${P}unified-5h-utilization`);
  const weeklyUtilRaw = getHeader(headers, `${P}unified-7d-utilization`);

  if (sessionUtilRaw === undefined || weeklyUtilRaw === undefined) {
    return null;
  }

  const sessionUsed = parseFloat(sessionUtilRaw);
  const weeklyUsed = parseFloat(weeklyUtilRaw);

  if (Number.isNaN(sessionUsed) || Number.isNaN(weeklyUsed)) {
    return null;
  }

  const sessionResetRaw = getHeader(headers, `${P}unified-5h-reset`);
  const weeklyResetRaw = getHeader(headers, `${P}unified-7d-reset`);
  const fallbackRaw = getHeader(headers, `${P}unified-fallback-percentage`);
  const now = opts?.now ?? Date.now();
  const scopedWindows = parseScopedQuotaWindows(headers, opts?.model, now);
  const overageDisabledReason = getHeader(
    headers,
    `${P}unified-overage-disabled-reason`,
  );
  const representativeClaim = getHeader(
    headers,
    `${P}unified-representative-claim`,
  );

  return {
    unifiedStatus: getUnifiedRateLimitStatus(headers),
    sessionUsed,
    sessionStatus: getHeader(headers, `${P}unified-5h-status`) ?? "unknown",
    sessionResetAt: sessionResetRaw ? parseInt(sessionResetRaw, 10) || 0 : 0,
    weeklyUsed,
    weeklyStatus: getHeader(headers, `${P}unified-7d-status`) ?? "unknown",
    weeklyResetAt: weeklyResetRaw ? parseInt(weeklyResetRaw, 10) || 0 : 0,
    fallbackPercentage: fallbackRaw ? parseFloat(fallbackRaw) || 0 : 0,
    // Anthropic does not send `unified-fallback` on the current wire, so this is
    // always "unknown" in practice, which keeps the legacy back-compat branch of
    // isQuotaOverageAvailable inert. Left as-is deliberately: making that branch
    // reachable would stop cooling accounts that today park correctly, and the
    // authoritative extra-usage signal now comes from `overageEnabled` instead.
    fallbackStatus: getHeader(headers, `${P}unified-fallback`) ?? "unknown",
    upgradePaths: getHeader(headers, `${P}unified-upgrade-paths`),
    overageStatus:
      getHeader(headers, `${P}unified-overage-status`) ?? "unknown",
    overageInUse:
      getHeader(headers, `${P}unified-overage-in-use`)?.trim().toLowerCase() ===
      "true",
    ...(overageDisabledReason ? { overageDisabledReason } : {}),
    ...(representativeClaim ? { representativeClaim } : {}),
    lastUpdated: now,
    source: "headers",
    ...(scopedWindows.length > 0 ? { windows: scopedWindows } : {}),
  };
}

/**
 * Identity of a window across refreshes.
 *
 * Scope identity uses `scopeModel` — the model *family* on header-derived
 * windows — ahead of the dated wire id, so a new model snapshot updates the
 * existing window instead of appending a second one for the same cap and
 * growing the array on every release. `source` keeps the two providers' views
 * of the same cap distinct, since they name it differently and are reconciled
 * by freshness rather than merged.
 */
function quotaWindowKey(window: AccountQuotaWindow): string {
  return [
    window.kind,
    window.source ?? "usage-api",
    window.headerWindow ?? "",
    window.scopeModel ?? window.scopeModelId ?? "",
    window.scopeSurface ?? "",
  ].join("|");
}

/**
 * Merge dynamic limit windows across snapshots from different sources.
 *
 * The two sources see different things and neither is a superset: the usage API
 * reports every plan bucket but only when explicitly refreshed, while response
 * headers report only the window(s) touched by the request just served — but do
 * so continuously. A plain overwrite in either direction loses real data, which
 * is why a header capture used to erase the model-scoped windows a `/limits`
 * refresh had just fetched.
 */
export function mergeQuotaWindows(
  existing: AccountQuotaWindow[] | undefined,
  incoming: AccountQuotaWindow[] | undefined,
): AccountQuotaWindow[] | undefined {
  if (!incoming?.length) {
    return existing;
  }
  if (!existing?.length) {
    return incoming;
  }
  const merged = new Map<string, AccountQuotaWindow>();
  const incomingFromUsageApi = incoming.some(
    (window) => (window.source ?? "usage-api") === "usage-api",
  );
  for (const window of existing) {
    // A usage-API sweep is authoritative for every bucket it reports, but it
    // never reports the header-only scoped windows — so those are carried over.
    if (incomingFromUsageApi && (window.source ?? "usage-api") !== "headers") {
      continue;
    }
    merged.set(quotaWindowKey(window), window);
  }
  for (const window of incoming) {
    merged.set(quotaWindowKey(window), window);
  }
  return [...merged.values()];
}

/**
 * Fold a freshly observed snapshot onto the previous one for the same account,
 * preserving dynamic windows the new snapshot does not carry.
 */
export function mergeQuotaSnapshot(
  previous: AccountQuota | undefined,
  incoming: AccountQuota,
): AccountQuota {
  if (!previous) {
    return incoming;
  }
  const windows = mergeQuotaWindows(previous.windows, incoming.windows);
  const next: AccountQuota = { ...incoming };
  if (windows !== undefined) {
    next.windows = windows;
  }
  // Account configuration, not per-response state: each source reports only
  // some of these, so a plain overwrite makes the value flicker in and out
  // depending on which source wrote last. `overageEnabled` comes only from the
  // usage API and `overageDisabledReason` only from response headers, so
  // whichever wrote last would otherwise erase the other's field.
  if (
    next.overageEnabled === undefined &&
    previous.overageEnabled !== undefined
  ) {
    next.overageEnabled = previous.overageEnabled;
  }
  if (
    next.overageDisabledReason === undefined &&
    previous.overageDisabledReason !== undefined
  ) {
    next.overageDisabledReason = previous.overageDisabledReason;
  }
  if (
    next.representativeClaim === undefined &&
    previous.representativeClaim !== undefined
  ) {
    next.representativeClaim = previous.representativeClaim;
  }
  // windowsUpdatedAt tracks the last full usage-API sweep; a header capture
  // adds one window and must not claim to have refreshed all of them.
  const windowsUpdatedAt =
    incoming.source === "usage-api"
      ? incoming.windowsUpdatedAt
      : (incoming.windowsUpdatedAt ?? previous.windowsUpdatedAt);
  if (windowsUpdatedAt !== undefined) {
    next.windowsUpdatedAt = windowsUpdatedAt;
  }
  return next;
}

// ---------------------------------------------------------------------------
// In-memory cache + debounced async persistence
// ---------------------------------------------------------------------------

const QUOTA_FILE = "account-quotas.json";
const FLUSH_INTERVAL_MS = 5_000; // write to disk at most every 5 seconds

let memoryCache: Record<string, AccountQuota> = {};
let cacheLoaded = false;
let cacheLoadPromise: Promise<void> | null = null;
let dirty = false;
let cacheVersion = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const stateMutex = new AsyncMutex();
const flushMutex = new AsyncMutex();

/** Custom quota file path set via initAccountQuota(). */
let customQuotaFilePath: string | null = null;

/**
 * Initialise the quota module with a custom file path.
 * When set, all reads/writes go to this path instead of the default
 * ~/.neurolink/account-quotas.json. Call before the first load/save.
 */
export function initAccountQuota(quotaFilePath: string): void {
  customQuotaFilePath = quotaFilePath;
  // Cancel any pending flush from a previous configuration so it does not
  // write stale data to the new path.
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  // Reset cache so the new path is picked up on next load
  memoryCache = {};
  cacheLoaded = false;
  cacheLoadPromise = null;
  dirty = false;
  cacheVersion = 0;
}

function getQuotaFilePath(): string {
  return customQuotaFilePath ?? join(homedir(), ".neurolink", QUOTA_FILE);
}

/** Flush the in-memory cache to disk (async, non-blocking). */
async function flushToDisk(): Promise<void> {
  await flushMutex.runExclusive(async () => {
    let snapshot: Record<string, AccountQuota> | undefined;
    let snapshotVersion = 0;
    let filePath = "";

    await stateMutex.runExclusive(async () => {
      if (!dirty) {
        return;
      }
      snapshot = Object.fromEntries(
        Object.entries(memoryCache).map(([key, quota]) => [key, { ...quota }]),
      );
      snapshotVersion = cacheVersion;
      filePath = getQuotaFilePath();
    });

    if (!snapshot) {
      return;
    }

    try {
      await writeJsonSnapshotAtomically(filePath, snapshot, 0o600);
      await stateMutex.runExclusive(async () => {
        if (cacheVersion === snapshotVersion) {
          dirty = false;
        }
      });
    } catch {
      // Non-fatal — quota is best-effort telemetry
    }
  });
}

function scheduleFlush(): void {
  if (flushTimer) {
    return;
  } // already scheduled
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushToDisk().catch(() => {
      // Non-fatal: quota persistence is best-effort
    });
  }, FLUSH_INTERVAL_MS);
  // Don't prevent process exit
  if (flushTimer && typeof flushTimer === "object" && "unref" in flushTimer) {
    flushTimer.unref();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load all persisted account quotas.
 * First call reads from disk; subsequent calls return the in-memory cache.
 */
async function ensureAccountQuotasLoaded(): Promise<void> {
  if (!cacheLoaded) {
    if (!cacheLoadPromise) {
      cacheLoadPromise = (async () => {
        try {
          const raw = await fs.readFile(getQuotaFilePath(), "utf-8");
          memoryCache = JSON.parse(raw) as Record<string, AccountQuota>;
        } catch {
          memoryCache = {};
        }
        cacheLoaded = true;
      })().finally(() => {
        cacheLoadPromise = null;
      });
    }
    await cacheLoadPromise;
  }
}

export async function loadAccountQuotas(): Promise<
  Record<string, AccountQuota>
> {
  await ensureAccountQuotasLoaded();
  return stateMutex.runExclusive(async () => ({ ...memoryCache }));
}

/**
 * Load quota for a single account.
 */
export async function loadAccountQuota(
  accountKey: string,
): Promise<AccountQuota | null> {
  const all = await loadAccountQuotas();
  return all[accountKey] ?? null;
}

/**
 * Update quota for a single account.
 * Updates in-memory cache immediately (non-blocking),
 * then debounces the disk write to every 5 seconds.
 *
 * Loads the persisted file into the cache before the first write so a save
 * after a process restart merges with existing entries instead of rewriting
 * the file with only the accounts used since boot (which silently erased
 * other accounts' snapshots and blinded quota-aware routing to them).
 */
export async function saveAccountQuota(
  accountKey: string,
  quota: AccountQuota,
): Promise<void> {
  await stateMutex.runExclusive(async () => {
    await ensureAccountQuotasLoaded();
    // A header capture reports only the windows the served request touched, so
    // it must fold onto the existing snapshot rather than replace it.
    memoryCache[accountKey] = mergeQuotaSnapshot(
      memoryCache[accountKey],
      quota,
    );
    dirty = true;
    cacheVersion += 1;
  });
  scheduleFlush();
}

/**
 * Cancel any pending debounced write and flush the cache to disk now.
 * Short-lived processes (CLI refresh path) must call this before exit —
 * the debounce timer is unref()'d and will not keep the process alive.
 */
export async function flushAccountQuotas(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushToDisk();
}

export async function flushAccountQuotaStateForTests(): Promise<void> {
  await flushAccountQuotas();
}
