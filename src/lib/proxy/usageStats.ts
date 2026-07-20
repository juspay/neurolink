/**
 * Proxy usage statistics with restart- and handoff-safe persistence.
 *
 * Request handlers update memory synchronously. Small deltas are merged into a
 * shared snapshot asynchronously, under a cross-process lock, so overlapping
 * rolling workers cannot overwrite each other's counters.
 */

import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type {
  AccountStats,
  PersistedProxyStatsSnapshot,
  ProxyStatsLockOwner,
  ProxyStats,
  ProxyStatsPersistenceStatus,
  ProxyUsageStatsStoreOptions,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const SNAPSHOT_SCHEMA_VERSION = 1;
const DEFAULT_FLUSH_INTERVAL_MS = 1_000;
const DEFAULT_LOCK_TIMEOUT_MS = 2_000;
const DEFAULT_STALE_LOCK_MS = 30_000;
const LOCK_RETRY_MS = 25;
const MAX_CORRUPT_SNAPSHOTS = 3;

class InvalidProxyStatsSnapshotError extends Error {}

function emptyStats(startedAt: number): ProxyStats {
  return {
    startedAt,
    totalAttempts: 0,
    totalAttemptErrors: 0,
    totalRequests: 0,
    totalSuccess: 0,
    totalErrors: 0,
    totalRateLimits: 0,
    totalTransientRateLimits: 0,
    totalQuotaRateLimits: 0,
    accounts: {},
  };
}

function cloneAccount(account: AccountStats): AccountStats {
  return { ...account };
}

function cloneStats(value: ProxyStats): ProxyStats {
  return {
    ...value,
    accounts: Object.fromEntries(
      Object.entries(value.accounts).map(([label, account]) => [
        label,
        cloneAccount(account),
      ]),
    ),
  };
}

function mergeAccountStats(
  left: AccountStats | undefined,
  right: AccountStats,
): AccountStats {
  if (!left) {
    return cloneAccount(right);
  }
  return {
    label: right.label || left.label,
    type: right.type || left.type,
    attemptCount: left.attemptCount + right.attemptCount,
    attemptErrorCount: left.attemptErrorCount + right.attemptErrorCount,
    successCount: left.successCount + right.successCount,
    errorCount: left.errorCount + right.errorCount,
    rateLimitCount: left.rateLimitCount + right.rateLimitCount,
    transientRateLimitCount:
      left.transientRateLimitCount + right.transientRateLimitCount,
    quotaRateLimitCount: left.quotaRateLimitCount + right.quotaRateLimitCount,
    lastAttemptAt: Math.max(left.lastAttemptAt, right.lastAttemptAt),
    ...(left.lastErrorAt || right.lastErrorAt
      ? {
          lastErrorAt: Math.max(left.lastErrorAt ?? 0, right.lastErrorAt ?? 0),
        }
      : {}),
  };
}

function mergeStats(left: ProxyStats, right: ProxyStats): ProxyStats {
  const accounts: Record<string, AccountStats> = Object.fromEntries(
    Object.entries(left.accounts).map(([label, account]) => [
      label,
      cloneAccount(account),
    ]),
  );
  for (const [label, account] of Object.entries(right.accounts)) {
    accounts[label] = mergeAccountStats(accounts[label], account);
  }
  return {
    startedAt: Math.min(left.startedAt, right.startedAt),
    totalAttempts: left.totalAttempts + right.totalAttempts,
    totalAttemptErrors: left.totalAttemptErrors + right.totalAttemptErrors,
    totalRequests: left.totalRequests + right.totalRequests,
    totalSuccess: left.totalSuccess + right.totalSuccess,
    totalErrors: left.totalErrors + right.totalErrors,
    totalRateLimits: left.totalRateLimits + right.totalRateLimits,
    totalTransientRateLimits:
      left.totalTransientRateLimits + right.totalTransientRateLimits,
    totalQuotaRateLimits:
      left.totalQuotaRateLimits + right.totalQuotaRateLimits,
    accounts,
  };
}

function finiteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validAccountStats(value: unknown): value is AccountStats {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<AccountStats>;
  return (
    typeof candidate.label === "string" &&
    typeof candidate.type === "string" &&
    finiteNonNegativeInteger(candidate.attemptCount) &&
    finiteNonNegativeInteger(candidate.attemptErrorCount) &&
    finiteNonNegativeInteger(candidate.successCount) &&
    finiteNonNegativeInteger(candidate.errorCount) &&
    finiteNonNegativeInteger(candidate.rateLimitCount) &&
    finiteNonNegativeInteger(candidate.transientRateLimitCount) &&
    finiteNonNegativeInteger(candidate.quotaRateLimitCount) &&
    finiteNonNegativeInteger(candidate.lastAttemptAt) &&
    (candidate.lastErrorAt === undefined ||
      finiteNonNegativeInteger(candidate.lastErrorAt))
  );
}

function validStats(value: unknown): value is ProxyStats {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyStats>;
  const counters = [
    candidate.startedAt,
    candidate.totalAttempts,
    candidate.totalAttemptErrors,
    candidate.totalRequests,
    candidate.totalSuccess,
    candidate.totalErrors,
    candidate.totalRateLimits,
    candidate.totalTransientRateLimits,
    candidate.totalQuotaRateLimits,
  ];
  if (
    !counters.every(finiteNonNegativeInteger) ||
    !candidate.accounts ||
    typeof candidate.accounts !== "object"
  ) {
    return false;
  }
  return Object.entries(candidate.accounts).every(
    ([label, account]) => validAccountStats(account) && label === account.label,
  );
}

function validSnapshot(value: unknown): value is PersistedProxyStatsSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PersistedProxyStatsSnapshot>;
  return (
    candidate.schemaVersion === SNAPSHOT_SCHEMA_VERSION &&
    finiteNonNegativeInteger(candidate.revision) &&
    finiteNonNegativeInteger(candidate.updatedAt) &&
    validStats(candidate.stats)
  );
}

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

