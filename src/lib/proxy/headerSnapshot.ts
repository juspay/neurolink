/**
 * Per-Account Header Snapshot Storage
 *
 * Records request headers from real Claude Code requests and persists them
 * to ~/.neurolink/header-snapshots/<account-key>.json so the proxy can
 * polyfill missing headers on non-Claude-Code requests (replay mode).
 *
 * Hot-path design follows accountQuota.ts: in-memory cache with debounced
 * disk writes so the request/response path is never blocked by file I/O.
 */

import { join } from "path";
import { homedir } from "os";
import { promises as fs } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeaderSnapshot = {
  accountKey: string;
  capturedAt: string;
  headers: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Headers to exclude from capture (handled by other parts of the proxy)
// ---------------------------------------------------------------------------

/** Auth headers — proxy sets these from account tokens. */
const EXCLUDED_AUTH: ReadonlySet<string> = new Set([
  "authorization",
  "x-api-key",
  "proxy-authorization",
]);

/** Body/transport headers — set by HTTP stack or proxy. */
const EXCLUDED_TRANSPORT: ReadonlySet<string> = new Set([
  "content-length",
  "transfer-encoding",
  "content-encoding",
  "content-type",
]);

/** Hop-by-hop headers per RFC 7230. */
const EXCLUDED_HOP_BY_HOP: ReadonlySet<string> = new Set([
  "connection",
  "keep-alive",
  "upgrade",
  "te",
  "trailer",
]);

/** Session headers — not needed for Anthropic API. */
const EXCLUDED_SESSION: ReadonlySet<string> = new Set(["cookie", "set-cookie"]);

function shouldExclude(headerName: string): boolean {
  const lower = headerName.toLowerCase();
  return (
    EXCLUDED_AUTH.has(lower) ||
    EXCLUDED_TRANSPORT.has(lower) ||
    EXCLUDED_HOP_BY_HOP.has(lower) ||
    EXCLUDED_SESSION.has(lower)
  );
}

// ---------------------------------------------------------------------------
// In-memory cache + debounced async persistence
// ---------------------------------------------------------------------------

const SNAPSHOTS_DIR = "header-snapshots";
const FLUSH_INTERVAL_MS = 5_000;

const memoryCache = new Map<string, HeaderSnapshot>();
let dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getSnapshotsDir(): string {
  return join(homedir(), ".neurolink", SNAPSHOTS_DIR);
}

function getSnapshotPath(accountKey: string): string {
  // Sanitise account key for filesystem: replace non-alphanumeric with _
  const safeKey = accountKey.replace(/[^a-zA-Z0-9._@-]/g, "_");
  return join(getSnapshotsDir(), `${safeKey}.json`);
}

async function ensureDir(): Promise<void> {
  await fs
    .mkdir(getSnapshotsDir(), { recursive: true, mode: 0o700 })
    .catch(() => {
      // Non-fatal: directory may already exist
    });
}

async function flushToDisk(): Promise<void> {
  if (dirty.size === 0) {
    return;
  }

  const toFlush = dirty;
  dirty = new Set();

  await ensureDir();

  for (const accountKey of toFlush) {
    const snapshot = memoryCache.get(accountKey);
    if (!snapshot) {
      continue;
    }

    try {
      const filePath = getSnapshotPath(accountKey);
      const tmpPath = `${filePath}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(snapshot, null, 2), {
        mode: 0o600,
      });
      await fs.rename(tmpPath, filePath);
    } catch {
      // Non-fatal: header snapshot persistence is best-effort
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushToDisk().catch(() => {
      // Non-fatal: best-effort persistence
    });
  }, FLUSH_INTERVAL_MS);
  if (flushTimer && typeof flushTimer === "object" && "unref" in flushTimer) {
    flushTimer.unref();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Filter and extract headers worth snapshotting from a request.
 * Returns only headers not handled by other parts of the proxy.
 */
export function extractSnapshotHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!shouldExclude(key)) {
      result[key.toLowerCase()] = value;
    }
  }
  return result;
}

/**
 * Save a header snapshot for an account.
 * Updates in-memory cache immediately, debounces disk write.
 */
export function saveHeaderSnapshot(
  accountKey: string,
  headers: Record<string, string>,
): void {
  const filtered = extractSnapshotHeaders(headers);

  // Only save if we have meaningful headers to record
  if (Object.keys(filtered).length === 0) {
    return;
  }

  const snapshot: HeaderSnapshot = {
    accountKey,
    capturedAt: new Date().toISOString(),
    headers: filtered,
  };

  memoryCache.set(accountKey, snapshot);
  dirty.add(accountKey);
  scheduleFlush();
}

/**
 * Load a header snapshot for an account.
 * First call for an account reads from disk; subsequent calls return cache.
 */
export async function loadHeaderSnapshot(
  accountKey: string,
): Promise<HeaderSnapshot | null> {
  const cached = memoryCache.get(accountKey);
  if (cached) {
    return cached;
  }

  try {
    const raw = await fs.readFile(getSnapshotPath(accountKey), "utf-8");
    const snapshot = JSON.parse(raw) as HeaderSnapshot;
    memoryCache.set(accountKey, snapshot);
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Polyfill missing headers from a stored snapshot.
 * Only injects headers that are absent from the current request.
 * Returns the number of headers polyfilled.
 */
export async function polyfillHeaders(
  accountKey: string,
  headers: Record<string, string>,
): Promise<number> {
  const snapshot = await loadHeaderSnapshot(accountKey);
  if (!snapshot) {
    return 0;
  }

  let count = 0;
  for (const [key, value] of Object.entries(snapshot.headers)) {
    const lower = key.toLowerCase();
    // Only inject if the header is missing from the current request
    if (!(lower in headers) && !shouldExclude(lower)) {
      headers[lower] = value;
      count++;
    }
  }
  return count;
}
