import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  AccountCoolingReason,
  PersistedAccountCooldown,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { logger } from "../utils/logger.js";
import {
  ACCOUNT_COOLING_REASONS,
  MAX_COOLDOWN_MS_BY_REASON,
} from "./routingEvidence.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const COOLDOWN_FILE = "account-cooldowns.json";
const VALID_REASONS = new Set<AccountCoolingReason>(ACCOUNT_COOLING_REASONS);

let customCooldownFilePath: string | null = null;
let cacheLoaded = false;
let cacheLoadPromise: Promise<void> | null = null;
let memoryCache: Record<string, PersistedAccountCooldown> = {};
const mutationMutex = new AsyncMutex();

export function initAccountCooldown(cooldownFilePath: string): void {
  customCooldownFilePath = cooldownFilePath;
  cacheLoaded = false;
  cacheLoadPromise = null;
  memoryCache = {};
}

function getCooldownFilePath(): string {
  return customCooldownFilePath ?? join(homedir(), ".neurolink", COOLDOWN_FILE);
}

function isPersistedCooldown(
  value: unknown,
): value is PersistedAccountCooldown {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PersistedAccountCooldown>;
  return (
    typeof candidate.coolingUntil === "number" &&
    Number.isFinite(candidate.coolingUntil) &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt) &&
    typeof candidate.reason === "string" &&
    VALID_REASONS.has(candidate.reason as AccountCoolingReason)
  );
}

/**
 * Cap a persisted cooldown at what its reason can plausibly mean, measured from
 * when it was written.
 *
 * Entries written before per-reason ceilings existed can hold a wildly
 * out-of-range wait — a "session" cooldown running for days, from a single stale
 * reset timestamp. Clamping on load heals those without operator action.
 * Clamping rather than dropping keeps a legitimate long weekly cooldown intact.
 */
function sanitizePersistedCooldown(
  accountKey: string,
  entry: PersistedAccountCooldown,
): PersistedAccountCooldown {
  const ceiling = MAX_COOLDOWN_MS_BY_REASON[entry.reason];
  if (ceiling === undefined) {
    return entry;
  }
  const latest = entry.updatedAt + ceiling;
  if (entry.coolingUntil <= latest) {
    return entry;
  }
  // Announce it: an account silently parked far beyond what its reason can mean
  // is exactly the condition that is hard to diagnose from the outside, and this
  // runs once per process so it cannot become noise.
  const hours = (ms: number): string => (ms / 3_600_000).toFixed(1);
  logger.always(
    `[proxy] cooldown clamp: ${accountKey} ${entry.reason} entry healed from ` +
      `${hours(entry.coolingUntil - entry.updatedAt)}h to ` +
      `${hours(ceiling)}h — the stored wait exceeded what "${entry.reason}" can mean`,
  );
  return { ...entry, coolingUntil: latest };
}

/**
 * Read the cooldown file as it is now. A missing file is empty; any other
 * failure (unreadable, corrupt) returns `fallback`, so a write never discards
 * entries just because one read failed.
 */
async function readCooldownsFromDisk(
  fallback: Record<string, PersistedAccountCooldown>,
): Promise<Record<string, PersistedAccountCooldown>> {
  try {
    const parsed = JSON.parse(
      await readFile(getCooldownFilePath(), "utf8"),
    ) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, PersistedAccountCooldown] =>
          isPersistedCooldown(entry[1]),
        )
        .map(([key, entry]) => [key, sanitizePersistedCooldown(key, entry)]),
    );
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? {} : fallback;
  }
}

async function ensureAccountCooldownsLoaded(): Promise<void> {
  if (!cacheLoaded) {
    if (!cacheLoadPromise) {
      cacheLoadPromise = (async () => {
        memoryCache = await readCooldownsFromDisk({});
        cacheLoaded = true;
      })().finally(() => {
        cacheLoadPromise = null;
      });
    }
    await cacheLoadPromise;
  }
}

export async function loadAccountCooldowns(): Promise<
  Record<string, PersistedAccountCooldown>
> {
  await ensureAccountCooldownsLoaded();
  return mutationMutex.runExclusive(async () => ({ ...memoryCache }));
}

export async function saveAccountCooldown(
  accountKey: string,
  coolingUntil: number,
  reason: AccountCoolingReason,
): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureAccountCooldownsLoaded();
    // Another worker (a draining one during a rolling restart) may have written
    // the file since this one loaded it, so the change folds onto the file as
    // it is now rather than onto this worker's copy.
    const onDisk = await readCooldownsFromDisk(memoryCache);
    memoryCache = onDisk;
    const current = onDisk[accountKey];
    if (current && current.coolingUntil > coolingUntil) {
      return;
    }
    memoryCache = {
      ...onDisk,
      [accountKey]: { coolingUntil, reason, updatedAt: Date.now() },
    };
    await writeJsonSnapshotAtomically(getCooldownFilePath(), memoryCache);
  });
}

export async function clearAccountCooldown(
  accountKey: string,
  expectedCoolingUntil?: number,
): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureAccountCooldownsLoaded();
    // Compare against the file, not this worker's copy: another worker may
    // have extended this cooldown since, and that one must survive.
    const onDisk = await readCooldownsFromDisk(memoryCache);
    memoryCache = onDisk;
    const current = onDisk[accountKey];
    if (!current) {
      return;
    }
    if (
      expectedCoolingUntil !== undefined &&
      current.coolingUntil !== expectedCoolingUntil
    ) {
      return;
    }
    const next = { ...onDisk };
    delete next[accountKey];
    memoryCache = next;
    await writeJsonSnapshotAtomically(getCooldownFilePath(), memoryCache);
  });
}
