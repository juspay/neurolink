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
import { normalizeAnthropicAccountKey } from "./accountSelection.js";
import type {
  AccountStats,
  PersistedProxyTerminalErrorSnapshot,
  PersistedProxyStatsSnapshot,
  ProxyTerminalErrorCategory,
  ProxyTerminalErrorDetails,
  ProxyTerminalErrorJournal,
  ProxyTerminalErrorSummary,
  ProxyStatsLockOwner,
  ProxyStats,
  ProxyStatsPersistenceStatus,
  ProxyUsageStatsSnapshot,
  ProxyUsageStatsStoreOptions,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { redactUrlsInText, sanitizeForLog } from "../utils/logSanitize.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const SNAPSHOT_SCHEMA_VERSION = 1;
const DEFAULT_FLUSH_INTERVAL_MS = 1_000;
const DEFAULT_LOCK_TIMEOUT_MS = 2_000;
const DEFAULT_STALE_LOCK_MS = 30_000;
const LOCK_RETRY_MS = 25;
const MAX_CORRUPT_SNAPSHOTS = 3;
const MAX_RECENT_TERMINAL_ERRORS = 20;
const MAX_TERMINAL_ERROR_FIELD_LENGTH = 128;
const MAX_TERMINAL_ERROR_MESSAGE_LENGTH = 500;
const TERMINAL_ERROR_ESCAPE = String.fromCharCode(27);
const TERMINAL_ERROR_BELL = String.fromCharCode(7);
const TERMINAL_ERROR_OSC_PATTERN = new RegExp(
  `${TERMINAL_ERROR_ESCAPE}\\][\\s\\S]*?(?:${TERMINAL_ERROR_BELL}|${TERMINAL_ERROR_ESCAPE}\\\\)`,
  "g",
);
const TERMINAL_ERROR_ANSI_PATTERN = new RegExp(
  `${TERMINAL_ERROR_ESCAPE}\\[[0-?]*[ -/]*[@-~]`,
  "g",
);
const TERMINAL_ERROR_CATEGORIES = [
  "authentication",
  "client_cancelled",
  "fallback_exhausted",
  "invalid_request",
  "proxy_error",
  "rate_limit",
  "stream_error",
  "unclassified",
  "upstream_error",
  "other",
] as const satisfies readonly ProxyTerminalErrorCategory[];

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

function emptyTerminalErrorCounts(): Record<
  ProxyTerminalErrorCategory,
  number
> {
  return Object.fromEntries(
    TERMINAL_ERROR_CATEGORIES.map((category) => [category, 0]),
  ) as Record<ProxyTerminalErrorCategory, number>;
}

function emptyTerminalErrorJournal(
  startedAt: number,
): ProxyTerminalErrorJournal {
  return {
    startedAt,
    totalErrors: 0,
    counts: emptyTerminalErrorCounts(),
    recent: [],
  };
}

/**
 * Statistics must never use an email/label as their primary map key. One
 * person can authenticate both provider pools with the same email, and a
 * bare key silently merged their attempts, limits, and failures into one row.
 *
 * Keep non-account pseudo rows (passthrough, peer, internal) untouched. The
 * display label remains separate so the CLI stays readable while persisted
 * counters retain a collision-proof identity.
 */
function resolveStatsAccountIdentity(
  label: string,
  type: string,
): { key: string; label: string } {
  if (type === "codex-oauth") {
    const key = label.startsWith("codex:") ? label : `codex:${label}`;
    return {
      key,
      label: label.startsWith("codex:") ? label.slice("codex:".length) : label,
    };
  }
  if (type === "oauth" || type === "api_key") {
    const key = normalizeAnthropicAccountKey(label);
    return {
      key,
      label: label.startsWith("anthropic:")
        ? label.slice("anthropic:".length)
        : label,
    };
  }
  return { key: label, label };
}

function cloneTerminalErrorSummary(
  summary: ProxyTerminalErrorSummary,
): ProxyTerminalErrorSummary {
  return { ...summary };
}

function cloneTerminalErrorJournal(
  journal: ProxyTerminalErrorJournal,
): ProxyTerminalErrorJournal {
  return {
    ...journal,
    counts: { ...journal.counts },
    recent: journal.recent.map(cloneTerminalErrorSummary),
  };
}

function mergeTerminalErrorJournals(
  left: ProxyTerminalErrorJournal,
  right: ProxyTerminalErrorJournal,
): ProxyTerminalErrorJournal {
  const counts = emptyTerminalErrorCounts();
  for (const category of TERMINAL_ERROR_CATEGORIES) {
    counts[category] = left.counts[category] + right.counts[category];
  }
  const byId = new Map<string, ProxyTerminalErrorSummary>();
  for (const summary of [...left.recent, ...right.recent]) {
    byId.set(summary.id, cloneTerminalErrorSummary(summary));
  }
  const recent = [...byId.values()]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-MAX_RECENT_TERMINAL_ERRORS);
  return {
    startedAt: Math.min(left.startedAt, right.startedAt),
    totalErrors: left.totalErrors + right.totalErrors,
    counts,
    recent,
  };
}

