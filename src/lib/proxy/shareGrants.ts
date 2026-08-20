/**
 * Peer-sharing grant store.
 *
 * A grant is one lender-issued, revocable authorization for one borrower. This
 * module owns the persisted grant file and the token contract; it deliberately
 * knows nothing about admission policy (see `sharePolicy.ts`) or transport.
 *
 * **Token contract.** A share token looks like `nls_<grantId>_<secret>`. The
 * grant id is carried in the token so a lookup is a map hit rather than a scan
 * over every grant, and only then is the secret compared — in constant time —
 * against `sha256(salt + secret)`. The raw token exists exactly once, in the
 * return value of `createShareGrant`; nothing persists it.
 *
 * **Cross-process freshness.** The CLI mutates this file in one process while
 * the proxy reads it in another, so `share pause` has to land in a running
 * proxy without a restart. Reads therefore re-stat the file and reload when its
 * mtime moves, bounded by a short TTL so the hot path pays one `stat` per
 * second at most.
 *
 * @module proxy/shareGrants
 */

import { createHash, randomBytes } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyShareGrant,
  ProxyShareGrantFile,
  ProxyShareGrantInput,
  ProxyShareGrantPatch,
  ProxyShareGrantState,
  ProxyShareIssuedGrant,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { logger } from "../utils/logger.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const GRANTS_FILE = "proxy-grants.json";

/** Token prefix. Distinguishes a share token from a client's own credential. */
export const SHARE_TOKEN_PREFIX = "nls";

/** How long a loaded snapshot is trusted before the file is re-stat'd. */
const RELOAD_TTL_MS = 1_000;

let customGrantsFilePath: string | null = null;
let cache: Record<string, ProxyShareGrant> = {};
let cacheLoadedAt = 0;
let cacheMtimeMs = -1;
let cacheValid = false;
let cachedPublicUrl: string | undefined;
let cachedNoteSecret: string | undefined;
const mutationMutex = new AsyncMutex();

/** How often in-memory `lastUsedAt` updates are flushed to disk. */
const USAGE_FLUSH_INTERVAL_MS = 60_000;
let lastUsageFlushAt = 0;
/** `lastUsedAt` stamps awaiting a flush, kept across the reload that flush does. */
let pendingUsage: Record<string, number> = {};

/** Point the store at an explicit file. Used by dev mode and by tests. */
export function initShareGrants(grantsFilePath: string): void {
  customGrantsFilePath = grantsFilePath;
  cache = {};
  cacheLoadedAt = 0;
  cacheMtimeMs = -1;
  cacheValid = false;
  cachedPublicUrl = undefined;
  cachedNoteSecret = undefined;
  lastUsageFlushAt = 0;
  pendingUsage = {};
}

/**
 * This node's stable public address.
 *
 * Recorded once — by `share url`, or by whatever already fronts this proxy — so
 * a link can be minted without retyping the domain. Nothing here assumes the
 * address came from `proxy expose`; a reverse proxy, a permanent named tunnel
 * or a plain DNS record are all the same thing to a borrower.
 */
export async function getNodePublicUrl(): Promise<string | undefined> {
  await ensureLoaded();
  return cachedPublicUrl;
}

export async function setNodePublicUrl(url: string | undefined): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    cachedPublicUrl = url ? url.trim().replace(/\/+$/, "") : undefined;
    await persist();
  });
}

function getGrantsFilePath(): string {
  return customGrantsFilePath ?? join(homedir(), ".neurolink", GRANTS_FILE);
}

