import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  AccountCoolingReason,
  PersistedAccountCooldown,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const COOLDOWN_FILE = "account-cooldowns.json";
const VALID_REASONS = new Set<AccountCoolingReason>([
  "weekly",
  "session",
  "unified",
  "transient",
  "auth",
]);

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

async function ensureAccountCooldownsLoaded(): Promise<void> {
  if (!cacheLoaded) {
    if (!cacheLoadPromise) {
      cacheLoadPromise = (async () => {
        try {
          const parsed = JSON.parse(
            await readFile(getCooldownFilePath(), "utf8"),
          ) as Record<string, unknown>;
          memoryCache = Object.fromEntries(
            Object.entries(parsed).filter(
              (entry): entry is [string, PersistedAccountCooldown] =>
                isPersistedCooldown(entry[1]),
            ),
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
