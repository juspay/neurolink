/**
 * Proxy Usage Statistics
 * Tracks per-account request counts, token usage, and error rates.
 * In-memory only — resets on proxy restart.
 */

import type { AccountStats, ProxyStats } from "../types/index.js";

const stats: ProxyStats = {
  startedAt: Date.now(),
  totalAttempts: 0,
  totalRequests: 0,
  totalSuccess: 0,
  totalErrors: 0,
  totalRateLimits: 0,
  accounts: {},
};

export function recordAttempt(accountLabel: string, accountType: string): void {
  stats.totalAttempts++;
  const acct = ensureAccount(accountLabel, accountType);
  acct.attemptCount++;
  acct.lastAttemptAt = Date.now();
}

export function recordFinalSuccess(
  accountLabel?: string,
  accountType?: string,
): void {
  stats.totalRequests++;
  stats.totalSuccess++;
  if (accountLabel && accountType) {
    const acct = ensureAccount(accountLabel, accountType);
    acct.successCount++;
    acct.currentBackoffLevel = 0;
  }
}

export function recordAttemptError(
  accountLabel: string,
  accountType: string,
  status: number,
): void {
  const acct = ensureAccount(accountLabel, accountType);
  acct.errorCount++;
  acct.lastErrorAt = Date.now();
  if (status === 429) {
    stats.totalRateLimits++;
    acct.rateLimitCount++;
  }
}

export function recordFinalError(
  _status: number,
  accountLabel?: string,
  accountType?: string,
): void {
  stats.totalRequests++;
  stats.totalErrors++;
  if (accountLabel && accountType) {
    const acct = ensureAccount(accountLabel, accountType);
    acct.errorCount++;
    acct.lastErrorAt = Date.now();
  }
}

export function recordCooldown(
  accountLabel: string,
  accountType: string,
  cooldownUntil: number,
  backoffLevel: number,
): void {
  const acct = ensureAccount(accountLabel, accountType);
  acct.coolingUntil = cooldownUntil;
  acct.currentBackoffLevel = backoffLevel;
}

export function getStats(): ProxyStats {
  const accounts: Record<string, AccountStats> = {};
  for (const [label, account] of Object.entries(stats.accounts)) {
    accounts[label] = { ...account };
  }
  return { ...stats, accounts };
}

export function getAccountStats(label: string): AccountStats | undefined {
  const account = stats.accounts[label];
  return account ? { ...account } : undefined;
}

export function resetStats(): void {
  stats.startedAt = Date.now();
  stats.totalAttempts = 0;
  stats.totalRequests = 0;
  stats.totalSuccess = 0;
  stats.totalErrors = 0;
  stats.totalRateLimits = 0;
  stats.accounts = {};
}

function ensureAccount(label: string, type: string): AccountStats {
  if (!stats.accounts[label]) {
    stats.accounts[label] = {
      label,
      type,
      attemptCount: 0,
      successCount: 0,
      errorCount: 0,
      rateLimitCount: 0,
      lastAttemptAt: 0,
      currentBackoffLevel: 0,
    };
  }
  return stats.accounts[label];
}