function isShareGrant(value: unknown): value is ProxyShareGrant {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyShareGrant>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.peerLabel === "string" &&
    typeof candidate.tokenHash === "string" &&
    typeof candidate.tokenSalt === "string" &&
    (candidate.level === "live" || candidate.level === "complete") &&
    typeof candidate.state === "string" &&
    typeof candidate.entitlement === "object" &&
    candidate.entitlement !== null &&
    typeof candidate.gates === "object" &&
    candidate.gates !== null
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

/**
 * Load the grant file when the cache is cold or the file changed underneath us.
 *
 * A missing or unparseable file yields an empty set rather than an error: a node
 * that has never shared anything is the common case, and a corrupt file must not
 * take the proxy's hot path down. Corruption is announced once per load.
 */
async function ensureLoaded(
  options: { force?: boolean; revalidate?: boolean } = {},
): Promise<void> {
  const now = Date.now();
  if (
    !options.force &&
    !options.revalidate &&
    cacheValid &&
    now - cacheLoadedAt < RELOAD_TTL_MS
  ) {
    return;
  }
  const path = getGrantsFilePath();
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
    // Missing file — an empty grant set, not an error.
    cache = {};
    cacheMtimeMs = -1;
    cacheLoadedAt = now;
    cacheValid = true;
    return;
  }
  // This is where `revalidate` and `force` part company. `revalidate` wants a
  // fresh answer cheaply and stops here when the file has not moved — that is
  // the read path, and it must not pay for a parse per request. `force` goes
  // on regardless, because mtime is the fast path for a read and not a
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
    ) as Partial<ProxyShareGrantFile>;
    const grants = parsed?.grants ?? {};
    cachedPublicUrl = parsed?.publicUrl;
    cachedNoteSecret = parsed?.noteSecret;
    cache = Object.fromEntries(
      Object.entries(grants).filter(
        (entry): entry is [string, ProxyShareGrant] => isShareGrant(entry[1]),
      ),
    );
  } catch (error) {
    if (options.force) {
      // A mutation is about to write the whole map back. Treating a corrupt
      // file as empty here would make that write the thing that finishes the
      // corruption off — and it would take `publicUrl` and `noteSecret` with
      // it, which no grant carries a second copy of. Abort and leave the file.
      throw error;
    }
    logger.always(
      `[proxy] share grants unreadable, treating as empty: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    cache = {};
    cachedPublicUrl = undefined;
    cachedNoteSecret = undefined;
  }
  cacheMtimeMs = mtimeMs;
  cacheLoadedAt = now;
  cacheValid = true;
}

async function persist(): Promise<void> {
  const file: ProxyShareGrantFile = {
    schemaVersion: 1,
    grants: cache,
    ...(cachedPublicUrl ? { publicUrl: cachedPublicUrl } : {}),
    ...(cachedNoteSecret ? { noteSecret: cachedNoteSecret } : {}),
  };
  await writeJsonSnapshotAtomically(getGrantsFilePath(), file);
  try {
    cacheMtimeMs = (await stat(getGrantsFilePath())).mtimeMs;
  } catch {
    // A stat failure only costs one redundant reload on the next read.
    cacheMtimeMs = -1;
  }
  cacheLoadedAt = Date.now();
  cacheValid = true;
}

function hashSecret(salt: string, secret: string): string {
  return createHash("sha256").update(`${salt}:${secret}`).digest("hex");
}

/**
 * Compare two hex digests without leaking their divergence point via timing.
 *
 * Hand-rolled rather than `crypto.timingSafeEqual` because the package's
 * browser bundle stubs `node:crypto` down to a subset that does not include it,
 * and this module is reachable from that build. Both inputs are fixed-length
 * SHA-256 hex, so the length check leaks nothing about the secret.
 */
function digestsMatch(left: string, right: string): boolean {
  if (left.length !== right.length || left.length === 0) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * Split a share token into its grant id and secret.
 * Returns null for anything that is not one of our tokens — including a client's
 * own Anthropic credential, which must never be mistaken for a share token.
 */
export function parseShareToken(
  token: string,
): { grantId: string; secret: string } | null {
  if (!token.startsWith(`${SHARE_TOKEN_PREFIX}_`)) {
    return null;
  }
  // Split on the first two separators only. The secret is base64url, whose
  // alphabet includes "_", so a naive three-way split rejects most valid
  // tokens — every one that happens to contain an underscore.
  const idStart = SHARE_TOKEN_PREFIX.length + 1;
  const idEnd = token.indexOf("_", idStart);
  if (idEnd <= idStart) {
    return null;
  }
  const grantId = token.slice(idStart, idEnd);
  const secret = token.slice(idEnd + 1);
  if (!grantId || !secret) {
    return null;
  }
  return { grantId, secret };
}

export function looksLikeShareToken(token: string | undefined): boolean {
  return typeof token === "string" && parseShareToken(token) !== null;
}

/** Expire-on-read: a grant past `notAfter` is expired regardless of its state. */
function withDerivedState(
  grant: ProxyShareGrant,
  now: number,
): ProxyShareGrant {
  if (
    grant.state === "active" &&
    grant.gates.notAfter !== undefined &&
    grant.gates.notAfter <= now
  ) {
    return { ...grant, state: "expired" };
  }
  return grant;
}

export async function listShareGrants(): Promise<ProxyShareGrant[]> {
  await ensureLoaded();
  const now = Date.now();
  return Object.values(cache)
    .map((grant) => withDerivedState(grant, now))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getShareGrant(
  id: string,
): Promise<ProxyShareGrant | undefined> {
  await ensureLoaded();
  const grant = cache[id];
  return grant ? withDerivedState(grant, Date.now()) : undefined;
}

/** Look a grant up by peer label (case-insensitive), the CLI's addressing form. */
export async function findShareGrantByPeer(
  peerLabel: string,
): Promise<ProxyShareGrant | undefined> {
  const wanted = peerLabel.trim().toLowerCase();
  const grants = await listShareGrants();
  return (
    grants.find(
      (grant) =>
        grant.peerLabel.toLowerCase() === wanted && grant.state !== "revoked",
    ) ??
    grants.find((grant) => grant.id === peerLabel) ??
    // A revoked grant is still addressable for management. Excluding it
    // outright stranded it in the file: `share delete` could not find it by
    // name, and only its id — which nothing prints after issue — would do.
    grants.find((grant) => grant.peerLabel.toLowerCase() === wanted)
  );
}

export async function createShareGrant(
  input: ProxyShareGrantInput,
): Promise<ProxyShareIssuedGrant> {
  return mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a grant the CLI deleted, or revert a
    // pause it set, in the window since this process last read the file.
    await ensureLoaded({ force: true });
    const now = Date.now();
    const id = randomBytes(6).toString("hex");
    const secret = randomBytes(32).toString("base64url");
    const tokenSalt = randomBytes(16).toString("hex");
    const grant: ProxyShareGrant = {
      schemaVersion: 1,
      id,
      peerLabel: input.peerLabel.trim(),
      tokenHash: hashSecret(tokenSalt, secret),
      tokenSalt,
      // Keyed separately from the token so rotating the token does not
      // invalidate every receipt already issued under it.
      receiptSecret: randomBytes(32).toString("base64url"),
      level: input.level,
      state: "active",
      entitlement: input.entitlement,
      gates: input.gates,
      createdAt: now,
      updatedAt: now,
      ...(input.note ? { note: input.note } : {}),
    };
    cache[id] = grant;
    await persist();
    return {
      grant,
      token: `${SHARE_TOKEN_PREFIX}_${id}_${secret}`,
    };
  });
}

/**
 * Replace a grant's token, keeping every control intact.
 * Used by `share revoke --rotate` and by any suspected token leak.
 */
export async function rotateShareGrantToken(
  id: string,
): Promise<ProxyShareIssuedGrant | undefined> {
  return mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a grant the CLI deleted, or revert a
    // pause it set, in the window since this process last read the file.
    await ensureLoaded({ force: true });
    const grant = cache[id];
    if (!grant) {
      return undefined;
    }
    const secret = randomBytes(32).toString("base64url");
    const tokenSalt = randomBytes(16).toString("hex");
    const updated: ProxyShareGrant = {
      ...grant,
      tokenSalt,
      tokenHash: hashSecret(tokenSalt, secret),
      updatedAt: Date.now(),
    };
    cache[id] = updated;
    await persist();
    return {
      grant: updated,
      token: `${SHARE_TOKEN_PREFIX}_${id}_${secret}`,
    };
  });
}

export async function setShareGrantState(
  id: string,
  state: ProxyShareGrantState,
): Promise<ProxyShareGrant | undefined> {
  return mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a grant the CLI deleted, or revert a
    // pause it set, in the window since this process last read the file.
    await ensureLoaded({ force: true });
    const grant = cache[id];
    if (!grant) {
      return undefined;
    }
    const updated: ProxyShareGrant = {
      ...grant,
      state,
      updatedAt: Date.now(),
    };
    cache[id] = updated;
    await persist();
    return updated;
  });
}

export async function updateShareGrant(
  id: string,
  patch: ProxyShareGrantPatch,
): Promise<ProxyShareGrant | undefined> {
  return mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a grant the CLI deleted, or revert a
    // pause it set, in the window since this process last read the file.
    await ensureLoaded({ force: true });
    const grant = cache[id];
    if (!grant) {
      return undefined;
    }
    const updated: ProxyShareGrant = {
      ...grant,
      ...(patch.level ? { level: patch.level } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      entitlement: patch.entitlement
        ? { ...grant.entitlement, ...patch.entitlement }
        : grant.entitlement,
      gates: patch.gates ? { ...grant.gates, ...patch.gates } : grant.gates,
      updatedAt: Date.now(),
    };
    cache[id] = updated;
    await persist();
    return updated;
  });
}

/**
 * Attach complete-mode lease material to a grant.
 *
 * Separate from `updateShareGrant` because these are not policy the operator
 * edits — the secret is generated once and the borrower's copy is keyed to it,
 * so overwriting it silently would invalidate every lease already in the field.
 */
export async function attachLeaseMaterial(
  id: string,
  leaseSecret: string,
  leasePolicy: {
    ttlMs: number;
    heartbeatEveryMs: number;
    offlineGraceMs: number;
  },
  provisionedAccount?: string,
): Promise<ProxyShareGrant | undefined> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const grant = cache[id];
    if (!grant) {
      return undefined;
    }
    const updated: ProxyShareGrant = {
      ...grant,
      leaseSecret: grant.leaseSecret ?? leaseSecret,
      leasePolicy,
      ...(provisionedAccount
        ? { provisionedAccount }
        : grant.provisionedAccount
          ? { provisionedAccount: grant.provisionedAccount }
          : {}),
      updatedAt: Date.now(),
    };
    cache[id] = updated;
    await persist();
    return updated;
  });
}

/**
 * Subtract settled spend from a metered grant's balance.
 *
 * Read-modify-write **inside** the store's mutex, because settlement is
 * concurrent by nature: two streams finishing together would otherwise both read
 * the same balance, and the second write would erase the first one's deduction.
 * Returns the new balance, or `undefined` for a grant that is not metered.
 */
export async function debitShareGrantCoins(
  id: string,
  coins: number,
): Promise<number | undefined> {
  return mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a grant the CLI deleted, or revert a
    // pause it set, in the window since this process last read the file.
    await ensureLoaded({ force: true });
    const grant = cache[id];
    if (!grant || grant.entitlement.ledger !== "coins") {
      return undefined;
    }
    const remaining = Math.max(0, (grant.entitlement.coins ?? 0) - coins);
    cache[id] = {
      ...grant,
      entitlement: { ...grant.entitlement, coins: remaining },
      updatedAt: Date.now(),
    };
    await persist();
    return remaining;
  });
}

/**
 * Add coins to a metered grant's balance.
 *
 * The mirror of `debitShareGrantCoins`, and under the same lock for the same
 * reason. Used by reciprocal netting, by `share topup`'s successor paths, and by
 * redeeming a coin note — all of which can land while requests are settling.
 */
export async function creditShareGrantCoins(
  id: string,
  coins: number,
): Promise<number | undefined> {
  if (!(coins > 0)) {
    return undefined;
  }
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const grant = cache[id];
    if (!grant || grant.entitlement.ledger !== "coins") {
      return undefined;
    }
    const balance = (grant.entitlement.coins ?? 0) + coins;
    cache[id] = {
      ...grant,
      entitlement: { ...grant.entitlement, coins: balance },
      updatedAt: Date.now(),
    };
    await persist();
    return balance;
  });
}

/**
 * This node's secret for signing coin notes.
 *
 * Node-level rather than per-grant: a note may be redeemed by a grant that did
 * not exist when it was issued, which is the entire point of a transferable
 * one. Minted on first use so a node that never issues a note never has one.
 */
export async function getOrCreateNoteSecret(): Promise<string> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    if (!cachedNoteSecret) {
      cachedNoteSecret = randomBytes(32).toString("base64url");
      await persist();
    }
    return cachedNoteSecret;
  });
}

/** The note secret, without minting one. */
export async function getNoteSecret(): Promise<string | undefined> {
  await ensureLoaded();
  return cachedNoteSecret;
}

export async function deleteShareGrant(id: string): Promise<boolean> {
  return mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a grant the CLI deleted, or revert a
    // pause it set, in the window since this process last read the file.
    await ensureLoaded({ force: true });
    if (!cache[id]) {
      return false;
    }
    delete cache[id];
    await persist();
    return true;
  });
}

/**
 * Resolve a presented token to its grant.
 *
 * Returns the grant whatever its state — admission is `sharePolicy`'s decision,
 * and a paused grant must still be identifiable so the refusal can say *why*
 * rather than "unknown token".
 */
export async function resolveShareToken(
  token: string,
): Promise<ProxyShareGrant | undefined> {
  const parsed = parseShareToken(token);
  if (!parsed) {
    return undefined;
  }
  await ensureLoaded();
  let grant = cache[parsed.grantId];
  if (!grant) {
    // A token minted moments ago would otherwise read as unknown until the
    // snapshot TTL lapsed, so a miss re-stats before concluding anything.
    //
    // `revalidate`, emphatically not `force`. This runs on the inbound path
    // before anything has authenticated, and every unknown token reaches it —
    // so a client repeating one invalid token must not be able to buy a
    // `readFile` plus a `JSON.parse` per request. Costing one `stat` and
    // stopping on an unchanged mtime is the whole point.
    await ensureLoaded({ revalidate: true });
    grant = cache[parsed.grantId];
  }
  if (!grant) {
    return undefined;
  }
  if (
    !digestsMatch(grant.tokenHash, hashSecret(grant.tokenSalt, parsed.secret))
  ) {
    return undefined;
  }
  return withDerivedState(grant, Date.now());
}

/**
 * Record that a grant served traffic.
 *
 * `lastUsedAt` is cosmetic, so it is held in memory and flushed at most once a
 * minute. Persisting it per request would put a file write on the hot path and —
 * worse — move the file's mtime constantly, forcing every reader to reload the
 * snapshot it just loaded.
 */
export function touchShareGrantUsage(id: string): void {
  const grant = cache[id];
  if (!grant) {
    return;
  }
  const now = Date.now();
  // Patch the live map so an in-process read sees it immediately, and remember
  // the stamp separately: the flush below reloads the file first, which
  // replaces `cache` wholesale and would otherwise drop the patch.
  cache[id] = { ...grant, lastUsedAt: now };
  pendingUsage[id] = now;
  if (now - lastUsageFlushAt < USAGE_FLUSH_INTERVAL_MS) {
    return;
  }
  lastUsageFlushAt = now;
  void mutationMutex
    .runExclusive(async () => {
      // Reload before writing. `persist()` serializes the whole map, so
      // flushing a cosmetic timestamp onto a stale snapshot would resurrect a
      // grant the CLI deleted in the meantime — the timestamp is not worth
      // that. Stamps for grants that are gone are simply dropped.
      await ensureLoaded({ force: true });
      const stamps = pendingUsage;
      pendingUsage = {};
      let touched = false;
      for (const [grantId, lastUsedAt] of Object.entries(stamps)) {
        const current = cache[grantId];
        if (current) {
          cache[grantId] = { ...current, lastUsedAt };
          touched = true;
        }
      }
      if (touched) {
        await persist();
      }
    })
    .catch(() => {
      // Cosmetic only — never surfaced to the request.
    });
}
