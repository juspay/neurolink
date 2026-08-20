/**
 * Peers this node may borrow capacity from.
 *
 * The borrower's half of peer sharing. Each entry is a lender's exposed proxy
 * plus the share token they issued; the lender remains the authority on what
 * that token may do, so nothing here tries to second-guess a grant's policy.
 *
 * Peer cooldowns are kept here rather than in `accountCooldown.ts` on purpose.
 * A peer is not an account: its unavailability reasons are grant-shaped
 * ("paused", "exhausted") rather than window-shaped, and the account cooldown
 * store's Anthropic quota keying is documented as label-based, which a peer key
 * has no business participating in.
 *
 * @module proxy/peerStore
 */

import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyPeer,
  ProxyPeerCooldownReason,
  ProxyPeerFile,
  ProxyPeerInput,
  ProxyPeerObservation,
  ProxyPeerPendingProvision,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { logger } from "../utils/logger.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const PEERS_FILE = "proxy-peers.json";
const RELOAD_TTL_MS = 1_000;

/**
 * How long a peer is left alone after each refusal kind.
 *
 * "Exhausted" and "withheld" are the lender's capacity talking, and that
 * recovers on a window boundary rather than in seconds — retrying sooner just
 * burns latency on every request. "Paused" is a human decision, so the wait is
 * long but not punitive. Transport trouble gets the shortest wait, because it
 * is the one most likely to clear on its own.
 */
const COOLDOWN_MS_BY_REASON: Record<ProxyPeerCooldownReason, number> = {
  exhausted: 900_000,
  withheld: 600_000,
  paused: 300_000,
  revoked: 86_400_000,
  expired: 86_400_000,
  unreachable: 60_000,
  upstream_error: 120_000,
};

let customPeersFilePath: string | null = null;
let cache: Record<string, ProxyPeer> = {};
let cacheLoadedAt = 0;
let cacheMtimeMs = -1;
let cacheValid = false;
const mutationMutex = new AsyncMutex();

export function initPeerStore(peersFilePath: string): void {
  customPeersFilePath = peersFilePath;
  cache = {};
  cacheLoadedAt = 0;
  cacheMtimeMs = -1;
  cacheValid = false;
}

function getPeersFilePath(): string {
  return customPeersFilePath ?? join(homedir(), ".neurolink", PEERS_FILE);
}

function isPeer(value: unknown): value is ProxyPeer {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyPeer>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.token === "string" &&
    // Both are load-bearing on the read path and `addPeer` always writes them:
    // `listPeers` sorts on `priority`, and a non-boolean `enabled` would drop
    // the peer from `selectBorrowablePeers` with no explanation.
    typeof candidate.priority === "number" &&
    typeof candidate.enabled === "boolean"
  );
}

/**
 * Is this error simply "the file is not there yet"?
 *
 * The distinction is load-bearing. An absent file genuinely is an empty map —
 * nothing has been written yet. Every *other* `stat`/read failure (`EACCES`,
 * `EIO`, `EMFILE`, a full descriptor table) is a failure to observe the file,
 * and answering one with an empty map is how a whole store gets erased: a
 * caller passing `force` is about to `persist()` the map back over the real
 * contents it just failed to read.
 */
function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

