import type {
  AccountUsageFetchResult,
  ProxyPassthroughAccount,
  ProxyQuotaRefreshRunResult,
  ProxyQuotaRefreshMetrics,
  ProxyQuotaRefreshRuntimeState,
} from "../types/index.js";

const FAILURE_BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000] as const;
const MAX_FAILURE_BACKOFF_MS = 30 * 60_000;

export class AccountQuotaRefreshCoordinator {
  private readonly inFlight = new Map<
    string,
    Promise<ProxyQuotaRefreshRunResult>
  >();
  private readonly states = new Map<string, ProxyQuotaRefreshRuntimeState>();
  private metrics: ProxyQuotaRefreshMetrics = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    coalesced: 0,
    backoffSuppressed: 0,
    triggerDeduplicated: 0,
  };

  getState(accountKey: string): ProxyQuotaRefreshRuntimeState {
    const state = this.states.get(accountKey);
    return state
      ? { ...state, inFlight: this.inFlight.has(accountKey) }
      : { inFlight: false, consecutiveFailures: 0, coalesced: 0 };
  }

  /**
   * Run one refresh per account. `trigger` must identify the quota window or
   * handoff condition so repeated requests deduplicate without hiding a later
   * reset window.
   */
  run(
    account: ProxyPassthroughAccount,
    trigger: string,
    fetcher: (
      candidate: ProxyPassthroughAccount,
    ) => Promise<AccountUsageFetchResult>,
    options: { force?: boolean; now?: number } = {},
  ): Promise<ProxyQuotaRefreshRunResult> {
    const existing = this.inFlight.get(account.key);
    if (existing) {
      const state = this.getOrCreateState(account.key);
      state.coalesced += 1;
      this.metrics.coalesced += 1;
      return existing;
    }

    const now = options.now ?? Date.now();
    const state = this.getOrCreateState(account.key);
    if (!options.force && state.lastCompletedTrigger === trigger) {
      this.metrics.triggerDeduplicated += 1;
      return Promise.resolve({ kind: "not_due" });
    }
    if (!options.force && now < (state.nextEligibleAt ?? 0)) {
      this.metrics.backoffSuppressed += 1;
      return Promise.resolve({
        kind: "backoff",
        nextEligibleAt: state.nextEligibleAt ?? now,
      });
    }

    state.lastAttemptAt = now;
    this.metrics.attempted += 1;
    const task = fetcher(account)
      .catch(
        (error: unknown): AccountUsageFetchResult => ({
          ok: false,
          reason: "network",
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      .then((result): ProxyQuotaRefreshRunResult => {
        const completedAt = options.now ?? Date.now();
        if (result.ok === false) {
          this.metrics.failed += 1;
          state.consecutiveFailures += 1;
          state.lastFailureReason = result.reason;
          const backoffBase =
            FAILURE_BACKOFF_MS[Math.max(0, state.consecutiveFailures - 1)] ??
            MAX_FAILURE_BACKOFF_MS;
          const jitter = 0.9 + Math.random() * 0.2;
          state.nextEligibleAt = completedAt + Math.round(backoffBase * jitter);
        } else {
          this.metrics.succeeded += 1;
          state.lastSuccessAt = completedAt;
          state.nextEligibleAt = undefined;
          state.consecutiveFailures = 0;
          state.lastFailureReason = undefined;
          state.lastCompletedTrigger = trigger;
        }
        return { kind: "completed", result, startedAt: now };
      })
      .finally(() => {
        this.inFlight.delete(account.key);
      });
    this.inFlight.set(account.key, task);
    return task;
  }

  clear(): void {
    this.inFlight.clear();
    this.states.clear();
    this.metrics = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      coalesced: 0,
      backoffSuppressed: 0,
      triggerDeduplicated: 0,
    };
  }

  getMetrics(): ProxyQuotaRefreshMetrics {
    return { ...this.metrics };
  }

  private getOrCreateState(accountKey: string): ProxyQuotaRefreshRuntimeState {
    let state = this.states.get(accountKey);
    if (!state) {
      state = { inFlight: false, consecutiveFailures: 0, coalesced: 0 };
      this.states.set(accountKey, state);
    }
    return state;
  }
}