function terminalErrorsPathForStats(filePath: string): string {
  return join(dirname(filePath), "proxy-terminal-errors.json");
}

function clipTerminalErrorField(value: string | undefined): string | undefined {
  const clipped = value?.slice(0, MAX_TERMINAL_ERROR_FIELD_LENGTH);
  return clipped ? clipped : undefined;
}

function stripTerminalErrorControlCharacters(value: string): string {
  const withoutAnsi = value
    .replace(TERMINAL_ERROR_OSC_PATTERN, "")
    .replace(TERMINAL_ERROR_ANSI_PATTERN, "");
  return Array.from(withoutAnsi, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159) ? " " : character;
  }).join("");
}

function terminalErrorCategory(
  status: number,
  errorType: string | undefined,
): ProxyTerminalErrorCategory {
  const normalized = errorType?.toLowerCase() ?? "";
  if (status === 499 || normalized.includes("client_cancel")) {
    return "client_cancelled";
  }
  if (normalized.includes("stream_telemetry")) {
    return "proxy_error";
  }
  if (normalized.includes("stream")) {
    return "stream_error";
  }
  if (status === 429 || normalized.includes("rate_limit")) {
    return "rate_limit";
  }
  if (normalized.includes("auth") || normalized.includes("token_refresh")) {
    return "authentication";
  }
  if (
    status === 404 ||
    normalized.includes("invalid_request") ||
    normalized.includes("not_found") ||
    normalized.includes("construction_rejection")
  ) {
    return "invalid_request";
  }
  if (normalized.includes("fallback_exhausted")) {
    return "fallback_exhausted";
  }
  if (
    normalized.includes("proxy") ||
    normalized.includes("handler_error") ||
    normalized.includes("runtime")
  ) {
    return "proxy_error";
  }
  if (
    normalized.includes("upstream") ||
    normalized.includes("network") ||
    normalized.includes("transient") ||
    normalized.includes("generation") ||
    normalized.includes("all_accounts") ||
    normalized === "api_error" ||
    status >= 500
  ) {
    return "upstream_error";
  }
  return normalized ? "other" : "unclassified";
}

function createTerminalErrorSummary(args: {
  now: number;
  status: number;
  accountLabel?: string;
  accountType?: string;
  details?: ProxyTerminalErrorDetails;
}): ProxyTerminalErrorSummary {
  const { now, status, accountLabel, accountType, details } = args;
  const accountIdentity =
    accountLabel && accountType
      ? resolveStatsAccountIdentity(accountLabel, accountType)
      : undefined;
  const errorType = clipTerminalErrorField(details?.errorType);
  const message = details?.message
    ? stripTerminalErrorControlCharacters(
        sanitizeForLog(
          redactUrlsInText(details.message),
          MAX_TERMINAL_ERROR_MESSAGE_LENGTH + MAX_TERMINAL_ERROR_FIELD_LENGTH,
        ),
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_TERMINAL_ERROR_MESSAGE_LENGTH)
    : undefined;
  return {
    id: randomUUID(),
    at: now,
    status,
    category: terminalErrorCategory(status, errorType),
    ...(clipTerminalErrorField(details?.requestId)
      ? { requestId: clipTerminalErrorField(details?.requestId) }
      : {}),
    ...(clipTerminalErrorField(accountLabel)
      ? { account: clipTerminalErrorField(accountLabel) }
      : {}),
    ...(clipTerminalErrorField(details?.accountKey ?? accountIdentity?.key)
      ? {
          accountKey: clipTerminalErrorField(
            details?.accountKey ?? accountIdentity?.key,
          ),
        }
      : {}),
    ...(clipTerminalErrorField(accountType)
      ? { accountType: clipTerminalErrorField(accountType) }
      : {}),
    ...(errorType ? { errorType } : {}),
    ...(clipTerminalErrorField(details?.errorCode)
      ? { errorCode: clipTerminalErrorField(details?.errorCode) }
      : {}),
    ...(clipTerminalErrorField(details?.terminalOutcome)
      ? {
          terminalOutcome: clipTerminalErrorField(details?.terminalOutcome),
        }
      : {}),
    ...(message ? { message } : {}),
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
  const key = right.key ?? left.key;
  return {
    ...(key ? { key } : {}),
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
    (candidate.key === undefined ||
      (typeof candidate.key === "string" && candidate.key.length > 0)) &&
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
    ([key, account]) =>
      validAccountStats(account) && key === (account.key ?? account.label),
  );
}

function validOptionalString(value: unknown, maxLength: number): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && value.length <= maxLength)
  );
}