async function ensureLoaded(options: { force?: boolean } = {}): Promise<void> {
  const now = Date.now();
  if (!options.force && cacheValid && now - cacheLoadedAt < RELOAD_TTL_MS) {
    return;
  }
  const path = getPeersFilePath();
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(path)).mtimeMs;
  } catch (error) {
    if (!isMissingFileError(error)) {
      // Not "no file" but "could not look" — see `isMissingFileError`. Let it
      // out: a mutation must abort rather than persist an empty map over a
      // store it never managed to read.
      throw error;
    }
    cache = {};
    cacheMtimeMs = -1;
    cacheLoadedAt = now;
    cacheValid = true;
    return;
  }
  // A forced load skips this. mtime is the fast path for a read, not a
  // correctness check for a write: several filesystems stamp it at one-second
  // granularity, so a write landing in the same second as our last read is
  // indistinguishable from no write at all — and every caller passing `force`
  // is about to persist the whole map back over whatever it missed.
  if (!options.force && cacheValid && mtimeMs === cacheMtimeMs) {
    cacheLoadedAt = now;
    return;
  }
  try {
    const parsed = JSON.parse(
      await readFile(path, "utf8"),
    ) as Partial<ProxyPeerFile>;
    cache = Object.fromEntries(
      Object.entries(parsed?.peers ?? {}).filter(
        (entry): entry is [string, ProxyPeer] => isPeer(entry[1]),
      ),
    );
  } catch (error) {
    if (options.force) {
      // A mutation is about to write the whole map back. Treating a corrupt
      // file as empty here would make that write the thing that finishes the
      // corruption off, so the mutation aborts and the file survives for a
      // human to look at. Read paths below keep the tolerant behaviour.
      throw error;
    }
    logger.always(
      `[proxy] peer list unreadable, treating as empty: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    cache = {};
  }
  cacheMtimeMs = mtimeMs;
  cacheLoadedAt = now;
  cacheValid = true;
}

async function persist(): Promise<void> {
  const file: ProxyPeerFile = { schemaVersion: 1, peers: cache };
  await writeJsonSnapshotAtomically(getPeersFilePath(), file);
  try {
    cacheMtimeMs = (await stat(getPeersFilePath())).mtimeMs;
  } catch {
    cacheMtimeMs = -1;
  }
  cacheLoadedAt = Date.now();
  cacheValid = true;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export async function listPeers(): Promise<ProxyPeer[]> {
  await ensureLoaded();
  return Object.values(cache).sort(
    (a, b) => a.priority - b.priority || a.createdAt - b.createdAt,
  );
}

export async function getPeer(name: string): Promise<ProxyPeer | undefined> {
  await ensureLoaded();
  return cache[normalizeName(name)];
}

/**
 * Peers worth trying right now, in the order they should be tried.
 *
 * Disabled and cooling peers are dropped rather than sorted last: a borrowed
 * request is already the fallback path, and spending its latency budget on a
 * peer that just said "paused" helps nobody.
 */
export async function selectBorrowablePeers(
  now: number = Date.now(),
): Promise<ProxyPeer[]> {
  const peers = await listPeers();
  return peers.filter(
    (peer) => peer.enabled && !(peer.cooldownUntil && peer.cooldownUntil > now),
  );
}

export async function addPeer(input: ProxyPeerInput): Promise<ProxyPeer> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = normalizeName(input.name);
    const now = Date.now();
    const existing = cache[key];
    const peer: ProxyPeer = {
      schemaVersion: 1,
      name: input.name.trim(),
      url: input.url.replace(/\/+$/, ""),
      token: input.token,
      ...(input.receiptSecret
        ? { receiptSecret: input.receiptSecret }
        : existing?.receiptSecret
          ? { receiptSecret: existing.receiptSecret }
          : {}),
      priority: input.priority ?? existing?.priority ?? 100,
      enabled: existing?.enabled ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...(input.note ? { note: input.note } : {}),
    };
    cache[key] = peer;
    await persist();
    return peer;
  });
}

export async function removePeer(name: string): Promise<boolean> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = normalizeName(name);
    if (!cache[key]) {
      return false;
    }
    delete cache[key];
    await persist();
    return true;
  });
}

export async function setPeerEnabled(
  name: string,
  enabled: boolean,
): Promise<ProxyPeer | undefined> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = normalizeName(name);
    const peer = cache[key];
    if (!peer) {
      return undefined;
    }
    const updated: ProxyPeer = {
      ...peer,
      enabled,
      updatedAt: Date.now(),
      // Re-enabling clears the cooldown: the operator is explicitly saying to
      // try again, and making them wait out a timer they can see would be a
      // control that does not control anything.
      ...(enabled ? { cooldownUntil: 0 } : {}),
    };
    cache[key] = updated;
    await persist();
    return updated;
  });
}

export async function updatePeer(
  name: string,
  patch: {
    priority?: number;
    note?: string;
    url?: string;
    token?: string;
    receiptSecret?: string;
    reciprocalPeer?: string;
    lastReceiptSequence?: number;
    /** `null` clears an outstanding provisioning request. */
    pendingProvision?: ProxyPeerPendingProvision | null;
  },
): Promise<ProxyPeer | undefined> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = normalizeName(name);
    const peer = cache[key];
    if (!peer) {
      return undefined;
    }
    const updated: ProxyPeer = {
      ...peer,
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.url ? { url: patch.url.replace(/\/+$/, "") } : {}),
      ...(patch.token ? { token: patch.token } : {}),
      ...(patch.receiptSecret ? { receiptSecret: patch.receiptSecret } : {}),
      ...(patch.reciprocalPeer ? { reciprocalPeer: patch.reciprocalPeer } : {}),
      ...(patch.lastReceiptSequence !== undefined
        ? { lastReceiptSequence: patch.lastReceiptSequence }
        : {}),
      updatedAt: Date.now(),
    };
    if (patch.pendingProvision !== undefined) {
      if (patch.pendingProvision === null) {
        delete updated.pendingProvision;
      } else {
        updated.pendingProvision = patch.pendingProvision;
      }
    }
    cache[key] = updated;
    await persist();
    return updated;
  });
}

/** How long a peer should be left alone after this kind of refusal. */
export function peerCooldownMs(reason: ProxyPeerCooldownReason): number {
  return COOLDOWN_MS_BY_REASON[reason];
}

/**
 * The longest a peer is ever parked.
 *
 * A lender legitimately says "a week" when a weekly window is what recovers, but
 * `retry-after` is a number from another machine and a malformed one would park
 * a working peer effectively forever.
 */
const MAX_COOLDOWN_MS = 604_800_000;

/**
 * Park a peer after a refusal.
 *
 * `retryAfterSeconds` from the lender wins when it is longer than our default —
 * the lender knows when its window turns over and we do not — up to a week.
 */
export async function coolPeer(
  name: string,
  reason: ProxyPeerCooldownReason,
  retryAfterSeconds?: number,
): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a cooldown recorded on a
    // TTL-fresh snapshot would revert a token rotation or a removal the CLI made
    // in the window since this process last read the file.
    await ensureLoaded({ force: true });
    const key = normalizeName(name);
    const peer = cache[key];
    if (!peer) {
      return;
    }
    const suggested = (retryAfterSeconds ?? 0) * 1000;
    const until =
      Date.now() +
      Math.min(
        MAX_COOLDOWN_MS,
        Math.max(
          peerCooldownMs(reason),
          Number.isFinite(suggested) ? suggested : 0,
        ),
      );
    cache[key] = {
      ...peer,
      cooldownUntil: until,
      cooldownReason: reason,
      updatedAt: Date.now(),
    };
    await persist();
  });
}

/** Clear a cooldown after a peer serves successfully. */
export async function recordPeerSuccess(
  name: string,
  observation?: ProxyPeerObservation,
): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = normalizeName(name);
    const peer = cache[key];
    if (!peer) {
      return;
    }
    cache[key] = {
      ...peer,
      cooldownUntil: 0,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
      ...(observation ? { lastObservation: observation } : {}),
    };
    await persist();
  });
}
