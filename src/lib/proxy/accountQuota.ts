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
import type { AccountQuota } from "../types/index.js";
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
 * subscription window is exhausted. Fresh responses require all three
 * provider signals. Older persisted snapshots predate the raw fallback and
 * upgrade-path fields, but retain a positive fallback percentage together with
 * an allowed overage status, which is the equivalent provider state.
 */
export function isQuotaOverageAvailable(
  quota:
    | Pick<
        AccountQuota,
        | "fallbackPercentage"
        | "fallbackStatus"
        | "overageStatus"
        | "upgradePaths"
      >
    | null
    | undefined,
): boolean {
  if (quota?.overageStatus?.trim().toLowerCase() !== "allowed") {
    return false;
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

  return {
    unifiedStatus: getUnifiedRateLimitStatus(headers),
    sessionUsed,
    sessionStatus: getHeader(headers, `${P}unified-5h-status`) ?? "unknown",
    sessionResetAt: sessionResetRaw ? parseInt(sessionResetRaw, 10) || 0 : 0,
    weeklyUsed,
    weeklyStatus: getHeader(headers, `${P}unified-7d-status`) ?? "unknown",
    weeklyResetAt: weeklyResetRaw ? parseInt(weeklyResetRaw, 10) || 0 : 0,
    fallbackPercentage: fallbackRaw ? parseFloat(fallbackRaw) || 0 : 0,
    fallbackStatus: getHeader(headers, `${P}unified-fallback`) ?? "unknown",
    upgradePaths: getHeader(headers, `${P}unified-upgrade-paths`),
    overageStatus:
      getHeader(headers, `${P}unified-overage-status`) ?? "unknown",
    lastUpdated: Date.now(),
    source: "headers",
  };
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
    const next: AccountQuota = { ...quota };
    // Header-sourced saves carry no dynamic windows; a passive capture right
    // after a usage-API refresh must not erase the refreshed buckets.
    const existing = memoryCache[accountKey];
    if (next.windows === undefined && existing?.windows !== undefined) {
      next.windows = existing.windows;
      next.windowsUpdatedAt = existing.windowsUpdatedAt;
    }
    memoryCache[accountKey] = next;
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
