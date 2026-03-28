/**
 * Per-Account Body Snapshot — records and replays body-level transforms
 * that Claude Code injects into requests (billing header, agent block,
 * metadata.user_id).
 *
 * These transforms are required by Anthropic for OAuth accounts to access
 * sonnet/opus models. Without them, Anthropic returns a generic "Error".
 *
 * Recording captures the TEMPLATE values (version, entrypoint, agent text)
 * from real Claude Code requests. Replay re-computes dynamic parts (cch hash,
 * random hex, user_id) at request time.
 *
 * Storage: ~/.neurolink/body-snapshots/<account-key>.json
 */

import { join } from "path";
import { homedir } from "os";
import { promises as fs } from "fs";
import { randomBytes, randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BodySnapshot = {
  accountKey: string;
  capturedAt: string;
  /** Claude CLI version extracted from billing header (e.g. "2.1.63") */
  ccVersion: string;
  /** Entrypoint from billing header (e.g. "cli") */
  ccEntrypoint: string;
  /** Agent block text */
  agentBlockText: string;
};

// ---------------------------------------------------------------------------
// In-memory cache + debounced async persistence
// ---------------------------------------------------------------------------

const SNAPSHOTS_DIR = "body-snapshots";
const FLUSH_INTERVAL_MS = 5_000;

const memoryCache = new Map<string, BodySnapshot>();
let dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Per-token user ID cache (1-hour TTL, max 1000 entries). */
const userIdCache = new Map<string, { id: string; expires: number }>();
const USER_ID_CACHE_TTL_MS = 3_600_000;
const USER_ID_CACHE_MAX_SIZE = 1_000;

function getSnapshotsDir(): string {
  return join(homedir(), ".neurolink", SNAPSHOTS_DIR);
}

function getSnapshotPath(accountKey: string): string {
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
      // Non-fatal
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
// Crypto helpers (same as oauthFetch.ts)
// ---------------------------------------------------------------------------

async function shortSha256(data: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 5);
}

function evictUserIdCache(): void {
  if (userIdCache.size <= USER_ID_CACHE_MAX_SIZE) {
    return;
  }
  const now = Date.now();
  for (const [key, entry] of userIdCache) {
    if (entry.expires < now) {
      userIdCache.delete(key);
    }
  }
  // If still over limit, drop oldest entries
  if (userIdCache.size > USER_ID_CACHE_MAX_SIZE) {
    const entries = [...userIdCache.entries()];
    entries
      .sort((a, b) => a[1].expires - b[1].expires)
      .slice(0, entries.length - USER_ID_CACHE_MAX_SIZE)
      .forEach(([k]) => userIdCache.delete(k));
  }
}

function getOrCreateUserId(tokenPrefix: string): string {
  evictUserIdCache();
  const cached = userIdCache.get(tokenPrefix);
  if (cached && cached.expires > Date.now()) {
    return cached.id;
  }
  const hex = randomBytes(32).toString("hex");
  const id = `user_${hex}_account_${randomUUID()}_session_${randomUUID()}`;
  userIdCache.set(tokenPrefix, {
    id,
    expires: Date.now() + USER_ID_CACHE_TTL_MS,
  });
  return id;
}

// ---------------------------------------------------------------------------
// Recording — extract template values from real Claude Code request bodies
// ---------------------------------------------------------------------------

const BILLING_HEADER_REGEX =
  /x-anthropic-billing-header:\s*cc_version=([^.]+)\.\w+;\s*cc_entrypoint=(\w+);/;
const AGENT_BLOCK_PREFIX = "You are a Claude agent";

/**
 * Extract body snapshot template from a real Claude Code request body.
 * Returns null if the body doesn't contain billing/agent blocks (not
 * a real Claude Code request).
 */
export function extractBodySnapshot(
  accountKey: string,
  body: Record<string, unknown>,
): BodySnapshot | null {
  const system = body.system;
  if (!Array.isArray(system)) {
    return null;
  }

  let ccVersion: string | null = null;
  let ccEntrypoint: string | null = null;
  let agentBlockText: string | null = null;

  for (const block of system) {
    if (typeof block !== "object" || block === null) {
      continue;
    }
    const b = block as { type?: string; text?: string };
    if (b.type !== "text" || typeof b.text !== "string") {
      continue;
    }

    const billingMatch = b.text.match(BILLING_HEADER_REGEX);
    if (billingMatch) {
      ccVersion = billingMatch[1];
      ccEntrypoint = billingMatch[2];
    }

    if (b.text.startsWith(AGENT_BLOCK_PREFIX)) {
      agentBlockText = b.text;
    }
  }

  if (!ccVersion || !ccEntrypoint || !agentBlockText) {
    return null;
  }

  return {
    accountKey,
    capturedAt: new Date().toISOString(),
    ccVersion,
    ccEntrypoint,
    agentBlockText,
  };
}

// ---------------------------------------------------------------------------
// Public API — save / load / polyfill
// ---------------------------------------------------------------------------

/**
 * Save a body snapshot for an account.
 */
export function saveBodySnapshot(
  accountKey: string,
  body: Record<string, unknown>,
): void {
  const snapshot = extractBodySnapshot(accountKey, body);
  if (!snapshot) {
    return;
  }

  memoryCache.set(accountKey, snapshot);
  dirty.add(accountKey);
  scheduleFlush();
}

/**
 * Load a body snapshot for an account.
 */
export async function loadBodySnapshot(
  accountKey: string,
): Promise<BodySnapshot | null> {
  const cached = memoryCache.get(accountKey);
  if (cached) {
    return cached;
  }

  try {
    const raw = await fs.readFile(getSnapshotPath(accountKey), "utf-8");
    const snapshot = JSON.parse(raw) as BodySnapshot;
    memoryCache.set(accountKey, snapshot);
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Check if a request body already has billing/agent blocks injected.
 */
function hasBillingBlock(body: Record<string, unknown>): boolean {
  const system = body.system;
  if (!Array.isArray(system)) {
    return false;
  }
  return system.some((block: unknown) => {
    const b = block as { text?: string };
    return (
      typeof b.text === "string" &&
      b.text.includes("x-anthropic-billing-header:")
    );
  });
}

/**
 * Polyfill body-level transforms from a stored snapshot.
 * Injects billing header, agent block, and metadata.user_id
 * if they are missing from the current request body.
 *
 * Dynamic parts (cch, random hex, user_id) are computed fresh.
 * Returns true if polyfill was applied.
 */
export async function polyfillBody(
  accountKey: string,
  body: Record<string, unknown>,
  accountToken: string,
): Promise<boolean> {
  // Don't double-inject if already present
  if (hasBillingBlock(body)) {
    return false;
  }

  const snapshot = await loadBodySnapshot(accountKey);
  if (!snapshot) {
    return false;
  }

  // 1. Build billing block with dynamic components
  const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(2)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 3);

  const bodyString = JSON.stringify(body);
  const cch = await shortSha256(bodyString);

  const billingBlock = {
    type: "text",
    text: `x-anthropic-billing-header: cc_version=${snapshot.ccVersion}.${randomHex}; cc_entrypoint=${snapshot.ccEntrypoint}; cch=${cch};`,
  };

  const agentBlock = {
    type: "text",
    text: snapshot.agentBlockText,
  };

  // 2. Inject into system prompt
  if (body.system) {
    if (typeof body.system === "string") {
      body.system = [{ type: "text", text: body.system }];
    }
    if (Array.isArray(body.system)) {
      body.system = [billingBlock, agentBlock, ...body.system];
    }
  } else {
    body.system = [billingBlock, agentBlock];
  }

  // 3. Inject metadata.user_id
  const tokenPrefix = accountToken.substring(
    0,
    Math.min(20, accountToken.length),
  );
  const existingMetadata =
    body.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};
  body.metadata = {
    ...existingMetadata,
    user_id: getOrCreateUserId(tokenPrefix),
  };

  return true;
}
