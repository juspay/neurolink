import type {
  ProxyAccountPrecedenceReason,
  ProxyAccountRankingPolicy,
  ProxyAccountRoutingReason,
  ProxyAccountSortMetrics,
  ProxyAccountSpillMove,
  ProxyAffinityPrecedenceSkipReason,
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

function headroomFor(m: ProxyAccountSortMetrics): number | null {
  if (m.sessionUsed === null || m.weeklyUsed === null) {
    return null;
  }
  return Math.min(1 - m.sessionUsed, 1 - m.weeklyUsed);
}

/**
 * Availability → quota-evidence quality → session saturation → model-scoped
 * saturation → highest headroom (min(1 - sessionUsed, 1 - weeklyUsed), reset-
 * freshened via the same accountSortMetrics values compareExpiryFirst uses)
 * → soonest weekly reset → configured primary → insertion order. An account
 * whose headroom cannot be computed sorts after every account whose can.
 */
export function compareHeadroomFirst(
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
  if (ma.scopedSaturated !== mb.scopedSaturated) {
    return [ma.scopedSaturated ? 1 : -1, "scoped_headroom"];
  }
  const ha = headroomFor(ma);
  const hb = headroomFor(mb);
  if (ha !== hb) {
    if (ha === null) {
      return [1, "headroom"];
    }
    if (hb === null) {
      return [-1, "headroom"];
    }
    return [hb - ha, "headroom"];
  }
  if (ma.weeklyReset !== mb.weeklyReset) {
    return [ma.weeklyReset - mb.weeklyReset, "weekly_reset"];
  }
  if (primaryKey && (a.key === primaryKey) !== (b.key === primaryKey)) {
    return [a.key === primaryKey ? -1 : 1, "configured_primary"];
  }
  return [0, "insertion_order"];
}

/**
 * Whether an account may hold a session binding or take the primary's place:
 * usable and not session-saturated.
 */
export function isPrecedenceEligible(
  metrics: ProxyAccountSortMetrics | undefined,
): boolean {
  return !!metrics && metrics.usable && !metrics.saturated;
}

/**
 * Applies the precedence order a fill-first request tries: (1) the bound
 * (session-affinity) account, (2) the configured primary, (3) the rest in
 * ranking order. Shared by rankAccounts (for the quota-ordered path) and the
 * route directly (for quota-off fill-first, where the base order is never
 * comparator-sorted but affinity/prefer-primary must still apply per spec).
 * `strategy: round-robin` ignores all five policy keys and never calls this.
 *
 * When affinity applies and prefer-primary is also on, and the configured
 * primary is itself eligible (usable, not session-saturated) and is not the
 * bound account, the primary is placed second — [bound, primary, ...rest] —
 * so a request that cannot use its bound account's session still prefers
 * the primary over the rest of the ranking. The reported reason stays
 * "session_affinity" since the bound account still won rank 0.
 */
export function applyAffinityAndPrimary(args: {
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>;
  affinityKey?: string;
  primaryKey?: string;
  preferPrimary?: boolean;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  reason: ProxyAccountPrecedenceReason | null;
  affinitySkippedReason: ProxyAffinityPrecedenceSkipReason | null;
} {
  const {
    orderedAccounts,
    metricsByKey,
    affinityKey,
    primaryKey,
    preferPrimary = false,
  } = args;
  const isEligible = (key: string): boolean =>
    isPrecedenceEligible(metricsByKey.get(key));

  let affinitySkippedReason: ProxyAffinityPrecedenceSkipReason | null = null;
  if (affinityKey) {
    const bound = orderedAccounts.find((a) => a.key === affinityKey);
    if (bound && isEligible(affinityKey)) {
      const primaryGoesSecond =
        preferPrimary &&
        !!primaryKey &&
        primaryKey !== affinityKey &&
        isEligible(primaryKey);
      const primary = primaryGoesSecond
        ? orderedAccounts.find((a) => a.key === primaryKey)
        : undefined;
      const remainder = orderedAccounts.filter(
        (a) => a.key !== affinityKey && a.key !== primary?.key,
      );
      return {
        orderedAccounts: primary
          ? [bound, primary, ...remainder]
          : [bound, ...remainder],
        reason: "session_affinity",
        affinitySkippedReason: null,
      };
    }
    const boundMetrics = metricsByKey.get(affinityKey);
    affinitySkippedReason =
      !bound || !boundMetrics?.usable ? "unusable" : "session_saturated";
  }

  if (preferPrimary && primaryKey) {
    const primary = orderedAccounts.find((a) => a.key === primaryKey);
    if (primary && isEligible(primaryKey)) {
      return {
        orderedAccounts: [
          primary,
          ...orderedAccounts.filter((a) => a.key !== primaryKey),
        ],
        reason: "preferred_primary",
        affinitySkippedReason,
      };
    }
  }

  return { orderedAccounts, reason: null, affinitySkippedReason };
}

/**
 * Orders accounts by the configured ranking (`expiry-first` or
 * `headroom-first`), applies the affinity/prefer-primary precedence, and
 * reports the reason that placed rank 0.
 */
export function rankAccounts(args: {
  accounts: ProxyPassthroughAccount[];
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>;
  primaryKey: string | undefined;
  ranking?: ProxyAccountRankingPolicy;
  affinityKey?: string;
  preferPrimary?: boolean;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  reason: ProxyAccountRoutingReason;
  affinitySkippedReason: ProxyAffinityPrecedenceSkipReason | null;
} {
  const {
    accounts,
    metricsByKey,
    primaryKey,
    ranking = "expiry-first",
    affinityKey,
    preferPrimary,
  } = args;
  const compare =
    ranking === "headroom-first" ? compareHeadroomFirst : compareExpiryFirst;
  const baseOrder = [...accounts].sort(
    (a, b) => compare(a, b, metricsByKey, primaryKey)[0],
  );
  const precedence = applyAffinityAndPrimary({
    orderedAccounts: baseOrder,
    metricsByKey,
    affinityKey,
    primaryKey,
    preferPrimary,
  });
  if (precedence.reason) {
    return {
      orderedAccounts: precedence.orderedAccounts,
      reason: precedence.reason,
      affinitySkippedReason: precedence.affinitySkippedReason,
    };
  }
  const reason: ProxyAccountRoutingReason =
    baseOrder.length < 2
      ? "single_account"
      : compare(baseOrder[0], baseOrder[1], metricsByKey, primaryKey)[1];
  return {
    orderedAccounts: baseOrder,
    reason,
    affinitySkippedReason: precedence.affinitySkippedReason,
  };
}

/**
 * For a request without an active binding: if the current first choice is
 * already at spillInflight in-flight requests, try the next account below
 * that threshold that is usable and not session-saturated — the same
 * eligibility as every precedence step. An account with no metrics, an
 * unusable one or a saturated one is never a spill target even if its
 * in-flight count is low. If there is no eligible account under the
 * threshold, spill does nothing. `spill.inflight` records the SOURCE
 * account's count — the number that triggered the move, not the
 * destination's.
 */
export function applySpill(args: {
  orderedAccounts: ProxyPassthroughAccount[];
  inflightByKey: ReadonlyMap<string, number>;
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>;
  spillInflight: number;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  spill: ProxyAccountSpillMove | null;
} {
  const { orderedAccounts, inflightByKey, metricsByKey, spillInflight } = args;
  const first = orderedAccounts[0];
  if (spillInflight <= 0 || !first) {
    return { orderedAccounts, spill: null };
  }
  const firstInflight = inflightByKey.get(first.key) ?? 0;
  if (firstInflight < spillInflight) {
    return { orderedAccounts, spill: null };
  }
  const rest = orderedAccounts.slice(1);
  const targetIndex = rest.findIndex(
    (account) =>
      isPrecedenceEligible(metricsByKey.get(account.key)) &&
      (inflightByKey.get(account.key) ?? 0) < spillInflight,
  );
  if (targetIndex === -1) {
    return { orderedAccounts, spill: null };
  }
  const target = rest[targetIndex];
  const reordered = [
    target,
    first,
    ...rest.slice(0, targetIndex),
    ...rest.slice(targetIndex + 1),
  ];
  return {
    orderedAccounts: reordered,
    spill: { from: first.key, to: target.key, inflight: firstInflight },
  };
}
