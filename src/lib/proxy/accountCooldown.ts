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

async function ensureAccountCooldownsLoaded(): Promise<void> {
  if (!cacheLoaded) {
    if (!cacheLoadPromise) {
      cacheLoadPromise = (async () => {
        try {
          const parsed = JSON.parse(
            await readFile(getCooldownFilePath(), "utf8"),
          ) as Record<string, unknown>;
          memoryCache = Object.fromEntries(
            Object.entries(parsed)
              .filter((entry): entry is [string, PersistedAccountCooldown] =>
                isPersistedCooldown(entry[1]),
              )
              .map(([key, entry]) => [
                key,
                sanitizePersistedCooldown(key, entry),
              ]),
          );
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
    const current = memoryCache[accountKey];
    if (current && current.coolingUntil > coolingUntil) {
      return;
    }
    memoryCache[accountKey] = {
      coolingUntil,
      reason,
      updatedAt: Date.now(),
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
    const current = memoryCache[accountKey];
    if (!current) {
      return;
    }
    if (
      expectedCoolingUntil !== undefined &&
      current.coolingUntil !== expectedCoolingUntil
    ) {
      return;
    }
    delete memoryCache[accountKey];
    await writeJsonSnapshotAtomically(getCooldownFilePath(), memoryCache);
  });
}