function validTerminalErrorSummary(
  value: unknown,
): value is ProxyTerminalErrorSummary {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyTerminalErrorSummary>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.id.length <= MAX_TERMINAL_ERROR_FIELD_LENGTH &&
    finiteNonNegativeInteger(candidate.at) &&
    finiteNonNegativeInteger(candidate.status) &&
    typeof candidate.category === "string" &&
    TERMINAL_ERROR_CATEGORIES.includes(candidate.category) &&
    validOptionalString(candidate.requestId, MAX_TERMINAL_ERROR_FIELD_LENGTH) &&
    validOptionalString(candidate.account, MAX_TERMINAL_ERROR_FIELD_LENGTH) &&
    validOptionalString(
      candidate.accountKey,
      MAX_TERMINAL_ERROR_FIELD_LENGTH,
    ) &&
    validOptionalString(
      candidate.accountType,
      MAX_TERMINAL_ERROR_FIELD_LENGTH,
    ) &&
    validOptionalString(candidate.errorType, MAX_TERMINAL_ERROR_FIELD_LENGTH) &&
    validOptionalString(candidate.errorCode, MAX_TERMINAL_ERROR_FIELD_LENGTH) &&
    validOptionalString(
      candidate.terminalOutcome,
      MAX_TERMINAL_ERROR_FIELD_LENGTH,
    ) &&
    validOptionalString(candidate.message, MAX_TERMINAL_ERROR_MESSAGE_LENGTH)
  );
}

