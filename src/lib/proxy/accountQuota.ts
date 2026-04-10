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

import { dirname, join } from "path";
import { homedir } from "os";
import { promises as fs } from "fs";
import type { AccountQuota } from "../types/index.js";

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
    sessionUsed,
    sessionStatus: getHeader(headers, `${P}unified-5h-status`) ?? "unknown",
    sessionResetAt: sessionResetRaw ? parseInt(sessionResetRaw, 10) || 0 : 0,
    weeklyUsed,
    weeklyStatus: getHeader(headers, `${P}unified-7d-status`) ?? "unknown",
    weeklyResetAt: weeklyResetRaw ? parseInt(weeklyResetRaw, 10) || 0 : 0,
    fallbackPercentage: fallbackRaw ? parseFloat(fallbackRaw) || 0 : 0,
    overageStatus:
      getHeader(headers, `${P}unified-overage-status`) ?? "unknown",
    lastUpdated: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// In-memory cache + debounced async persistence
// ---------------------------------------------------------------------------

const QUOTA_FILE = "account-quotas.json";
const FLUSH_INTERVAL_MS = 5_000; // write to disk at most every 5 seconds

let memoryCache: Record<string, AccountQuota> = {};
let cacheLoaded = false;
let dirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

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
  dirty = false;
}

function getQuotaFilePath(): string {
  return customQuotaFilePath ?? join(homedir(), ".neurolink", QUOTA_FILE);
}

async function ensureDir(): Promise<void> {
  const filePath = getQuotaFilePath();
  const dir = dirname(filePath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 }).catch(() => {
    // Non-fatal: directory may already exist
  });
}

/** Flush the in-memory cache to disk (async, non-blocking). */
async function flushToDisk(): Promise<void> {
  if (!dirty) {
    return;
  }
  try {
    // Snapshot before async I/O so we only clear dirty if nothing changed
    const snapshot = JSON.stringify(memoryCache, null, 2);
    await ensureDir();
    const filePath = getQuotaFilePath();
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, snapshot, {
      mode: 0o600,
    });
    await fs.rename(tmpPath, filePath);
    // Only clear dirty if the cache hasn't changed during the write
    if (JSON.stringify(memoryCache, null, 2) === snapshot) {
      dirty = false;
    }
  } catch {
    // Non-fatal — quota is best-effort telemetry
  }
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
export async function loadAccountQuotas(): Promise<
  Record<string, AccountQuota>
> {
  if (cacheLoaded) {
    return { ...memoryCache };
  }
  try {
    const raw = await fs.readFile(getQuotaFilePath(), "utf-8");
    memoryCache = JSON.parse(raw) as Record<string, AccountQuota>;
  } catch {
    memoryCache = {};
  }
  cacheLoaded = true;
  return { ...memoryCache };
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
 */
export async function saveAccountQuota(
  accountKey: string,
  quota: AccountQuota,
): Promise<void> {
  memoryCache[accountKey] = quota;
  cacheLoaded = true;
  dirty = true;
  scheduleFlush();
}
