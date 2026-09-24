import type {
  ProxyAccountRoutingReason,
  ProxyAccountSortMetrics,
  ProxyPassthroughAccount,
} from "../types/index.js";

/**
 * The pre-existing "spend the soonest-expiring weekly allowance first" order.
 * Moved verbatim from claudeProxyRoutes.ts — availability → quota-evidence
 * quality → session saturation → model-scoped saturation → soonest weekly
 * reset → soonest session-reset bucket → model-scoped utilization → highest
 * weekly utilization → configured primary → insertion order.
 */
export function compareExpiryFirst(
  a: ProxyPassthroughAccount,
  b: ProxyPassthroughAccount,
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>,
  primaryKey: string | undefined,
): [number, ProxyAccountRoutingReason] {
  const ma = metricsByKey.get(a.key);
  const mb = metricsByKey.get(b.key);
  if (!ma || !mb) {
    return [0, "insertion_order"];
  }
  if (ma.usable !== mb.usable) {
    return [ma.usable ? -1 : 1, "availability"];
  }
  if (!ma.usable && !mb.usable) {
    const au = ma.coolingUntil || Number.POSITIVE_INFINITY;
    const bu = mb.coolingUntil || Number.POSITIVE_INFINITY;
    return [
      au === bu ? 0 : au - bu,
      au === bu ? "insertion_order" : "cooldown_recovery",
    ];
  }
  if (ma.quotaEvidenceRank !== mb.quotaEvidenceRank) {
    return [ma.quotaEvidenceRank - mb.quotaEvidenceRank, "quota_evidence"];
  }
  if (ma.saturated !== mb.saturated) {
    return [ma.saturated ? 1 : -1, "session_headroom"];
  }
  // Per-model headroom, after overall session capacity: an account whose cap
  // for THIS model is nearly spent is demoted even when its 5h/7d are healthy.
  // No-op when neither account reports a scoped window for the model.
  if (ma.scopedSaturated !== mb.scopedSaturated) {
    return [ma.scopedSaturated ? 1 : -1, "scoped_headroom"];
  }
  if (ma.saturated && mb.saturated) {
    if (ma.sessionResetBucket !== mb.sessionResetBucket) {
      return [ma.sessionResetBucket - mb.sessionResetBucket, "session_reset"];
    }
    if (ma.weeklyReset !== mb.weeklyReset) {
      return [ma.weeklyReset - mb.weeklyReset, "weekly_reset"];
    }
  } else {
    if (ma.weeklyReset !== mb.weeklyReset) {
      return [ma.weeklyReset - mb.weeklyReset, "weekly_reset"];
    }
    if (ma.sessionResetBucket !== mb.sessionResetBucket) {
      return [ma.sessionResetBucket - mb.sessionResetBucket, "session_reset"];
    }
  }
  // Fill-first within the per-model allowance: finish off the account closest
  // to spending its cap for this model before opening a fresher one. Ranked
  // above overall weekly utilization because it is the tighter constraint.
  // Both sides must actually report a scoped window. Comparing a real
  // utilization against the "absent" sentinel would rank the account that has a
  // window above one that does not — and since only the account serving a model
  // gets that model's window, it would funnel all of a model's traffic onto
  // whichever account happened to serve it first.
  if (
    ma.scopedUsed !== null &&
    mb.scopedUsed !== null &&
    ma.scopedUsedForSort !== mb.scopedUsedForSort
  ) {
    return [mb.scopedUsedForSort - ma.scopedUsedForSort, "scoped_utilization"];
  }
  if (ma.weeklyUsedForSort !== mb.weeklyUsedForSort) {
    return [mb.weeklyUsedForSort - ma.weeklyUsedForSort, "weekly_utilization"];
  }
  if (primaryKey && (a.key === primaryKey) !== (b.key === primaryKey)) {
    return [a.key === primaryKey ? -1 : 1, "configured_primary"];
  }
  return [0, "insertion_order"];
}

/**
 * Orders accounts by the configured ranking and reports the reason that
 * placed rank 0. PR1 ships only `expiry-first`; PR2 (Task 11) adds
 * `headroom-first` plus the affinity/prefer-primary precedence layer.
 */
export function rankAccounts(args: {
  accounts: ProxyPassthroughAccount[];
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>;
  primaryKey: string | undefined;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  reason: ProxyAccountRoutingReason;
} {
  const { accounts, metricsByKey, primaryKey } = args;
  const orderedAccounts = [...accounts].sort(
    (a, b) => compareExpiryFirst(a, b, metricsByKey, primaryKey)[0],
  );
  const reason: ProxyAccountRoutingReason =
    orderedAccounts.length < 2
      ? "single_account"
      : compareExpiryFirst(
          orderedAccounts[0],
          orderedAccounts[1],
          metricsByKey,
          primaryKey,
        )[1];
  return { orderedAccounts, reason };
}