function validTerminalErrorJournal(
  value: unknown,
): value is ProxyTerminalErrorJournal {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyTerminalErrorJournal>;
  if (
    !finiteNonNegativeInteger(candidate.startedAt) ||
    !finiteNonNegativeInteger(candidate.totalErrors) ||
    !candidate.counts ||
    typeof candidate.counts !== "object" ||
    !Array.isArray(candidate.recent) ||
    candidate.recent.length > MAX_RECENT_TERMINAL_ERRORS ||
    !candidate.recent.every(validTerminalErrorSummary)
  ) {
    return false;
  }
  const countEntries = Object.entries(candidate.counts);
  return (
    countEntries.length === TERMINAL_ERROR_CATEGORIES.length &&
    countEntries.every(
      ([category, count]) =>
        TERMINAL_ERROR_CATEGORIES.includes(
          category as ProxyTerminalErrorCategory,
        ) && finiteNonNegativeInteger(count),
    ) &&
    countEntries.reduce((total, [, count]) => total + Number(count), 0) ===
      candidate.totalErrors
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

function validTerminalErrorSnapshot(
  value: unknown,
): value is PersistedProxyTerminalErrorSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PersistedProxyTerminalErrorSnapshot>;
  return (
    candidate.schemaVersion === SNAPSHOT_SCHEMA_VERSION &&
    finiteNonNegativeInteger(candidate.revision) &&
    finiteNonNegativeInteger(candidate.updatedAt) &&
    validTerminalErrorJournal(candidate.journal)
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
  private terminalErrorsFilePath?: string;
  private stats: ProxyStats;
  private pending: ProxyStats;
  private terminalErrors: ProxyTerminalErrorJournal;
  private pendingTerminalErrors: ProxyTerminalErrorJournal;
  private pendingMutations = 0;
  private inFlightMutations = 0;
  private pendingTerminalErrorMutations = 0;
  private inFlightTerminalErrorMutations = 0;
  private revision = 0;
  private terminalErrorsRevision = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly flushMutex = new AsyncMutex();
  private lastFlushedAt?: number;
  private lastReconciledAt?: number;
  private lastRecoveryAt?: number;
  private lastError?: string;
  private terminalErrorsLastFlushedAt?: number;
  private terminalErrorsLastRecoveryAt?: number;
  private terminalErrorsLastError?: string;
  private snapshotVersion = 0;

  constructor(options: ProxyUsageStatsStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
    this.staleLockMs = options.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
    this.filePath = options.filePath;
    this.terminalErrorsFilePath =
      options.terminalErrorsFilePath ??
      (options.filePath
        ? terminalErrorsPathForStats(options.filePath)
        : undefined);
    const startedAt = this.now();
    this.stats = emptyStats(startedAt);
    this.pending = emptyStats(startedAt);
    this.terminalErrors = emptyTerminalErrorJournal(startedAt);
    this.pendingTerminalErrors = emptyTerminalErrorJournal(startedAt);
  }

  async initialize(filePath: string = this.filePath ?? ""): Promise<void> {
    this.cancelFlushTimer();
    const configuredStatsPath = this.filePath;
    const configuredTerminalErrorsPath = this.terminalErrorsFilePath;
    this.filePath = filePath || undefined;
    this.terminalErrorsFilePath =
      this.filePath &&
      configuredStatsPath === this.filePath &&
      configuredTerminalErrorsPath
        ? configuredTerminalErrorsPath
        : this.filePath
          ? terminalErrorsPathForStats(this.filePath)
          : undefined;
    const startedAt = this.now();
    this.stats = emptyStats(startedAt);
    this.pending = emptyStats(startedAt);
    this.terminalErrors = emptyTerminalErrorJournal(startedAt);
    this.pendingTerminalErrors = emptyTerminalErrorJournal(startedAt);
    this.pendingMutations = 0;
    this.inFlightMutations = 0;
    this.pendingTerminalErrorMutations = 0;
    this.inFlightTerminalErrorMutations = 0;
    this.revision = 0;
    this.terminalErrorsRevision = 0;
    this.lastFlushedAt = undefined;
    this.lastReconciledAt = undefined;
    this.lastRecoveryAt = undefined;
    this.lastError = undefined;
    this.terminalErrorsLastFlushedAt = undefined;
    this.terminalErrorsLastRecoveryAt = undefined;
    this.terminalErrorsLastError = undefined;
    this.snapshotVersion = 0;
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
    if (!this.terminalErrorsFilePath) {
      return;
    }
    try {
      const snapshot = await this.readTerminalErrorSnapshot();
      if (snapshot) {
        this.applyTerminalErrorSnapshot(snapshot);
      }
    } catch (error) {
      if (isCorruptSnapshotError(error)) {
        try {
          const recoveredSnapshot =
            await this.recoverCorruptTerminalErrorSnapshot();
          if (recoveredSnapshot) {
            this.applyTerminalErrorSnapshot(recoveredSnapshot);
          }
        } catch (recoveryError) {
          this.terminalErrorsLastError = this.describeError(recoveryError);
        }
      } else {
        this.terminalErrorsLastError = this.describeError(error);
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
    status: number,
    accountLabel?: string,
    accountType?: string,
    details?: ProxyTerminalErrorDetails,
  ): void {
    const failedAt = this.now();
    const summary = createTerminalErrorSummary({
      now: failedAt,
      status,
      accountLabel,
      accountType,
      details,
    });
    this.applyFinalError(this.stats, accountLabel, accountType, failedAt);
    this.applyFinalError(this.pending, accountLabel, accountType, failedAt);
    this.applyTerminalError(this.terminalErrors, summary);
    if (this.terminalErrorsFilePath) {
      this.applyTerminalError(this.pendingTerminalErrors, summary);
      this.pendingTerminalErrorMutations += 1;
    }
    this.markMutation();
  }

  getStats(): ProxyStats {
    return cloneStats(this.stats);
  }

  getAccountStats(label: string, type?: string): AccountStats | undefined {
    const direct = this.stats.accounts[label];
    if (direct) {
      return cloneAccount(direct);
    }
    const identity = type
      ? resolveStatsAccountIdentity(label, type)
      : undefined;
    const account = identity
      ? this.stats.accounts[identity.key]
      : (() => {
          const matches = Object.values(this.stats.accounts).filter(
            (candidate) => candidate.label === label,
          );
          return matches.length === 1 ? matches[0] : undefined;
        })();
    return account ? cloneAccount(account) : undefined;
  }

  getTerminalErrors(): ProxyTerminalErrorJournal {
    return cloneTerminalErrorJournal(this.terminalErrors);
  }

  getUsageSnapshot(): ProxyUsageStatsSnapshot {
    const version = this.snapshotVersion;
    return {
      stats: this.getStats(),
      statsVersion: version,
      terminalErrors: this.getTerminalErrors(),
      terminalErrorsVersion: version,
    };
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
      terminalErrorsFilePath: this.terminalErrorsFilePath ?? null,
      terminalErrorsRevision: this.terminalErrorsRevision,
      terminalErrorsPending: this.pendingTerminalErrorMutations,
      terminalErrorsInFlight: this.inFlightTerminalErrorMutations,
      terminalErrorsUnpersisted:
        this.pendingTerminalErrorMutations +
        this.inFlightTerminalErrorMutations,
      terminalErrorsLastFlushedAt: this.terminalErrorsLastFlushedAt ?? null,
      terminalErrorsLastRecoveryAt: this.terminalErrorsLastRecoveryAt ?? null,
      terminalErrorsLastError: this.terminalErrorsLastError ?? null,
    };
  }

  async flush(): Promise<void> {
    if (
      !this.filePath ||
      (this.pendingMutations === 0 &&
        this.inFlightMutations === 0 &&
        this.pendingTerminalErrorMutations === 0 &&
        this.inFlightTerminalErrorMutations === 0)
    ) {
      return;
    }
    this.cancelFlushTimer();
    await this.flushMutex.runExclusive(async () => {
      if (!this.filePath) {
        return;
      }
      let statsDelta: { value: ProxyStats; mutations: number } | undefined;
      let terminalErrorDelta:
        | { value: ProxyTerminalErrorJournal; mutations: number }
        | undefined;
      if (this.pendingMutations > 0) {
        statsDelta = {
          value: this.pending,
          mutations: this.pendingMutations,
        };
        this.pending = emptyStats(this.now());
        this.pendingMutations = 0;
        this.inFlightMutations = statsDelta.mutations;
      }
      if (
        this.terminalErrorsFilePath &&
        this.pendingTerminalErrorMutations > 0
      ) {
        terminalErrorDelta = {
          value: this.pendingTerminalErrors,
          mutations: this.pendingTerminalErrorMutations,
        };
        this.pendingTerminalErrors = emptyTerminalErrorJournal(this.now());
        this.pendingTerminalErrorMutations = 0;
        this.inFlightTerminalErrorMutations = terminalErrorDelta.mutations;
      }

      const countersPersisted = statsDelta
        ? await this.persistStatsDelta(statsDelta.value, statsDelta.mutations)
        : true;
      if (terminalErrorDelta) {
        if (countersPersisted) {
          await this.persistTerminalErrorDelta(
            terminalErrorDelta.value,
            terminalErrorDelta.mutations,
          );
        } else {
          this.pendingTerminalErrors = mergeTerminalErrorJournals(
            terminalErrorDelta.value,
            this.pendingTerminalErrors,
          );
          this.pendingTerminalErrorMutations += terminalErrorDelta.mutations;
          this.inFlightTerminalErrorMutations = 0;
        }
      }
      if (this.pendingMutations > 0 || this.pendingTerminalErrorMutations > 0) {
        this.scheduleFlush();
      }
    });
  }

  private async persistStatsDelta(
    delta: ProxyStats,
    deltaMutations: number,
  ): Promise<boolean> {
    if (!this.filePath) {
      return false;
    }
    let releaseLock: (() => Promise<void>) | undefined;
    try {
      releaseLock = await acquireFileLock(
        `${this.filePath}.lock`,
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
      return true;
    } catch (error) {
      this.pending = mergeStats(delta, this.pending);
      this.pendingMutations += deltaMutations;
      this.inFlightMutations = 0;
      this.lastError = this.describeError(error);
      return false;
    } finally {
      await releaseLock?.();
    }
  }

  private async persistTerminalErrorDelta(
    delta: ProxyTerminalErrorJournal,
    deltaMutations: number,
  ): Promise<void> {
    if (!this.terminalErrorsFilePath) {
      return;
    }
    let releaseLock: (() => Promise<void>) | undefined;
    try {
      releaseLock = await acquireFileLock(
        `${this.terminalErrorsFilePath}.lock`,
        this.lockTimeoutMs,
        this.staleLockMs,
        this.now,
      );
      let existing: PersistedProxyTerminalErrorSnapshot | null;
      try {
        existing = await this.readTerminalErrorSnapshot();
      } catch (error) {
        if (!isCorruptSnapshotError(error)) {
          throw error;
        }
        await this.quarantineCorruptTerminalErrorSnapshot();
        existing = null;
      }
      const persisted =
        existing?.journal ?? emptyTerminalErrorJournal(delta.startedAt);
      const merged = mergeTerminalErrorJournals(persisted, delta);
      const revision = (existing?.revision ?? 0) + 1;
      const updatedAt = this.now();
      await writeJsonSnapshotAtomically(
        this.terminalErrorsFilePath,
        {
          schemaVersion: SNAPSHOT_SCHEMA_VERSION,
          revision,
          updatedAt,
          journal: merged,
        } satisfies PersistedProxyTerminalErrorSnapshot,
        0o600,
      );
      this.terminalErrorsRevision = revision;
      this.terminalErrorsLastFlushedAt = updatedAt;
      this.terminalErrorsLastError = undefined;
      this.terminalErrors = mergeTerminalErrorJournals(
        merged,
        this.pendingTerminalErrors,
      );
      this.inFlightTerminalErrorMutations = 0;
    } catch (error) {
      this.pendingTerminalErrors = mergeTerminalErrorJournals(
        delta,
        this.pendingTerminalErrors,
      );
      this.pendingTerminalErrorMutations += deltaMutations;
      this.inFlightTerminalErrorMutations = 0;
      this.terminalErrorsLastError = this.describeError(error);
    } finally {
      await releaseLock?.();
    }
  }

  async reconcileUsageSnapshot(): Promise<ProxyUsageStatsSnapshot> {
    if (!this.filePath) {
      return this.getUsageSnapshot();
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
      if (this.terminalErrorsFilePath) {
        try {
          const snapshot = await this.readTerminalErrorSnapshot();
          if (snapshot) {
            this.terminalErrors = mergeTerminalErrorJournals(
              snapshot.journal,
              this.pendingTerminalErrors,
            );
            this.terminalErrorsRevision = snapshot.revision;
            this.terminalErrorsLastFlushedAt = snapshot.updatedAt;
          }
          this.terminalErrorsLastError = undefined;
        } catch (error) {
          this.terminalErrorsLastError = this.describeError(error);
        }
      }
      this.snapshotVersion += 1;
      return this.getUsageSnapshot();
    });
  }

  async reconcile(): Promise<ProxyStats> {
    return (await this.reconcileUsageSnapshot()).stats;
  }

  resetMemory(): void {
    this.cancelFlushTimer();
    const startedAt = this.now();
    this.stats = emptyStats(startedAt);
    this.pending = emptyStats(startedAt);
    this.terminalErrors = emptyTerminalErrorJournal(startedAt);
    this.pendingTerminalErrors = emptyTerminalErrorJournal(startedAt);
    this.pendingMutations = 0;
    this.inFlightMutations = 0;
    this.pendingTerminalErrorMutations = 0;
    this.inFlightTerminalErrorMutations = 0;
    this.revision = 0;
    this.terminalErrorsRevision = 0;
    this.lastFlushedAt = undefined;
    this.lastReconciledAt = undefined;
    this.lastRecoveryAt = undefined;
    this.lastError = undefined;
    this.terminalErrorsLastFlushedAt = undefined;
    this.terminalErrorsLastRecoveryAt = undefined;
    this.terminalErrorsLastError = undefined;
    this.snapshotVersion = 0;
  }

  async resetForTests(): Promise<void> {
    await this.flushMutex.runExclusive(async () => {
      this.resetMemory();
      this.filePath = undefined;
      this.terminalErrorsFilePath = undefined;
    });
  }

  private markMutation(): void {
    this.pendingMutations += 1;
    this.snapshotVersion += 1;
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

  private applyTerminalError(
    target: ProxyTerminalErrorJournal,
    summary: ProxyTerminalErrorSummary,
  ): void {
    target.totalErrors += 1;
    target.counts[summary.category] += 1;
    target.recent.push(cloneTerminalErrorSummary(summary));
    if (target.recent.length > MAX_RECENT_TERMINAL_ERRORS) {
      target.recent.splice(
        0,
        target.recent.length - MAX_RECENT_TERMINAL_ERRORS,
      );
    }
  }

  private ensureAccount(
    target: ProxyStats,
    label: string,
    type: string,
  ): AccountStats {
    const identity = resolveStatsAccountIdentity(label, type);
    if (!target.accounts[identity.key]) {
      target.accounts[identity.key] = {
        key: identity.key,
        label: identity.label,
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
    return target.accounts[identity.key];
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

  private async readTerminalErrorSnapshot(): Promise<PersistedProxyTerminalErrorSnapshot | null> {
    if (!this.terminalErrorsFilePath) {
      return null;
    }
    let raw: string;
    try {
      raw = await readFile(this.terminalErrorsFilePath, "utf8");
    } catch (error) {
      if (isMissingFileError(error)) {
        return null;
      }
      throw error;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!validTerminalErrorSnapshot(parsed)) {
      throw new InvalidProxyStatsSnapshotError(
        `Invalid proxy terminal-error snapshot ${this.terminalErrorsFilePath}`,
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

  private applyTerminalErrorSnapshot(
    snapshot: PersistedProxyTerminalErrorSnapshot,
  ): void {
    this.terminalErrors = cloneTerminalErrorJournal(snapshot.journal);
    this.pendingTerminalErrors = emptyTerminalErrorJournal(this.now());
    this.terminalErrorsRevision = snapshot.revision;
    this.terminalErrorsLastFlushedAt = snapshot.updatedAt;
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

  private async recoverCorruptTerminalErrorSnapshot(): Promise<PersistedProxyTerminalErrorSnapshot | null> {
    if (!this.terminalErrorsFilePath) {
      return null;
    }
    const releaseLock = await acquireFileLock(
      `${this.terminalErrorsFilePath}.lock`,
      this.lockTimeoutMs,
      this.staleLockMs,
      this.now,
    );
    try {
      try {
        return await this.readTerminalErrorSnapshot();
      } catch (error) {
        if (!isCorruptSnapshotError(error)) {
          throw error;
        }
        await this.quarantineCorruptTerminalErrorSnapshot();
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
    await this.pruneCorruptSnapshots(this.filePath);
  }

  private async quarantineCorruptTerminalErrorSnapshot(): Promise<void> {
    if (!this.terminalErrorsFilePath) {
      return;
    }
    const recoveredAt = this.now();
    const quarantinePath = `${this.terminalErrorsFilePath}.corrupt.${recoveredAt}.${randomUUID()}`;
    try {
      await rename(this.terminalErrorsFilePath, quarantinePath);
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
      return;
    }
    this.terminalErrorsLastRecoveryAt = recoveredAt;
    this.terminalErrorsLastError = undefined;
    await this.pruneCorruptSnapshots(this.terminalErrorsFilePath);
  }

  private async pruneCorruptSnapshots(filePath: string): Promise<void> {
    const directory = dirname(filePath);
    const prefix = `${basename(filePath)}.corrupt.`;
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
  status: number,
  accountLabel?: string,
  accountType?: string,
  details?: ProxyTerminalErrorDetails,
): void {
  defaultStore.recordFinalError(status, accountLabel, accountType, details);
}

export function getStats(): ProxyStats {
  return defaultStore.getStats();
}

/** Return the process-local coherent snapshot without filesystem reconciliation. */
export function getUsageSnapshot(): ProxyUsageStatsSnapshot {
  return defaultStore.getUsageSnapshot();
}

export async function getReconciledStats(): Promise<ProxyStats> {
  return defaultStore.reconcile();
}

export async function getReconciledUsageSnapshot(): Promise<ProxyUsageStatsSnapshot> {
  return defaultStore.reconcileUsageSnapshot();
}

export function getAccountStats(
  label: string,
  type?: string,
): AccountStats | undefined {
  return defaultStore.getAccountStats(label, type);
}

export function getTerminalErrors(): ProxyTerminalErrorJournal {
  return defaultStore.getTerminalErrors();
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