function isCorruptSnapshotError(error: unknown): boolean {
  return (
    error instanceof SyntaxError ||
    error instanceof InvalidProxyStatsSnapshotError
  );
}

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readLockOwner(
  lockPath: string,
): Promise<ProxyStatsLockOwner | null> {
  try {
    const parsed = JSON.parse(await readFile(lockPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const candidate = parsed as Partial<ProxyStatsLockOwner>;
    if (
      typeof candidate.token !== "string" ||
      !finiteNonNegativeInteger(candidate.pid) ||
      candidate.pid === 0 ||
      !finiteNonNegativeInteger(candidate.acquiredAt)
    ) {
      return null;
    }
    return candidate as ProxyStatsLockOwner;
  } catch {
    return null;
  }
}

async function removeAbandonedLock(
  lockPath: string,
  staleLockMs: number,
  now: number,
): Promise<boolean> {
  const owner = await readLockOwner(lockPath);
  try {
    const lockStat = await stat(lockPath);
    const oldEnough = now - lockStat.mtimeMs >= staleLockMs;
    const ownerIsRunning = owner ? processIsRunning(owner.pid) : false;
    if (owner && ownerIsRunning && !oldEnough) {
      return false;
    }
    if ((owner && !ownerIsRunning) || oldEnough) {
      await rm(lockPath, { force: true });
      return true;
    }
  } catch (error) {
    return isMissingFileError(error);
  }
  return false;
}

async function acquireFileLock(
  lockPath: string,
  timeoutMs: number,
  staleLockMs: number,
  now: () => number,
): Promise<() => Promise<void>> {
  await mkdir(dirname(lockPath), { recursive: true, mode: 0o700 });
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const owner: ProxyStatsLockOwner = {
      token: randomUUID(),
      pid: process.pid,
      acquiredAt: now(),
    };
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      handle = await open(lockPath, "wx", 0o600);
      await handle.writeFile(JSON.stringify(owner));
      const acquiredHandle = handle;
      return async () => {
        await acquiredHandle.close().catch(() => undefined);
        const current = await readLockOwner(lockPath);
        if (current?.token === owner.token) {
          await rm(lockPath, { force: true }).catch(() => undefined);
        }
      };
    } catch (error) {
      if (handle) {
        await handle.close().catch(() => undefined);
        await rm(lockPath, { force: true }).catch(() => undefined);
      }
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    if (await removeAbandonedLock(lockPath, staleLockMs, now())) {
      continue;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out acquiring proxy stats lock ${lockPath}`);
    }
    await sleep(LOCK_RETRY_MS);
  }
}

export class ProxyUsageStatsStore {
  private readonly now: () => number;
  private readonly flushIntervalMs: number;
  private readonly lockTimeoutMs: number;
  private readonly staleLockMs: number;
  private filePath?: string;
  private stats: ProxyStats;
  private pending: ProxyStats;
  private pendingMutations = 0;
  private inFlightMutations = 0;
  private revision = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly flushMutex = new AsyncMutex();
  private lastFlushedAt?: number;
  private lastReconciledAt?: number;
  private lastRecoveryAt?: number;
  private lastError?: string;

  constructor(options: ProxyUsageStatsStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
    this.staleLockMs = options.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
    this.filePath = options.filePath;
    const startedAt = this.now();
    this.stats = emptyStats(startedAt);
    this.pending = emptyStats(startedAt);
  }

  async initialize(filePath: string = this.filePath ?? ""): Promise<void> {
    this.cancelFlushTimer();
    this.filePath = filePath || undefined;
    const startedAt = this.now();
    this.stats = emptyStats(startedAt);
    this.pending = emptyStats(startedAt);
    this.pendingMutations = 0;
    this.inFlightMutations = 0;
    this.revision = 0;
    this.lastFlushedAt = undefined;
    this.lastReconciledAt = undefined;
    this.lastRecoveryAt = undefined;
    this.lastError = undefined;
    if (!this.filePath) {
      return;
    }
    try {
      const snapshot = await this.readSnapshot();
      if (snapshot) {
        this.stats = cloneStats(snapshot.stats);
        this.pending = emptyStats(this.now());
        this.revision = snapshot.revision;
        this.lastFlushedAt = snapshot.updatedAt;
      }
      this.lastReconciledAt = this.now();
    } catch (error) {
      if (isCorruptSnapshotError(error)) {
        try {
          const recoveredSnapshot = await this.recoverCorruptSnapshot();
          if (recoveredSnapshot) {
            this.applySnapshot(recoveredSnapshot);
          }
          this.lastReconciledAt = this.now();
        } catch (recoveryError) {
          this.lastError = this.describeError(recoveryError);
        }
      } else {
        this.lastError = this.describeError(error);
      }
    }
  }

  recordAttempt(accountLabel: string, accountType: string): void {
    const attemptedAt = this.now();
    this.applyAttempt(this.stats, accountLabel, accountType, attemptedAt);
    this.applyAttempt(this.pending, accountLabel, accountType, attemptedAt);
    this.markMutation();
  }

  recordFinalSuccess(accountLabel?: string, accountType?: string): void {
    this.applyFinalSuccess(this.stats, accountLabel, accountType);
    this.applyFinalSuccess(this.pending, accountLabel, accountType);
    this.markMutation();
  }

  recordAttemptError(
    accountLabel: string,
    accountType: string,
    status: number,
    rateLimitKind?: "transient" | "quota",
  ): void {
    const failedAt = this.now();
    this.applyAttemptError(
      this.stats,
      accountLabel,
      accountType,
      status,
      rateLimitKind,
      failedAt,
    );
    this.applyAttemptError(
      this.pending,
      accountLabel,
      accountType,
      status,
      rateLimitKind,
      failedAt,
    );
    this.markMutation();
  }

  recordFinalError(
    _status: number,
    accountLabel?: string,
    accountType?: string,
  ): void {
    const failedAt = this.now();
    this.applyFinalError(this.stats, accountLabel, accountType, failedAt);
    this.applyFinalError(this.pending, accountLabel, accountType, failedAt);
    this.markMutation();
  }

  getStats(): ProxyStats {
    return cloneStats(this.stats);
  }

  getAccountStats(label: string): AccountStats | undefined {
    const account = this.stats.accounts[label];
    return account ? cloneAccount(account) : undefined;
  }

  getPersistenceStatus(): ProxyStatsPersistenceStatus {
    return {
      enabled: !!this.filePath,
      filePath: this.filePath ?? null,
      revision: this.revision,
      pendingMutations: this.pendingMutations,
      inFlightMutations: this.inFlightMutations,
      unpersistedMutations: this.pendingMutations + this.inFlightMutations,
      lastFlushedAt: this.lastFlushedAt ?? null,
      lastReconciledAt: this.lastReconciledAt ?? null,
      lastRecoveryAt: this.lastRecoveryAt ?? null,
      lastError: this.lastError ?? null,
    };
  }

  async flush(): Promise<void> {
    if (
      !this.filePath ||
      (this.pendingMutations === 0 && this.inFlightMutations === 0)
    ) {
      return;
    }
    this.cancelFlushTimer();
    await this.flushMutex.runExclusive(async () => {
      if (!this.filePath || this.pendingMutations === 0) {
        return;
      }
      const delta = this.pending;
      const deltaMutations = this.pendingMutations;
      this.pending = emptyStats(this.now());
      this.pendingMutations = 0;
      this.inFlightMutations = deltaMutations;
      const lockPath = `${this.filePath}.lock`;
      let releaseLock: (() => Promise<void>) | undefined;
      try {
        releaseLock = await acquireFileLock(
          lockPath,
          this.lockTimeoutMs,
          this.staleLockMs,
          this.now,
        );
        let existing: PersistedProxyStatsSnapshot | null;
        try {
          existing = await this.readSnapshot();
        } catch (error) {
          if (!isCorruptSnapshotError(error)) {
            throw error;
          }
          await this.quarantineCorruptSnapshot();
          existing = null;
        }
        const persisted = existing?.stats ?? emptyStats(delta.startedAt);
        const merged = mergeStats(persisted, delta);
        const revision = (existing?.revision ?? 0) + 1;
        const updatedAt = this.now();
        await writeJsonSnapshotAtomically(
          this.filePath,
          {
            schemaVersion: SNAPSHOT_SCHEMA_VERSION,
            revision,
            updatedAt,
            stats: merged,
          } satisfies PersistedProxyStatsSnapshot,
          0o600,
        );
        this.revision = revision;
        this.lastFlushedAt = updatedAt;
        this.lastReconciledAt = updatedAt;
        this.lastError = undefined;
        this.stats = mergeStats(merged, this.pending);
        this.inFlightMutations = 0;
      } catch (error) {
        this.pending = mergeStats(delta, this.pending);
        this.pendingMutations += deltaMutations;
        this.inFlightMutations = 0;
        this.lastError = this.describeError(error);
        this.scheduleFlush();
      } finally {
        await releaseLock?.();
      }
    });
  }

  async reconcile(): Promise<ProxyStats> {
    if (!this.filePath) {
      return this.getStats();
    }

    return this.flushMutex.runExclusive(async () => {
      try {
        const snapshot = await this.readSnapshot();
        if (snapshot) {
          this.stats = mergeStats(snapshot.stats, this.pending);
          this.revision = snapshot.revision;
          this.lastFlushedAt = snapshot.updatedAt;
        }
        this.lastReconciledAt = this.now();
        this.lastError = undefined;
      } catch (error) {
        this.lastError = this.describeError(error);
      }
      return this.getStats();
    });
  }

  resetMemory(): void {
    this.cancelFlushTimer();
    const startedAt = this.now();
    this.stats = emptyStats(startedAt);
    this.pending = emptyStats(startedAt);
    this.pendingMutations = 0;
    this.inFlightMutations = 0;
    this.revision = 0;
    this.lastFlushedAt = undefined;
    this.lastReconciledAt = undefined;
    this.lastRecoveryAt = undefined;
    this.lastError = undefined;
  }

  async resetForTests(): Promise<void> {
    await this.flushMutex.runExclusive(async () => {
      this.resetMemory();
      this.filePath = undefined;
    });
  }

  private markMutation(): void {
    this.pendingMutations += 1;
    this.scheduleFlush();
  }

  private applyAttempt(
    target: ProxyStats,
    accountLabel: string,
    accountType: string,
    attemptedAt: number,
  ): void {
    target.totalAttempts += 1;
    const account = this.ensureAccount(target, accountLabel, accountType);
    account.attemptCount += 1;
    account.lastAttemptAt = attemptedAt;
  }

  private applyFinalSuccess(
    target: ProxyStats,
    accountLabel?: string,
    accountType?: string,
  ): void {
    target.totalRequests += 1;
    target.totalSuccess += 1;
    if (accountLabel && accountType) {
      this.ensureAccount(target, accountLabel, accountType).successCount += 1;
    }
  }

  private applyAttemptError(
    target: ProxyStats,
    accountLabel: string,
    accountType: string,
    status: number,
    rateLimitKind: "transient" | "quota" | undefined,
    failedAt: number,
  ): void {
    const account = this.ensureAccount(target, accountLabel, accountType);
    target.totalAttemptErrors += 1;
    account.attemptErrorCount += 1;
    account.lastErrorAt = failedAt;
    if (status !== 429) {
      return;
    }
    target.totalRateLimits += 1;
    account.rateLimitCount += 1;
    if (rateLimitKind === "transient") {
      target.totalTransientRateLimits += 1;
      account.transientRateLimitCount += 1;
    } else if (rateLimitKind === "quota") {
      target.totalQuotaRateLimits += 1;
      account.quotaRateLimitCount += 1;
    }
  }

  private applyFinalError(
    target: ProxyStats,
    accountLabel: string | undefined,
    accountType: string | undefined,
    failedAt: number,
  ): void {
    target.totalRequests += 1;
    target.totalErrors += 1;
    if (accountLabel && accountType) {
      const account = this.ensureAccount(target, accountLabel, accountType);
      account.errorCount += 1;
      account.lastErrorAt = failedAt;
    }
  }

  private ensureAccount(
    target: ProxyStats,
    label: string,
    type: string,
  ): AccountStats {
    if (!target.accounts[label]) {
      target.accounts[label] = {
        label,
        type,
        attemptCount: 0,
        attemptErrorCount: 0,
        successCount: 0,
        errorCount: 0,
        rateLimitCount: 0,
        transientRateLimitCount: 0,
        quotaRateLimitCount: 0,
        lastAttemptAt: 0,
      };
    }
    return target.accounts[label];
  }

  private scheduleFlush(): void {
    if (!this.filePath || this.flushTimer) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush().catch((error) => {
        this.lastError = this.describeError(error);
        this.scheduleFlush();
      });
    }, this.flushIntervalMs);
    this.flushTimer.unref?.();
  }

  private cancelFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async readSnapshot(): Promise<PersistedProxyStatsSnapshot | null> {
    if (!this.filePath) {
      return null;
    }
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isMissingFileError(error)) {
        return null;
      }
      throw error;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!validSnapshot(parsed)) {
      throw new InvalidProxyStatsSnapshotError(
        `Invalid proxy stats snapshot ${this.filePath}`,
      );
    }
    return parsed;
  }

  private applySnapshot(snapshot: PersistedProxyStatsSnapshot): void {
    this.stats = cloneStats(snapshot.stats);
    this.pending = emptyStats(this.now());
    this.revision = snapshot.revision;
    this.lastFlushedAt = snapshot.updatedAt;
  }

  private async recoverCorruptSnapshot(): Promise<PersistedProxyStatsSnapshot | null> {
    if (!this.filePath) {
      return null;
    }
    const releaseLock = await acquireFileLock(
      `${this.filePath}.lock`,
      this.lockTimeoutMs,
      this.staleLockMs,
      this.now,
    );
    try {
      try {
        return await this.readSnapshot();
      } catch (error) {
        if (!isCorruptSnapshotError(error)) {
          throw error;
        }
        await this.quarantineCorruptSnapshot();
        return null;
      }
    } finally {
      await releaseLock();
    }
  }

  private async quarantineCorruptSnapshot(): Promise<void> {
    if (!this.filePath) {
      return;
    }
    const recoveredAt = this.now();
    const quarantinePath = `${this.filePath}.corrupt.${recoveredAt}.${randomUUID()}`;
    try {
      await rename(this.filePath, quarantinePath);
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
      return;
    }
    this.lastRecoveryAt = recoveredAt;
    this.lastError = undefined;
    await this.pruneCorruptSnapshots();
  }

  private async pruneCorruptSnapshots(): Promise<void> {
    if (!this.filePath) {
      return;
    }
    const directory = dirname(this.filePath);
    const prefix = `${basename(this.filePath)}.corrupt.`;
    const quarantined = (await readdir(directory))
      .filter((entry) => entry.startsWith(prefix))
      .sort()
      .reverse();
    await Promise.all(
      quarantined
        .slice(MAX_CORRUPT_SNAPSHOTS)
        .map((entry) => rm(join(directory, entry), { force: true })),
    );
  }

  private describeError(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).slice(
      0,
      1_000,
    );
  }
}

const defaultStore = new ProxyUsageStatsStore();

export async function initUsageStats(filePath: string): Promise<void> {
  await defaultStore.initialize(filePath);
}

export function recordAttempt(accountLabel: string, accountType: string): void {
  defaultStore.recordAttempt(accountLabel, accountType);
}

export function recordFinalSuccess(
  accountLabel?: string,
  accountType?: string,
): void {
  defaultStore.recordFinalSuccess(accountLabel, accountType);
}

export function recordAttemptError(
  accountLabel: string,
  accountType: string,
  status: number,
  rateLimitKind?: "transient" | "quota",
): void {
  defaultStore.recordAttemptError(
    accountLabel,
    accountType,
    status,
    rateLimitKind,
  );
}

export function recordFinalError(
  _status: number,
  accountLabel?: string,
  accountType?: string,
): void {
  defaultStore.recordFinalError(_status, accountLabel, accountType);
}

export function getStats(): ProxyStats {
  return defaultStore.getStats();
}

export async function getReconciledStats(): Promise<ProxyStats> {
  return defaultStore.reconcile();
}

export function getAccountStats(label: string): AccountStats | undefined {
  return defaultStore.getAccountStats(label);
}

export function getUsageStatsPersistenceStatus(): ProxyStatsPersistenceStatus {
  return defaultStore.getPersistenceStatus();
}

export async function flushUsageStats(): Promise<void> {
  await defaultStore.flush();
}

/** Reset process-local counters while intentionally preserving durable state. */
export function resetStats(): void {
  defaultStore.resetMemory();
}

/** Disconnect persistence and clear singleton state between isolated tests. */
export async function resetUsageStatsForTests(): Promise<void> {
  await defaultStore.resetForTests();
}
