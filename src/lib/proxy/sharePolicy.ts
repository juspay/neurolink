/**
 * Peer-sharing admission policy.
 *
 * Pure evaluation, no I/O — every input is passed in, so this module is cheap on
 * the hot path and directly exercisable from a test.
 *
 * The gate set is deliberately **orthogonal and AND-ed**: a grant may carry a
 * headroom floor *and* a window-slice ceiling *and* a model allowlist, and each
 * is checked independently. The effective allowance is therefore the minimum
 * across whatever is configured, which is what lets "share only what I am not
 * using, and never more than a fifth of it" be one grant rather than two
 * competing modes.
 *
 * Evaluation splits in two, because the two halves answer different questions:
 *
 * - `evaluateShareAdmission` — request-level. Is this borrower allowed to ask at
 *   all, right now, for this model?
 * - `filterAccountsForGrant` — account-level. Of the lender's accounts, which
 *   may serve this borrower? Headroom and slice ceilings live here because they
 *   are properties of an individual account's windows, not of the request.
 *
 * @module proxy/sharePolicy
 */

import type {
  ProxyShareAccountExclusion,
  ProxyShareAccountFilterResult,
  ProxyShareAccountView,
  ProxyShareAdmission,
  ProxyShareAdmissionInput,
  ProxyShareGates,
  ProxyShareGrant,
  ProxyShareRefusalReason,
  ProxyShareRefusedAdmission,
  ProxySharePoolUsage,
  ProxyShareWindowSlice,
} from "../types/index.js";

const HOUR_MS = 3_600_000;

/** Human-facing text for a refusal. Kept terse — it reaches the borrower. */
const REFUSAL_MESSAGES: Record<ProxyShareRefusalReason, string> = {
  missing_token: "No share token was presented.",
  unknown_token: "Share token is not recognized.",
  malformed_token: "Share token is malformed.",
  paused: "The lender has paused this share.",
  revoked: "This share has been revoked.",
  expired: "This share has expired.",
  out_of_window: "This share is outside its allowed hours.",
  model_not_allowed: "This share does not cover the requested model.",
  exhausted: "This share has no credit remaining.",
  rate_limited: "This share's request rate limit was exceeded.",
  concurrency_limited: "This share's concurrent request limit was reached.",
  reserve_floor: "The lender's reserved headroom is in force.",
  spillover_inactive:
    "This share serves only the lender's spare capacity, and none is spare yet.",
  slice_exhausted: "This share has used its allotted portion of the window.",
  no_capacity: "No lender account can currently serve this share.",
};

/**
 * Narrow an admission to its refusing half.
 *
 * A plain `!admission.admitted` check would do this under `strict`, but one of
 * the package's build steps compiles without `strictNullChecks`, where TypeScript
 * declines to narrow a boolean discriminant at all. An explicit predicate holds
 * in both modes.
 */
export function isShareRefusal(
  admission: ProxyShareAdmission,
): admission is ProxyShareRefusedAdmission {
  return !admission.admitted;
}

export function shareRefusalMessage(reason: ProxyShareRefusalReason): string {
  return REFUSAL_MESSAGES[reason];
}

/** HTTP status for a refusal. 401 is "who are you", 403 is "not you, not ever
 *  under this grant", 429 is "not now" — the borrower retries only the last. */
export function shareRefusalStatus(reason: ProxyShareRefusalReason): number {
  switch (reason) {
    case "missing_token":
    case "unknown_token":
    case "malformed_token":
      return 401;
    case "paused":
    case "revoked":
    case "expired":
    case "out_of_window":
    case "model_not_allowed":
      return 403;
    default:
      return 429;
  }
}

function refuse(
  reason: ProxyShareRefusalReason,
  options: { grant?: ProxyShareGrant; retryAfterSeconds?: number } = {},
): ProxyShareAdmission {
  return {
    admitted: false,
    status: shareRefusalStatus(reason),
    reason,
    message: REFUSAL_MESSAGES[reason],
    ...(options.retryAfterSeconds !== undefined
      ? { retryAfterSeconds: options.retryAfterSeconds }
      : {}),
    ...(options.grant ? { grant: options.grant } : {}),
  };
}

/**
 * Is `now` inside the grant's allowed hours?
 *
 * A window whose start hour is greater than its end hour wraps midnight
 * (`21 → 9` means the night shift), which is the common case for lending
 * capacity you are asleep through.
 */
export function isWithinSchedule(
  schedule: { fromHour: number; toHour: number },
  now: number,
): boolean {
  const hour = new Date(now).getHours();
  const { fromHour, toHour } = schedule;
  if (fromHour === toHour) {
    return true;
  }
  return fromHour < toHour
    ? hour >= fromHour && hour < toHour
    : hour >= fromHour || hour < toHour;
}

/** Seconds until the schedule next opens, for an honest `Retry-After`. */
function secondsUntilScheduleOpens(
  schedule: { fromHour: number; toHour: number },
  now: number,
): number {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  for (let ahead = 1; ahead <= 24; ahead += 1) {
    next.setHours(next.getHours() + 1);
    if (isWithinSchedule(schedule, next.getTime())) {
      return Math.max(1, Math.round((next.getTime() - now) / 1000));
    }
  }
  return 3600;
}

/**
 * Does the requested model fall inside the allowlist?
 *
 * Entries are matched as case-insensitive substrings so a grant can name a tier
 * (`sonnet`) rather than having to track every dated model id.
 */
export function isModelAllowed(
  models: string[] | undefined,
  model: string | undefined,
): boolean {
  if (!models || models.length === 0) {
    return true;
  }
  if (!model) {
    return false;
  }
  const normalized = model.toLowerCase();
  return models.some((entry) => normalized.includes(entry.toLowerCase()));
}

/**
 * Request-level admission.
 *
 * Order matters: identity and lifecycle first (they are permanent refusals),
 * then scope, then the transient limits that carry a `Retry-After`. A borrower
 * that is told "paused" must not also be told "slow down".
 */
export function evaluateShareAdmission(
  input: ProxyShareAdmissionInput,
): ProxyShareAdmission {
  const { grant, now, model, counters, coinBalance } = input;

  if (grant.state !== "active") {
    const reason: ProxyShareRefusalReason =
      grant.state === "paused"
        ? "paused"
        : grant.state === "revoked"
          ? "revoked"
          : "expired";
    return refuse(reason, { grant });
  }

  if (grant.gates.notAfter !== undefined && grant.gates.notAfter <= now) {
    return refuse("expired", { grant });
  }

  if (grant.gates.schedule && !isWithinSchedule(grant.gates.schedule, now)) {
    return refuse("out_of_window", {
      grant,
      retryAfterSeconds: secondsUntilScheduleOpens(grant.gates.schedule, now),
    });
  }

  if (!isModelAllowed(grant.gates.models, model)) {
    return refuse("model_not_allowed", { grant });
  }

  const rate = grant.gates.rate;
  if (
    rate?.concurrency !== undefined &&
    counters.inFlight >= rate.concurrency
  ) {
    return refuse("concurrency_limited", { grant, retryAfterSeconds: 1 });
  }
  if (
    rate?.perMinute !== undefined &&
    counters.requestsInLastMinute >= rate.perMinute
  ) {
    return refuse("rate_limited", { grant, retryAfterSeconds: 60 });
  }

  if (
    grant.entitlement.ledger === "coins" &&
    (coinBalance ?? grant.entitlement.coins ?? 0) <= 0
  ) {
    return refuse("exhausted", { grant });
  }

  return { admitted: true, grant };
}

/** The slice ceiling in force, taking spillover's own ceiling into account. */
function effectiveSlicePct(
  base: ProxyShareWindowSlice | undefined,
  spilloverCap: number | undefined,
): { session: number | undefined; weekly: number | undefined } {
  const tighten = (configured: number | undefined): number | undefined => {
    if (configured === undefined) {
      return spilloverCap;
    }
    if (spilloverCap === undefined) {
      return configured;
    }
    return Math.min(configured, spilloverCap);
  };
  return {
    session: tighten(base?.session5hPct),
    weekly: tighten(base?.weekly7dPct),
  };
}

/**
 * Is the account inside its spillover window — close enough to a reset, with
 * little enough consumed, that the remaining capacity would otherwise expire?
 *
 * Unknown reset times fail closed. A spillover grant is a promise about capacity
 * that is *about to be lost*; without a reset time there is no such promise to
 * keep, and guessing would hand out capacity the lender still intends to use.
 */
export function isSpilloverActive(
  gates: ProxyShareGates,
  account: ProxyShareAccountView,
  now: number,
): boolean {
  const spillover = gates.spillover;
  if (!spillover) {
    return false;
  }
  const windowMs = spillover.beforeResetHours * HOUR_MS;
  const threshold = spillover.whenUtilizationBelowPct / 100;

  const nearWeekly =
    account.weeklyResetAt !== null &&
    account.weeklyResetAt - now <= windowMs &&
    account.weeklyResetAt > now &&
    account.weeklyUsed !== null &&
    account.weeklyUsed < threshold;

  const nearSession =
    account.sessionResetAt !== null &&
    account.sessionResetAt - now <= windowMs &&
    account.sessionResetAt > now &&
    account.sessionUsed !== null &&
    account.sessionUsed < threshold;

  return nearWeekly || nearSession;
}

/**
 * Split the pool into the accounts this grant may draw on and the rest.
 *
 * An entry in `gates.accounts` matches either the full store key
 * (`anthropic:alice`) or the bare label (`alice`), because operators think in
 * labels and the routing path thinks in keys.
 *
 * Exported because the scope decides more than admission: it is also the
 * denominator of the pool-wide slice, and computing that over accounts the grant
 * can never touch would loosen the ceiling in proportion to how many there are.
 */
export function accountsInGrantScope(
  gates: ProxyShareGates,
  accounts: readonly ProxyShareAccountView[],
): {
  inScope: ProxyShareAccountView[];
  outOfScope: ProxyShareAccountView[];
} {
  if (!gates.accounts || gates.accounts.length === 0) {
    return { inScope: [...accounts], outOfScope: [] };
  }
  const allowedKeys = new Set(
    gates.accounts.map((entry) => entry.trim().toLowerCase()),
  );
  const inScope: ProxyShareAccountView[] = [];
  const outOfScope: ProxyShareAccountView[] = [];
  for (const account of accounts) {
    const key = account.accountKey.toLowerCase();
    const label = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
    if (allowedKeys.has(key) || allowedKeys.has(label)) {
      inScope.push(account);
    } else {
      outOfScope.push(account);
    }
  }
  return { inScope, outOfScope };
}

/**
 * Decide which of the lender's accounts this grant may draw on.
 *
 * Returning exclusions alongside the survivors is deliberate: when nothing
 * survives, the caller needs to say *why* — "your slice is spent" and "I am
 * holding back my reserve" are different answers, and only one of them will
 * change on its own.
 */
export function filterAccountsForGrant(
  grant: ProxyShareGrant,
  accounts: readonly ProxyShareAccountView[],
  now: number,
  /**
   * Required, not optional. `gates.maxSlice` is a ceiling on what this grant
   * has already drawn from the pool, and with nothing to compare against the
   * only available answer is "not yet" — so an omitted argument would not relax
   * the ceiling, it would remove it. `readSharePoolWindowUsage` returns zeroed
   * fractions for a grant with no history, which is the honest empty value.
   */
  poolUsage: ProxySharePoolUsage,
): ProxyShareAccountFilterResult {
  const gates = grant.gates;

  // Scope first. "The pool" a slice ceiling divides is the set of accounts this
  // grant may draw on at all — not every credential the node happens to hold.
  // Counting the others would inflate the denominator and loosen the ceiling by
  // exactly the ratio between the two sets.
  const { inScope, outOfScope } = accountsInGrantScope(gates, accounts);

  // The pool ceiling is one decision about the whole pool, so it is settled
  // before any account is considered. Spillover's tighter cap applies as soon
  // as any in-scope account is spilling — the borrower is drawing on pooled
  // capacity, not on one credential's clock.
  const anySpillover = inScope.some((account) =>
    isSpilloverActive(gates, account, now),
  );
  const poolSlice = effectiveSlicePct(
    gates.maxSlice,
    anySpillover ? gates.spillover?.maxSlicePct : undefined,
  );
  const poolSpent =
    (poolSlice.session !== undefined &&
      poolUsage.sessionFraction * 100 >= poolSlice.session) ||
    (poolSlice.weekly !== undefined &&
      poolUsage.weeklyFraction * 100 >= poolSlice.weekly);
  if (poolSpent) {
    // Refused everywhere, including on idle accounts. That is what a pool
    // ceiling means: the borrower has had its share of the whole.
    return {
      allowed: [],
      excluded: [
        ...inScope.map((account) => ({
          accountKey: account.accountKey,
          reason: "slice_exhausted" as const,
        })),
        ...outOfScope.map((account) => ({
          accountKey: account.accountKey,
          reason: "no_capacity" as const,
        })),
      ],
    };
  }

  const allowed: string[] = [];
  const excluded: ProxyShareAccountExclusion[] = outOfScope.map((account) => ({
    accountKey: account.accountKey,
    reason: "no_capacity" as const,
  }));

  for (const account of inScope) {
    const spilloverActive = isSpilloverActive(gates, account, now);
    if (gates.spillover && !spilloverActive) {
      // Not `reserve_floor`: no headroom is being held back, the lender simply
      // has not used enough of this account for its spare capacity to exist
      // yet. Both are transient, but they clear on opposite movements and the
      // borrower is told which one it is waiting on.
      excluded.push({
        accountKey: account.accountKey,
        reason: "spillover_inactive",
      });
      continue;
    }

    const floor = gates.reserveFloor;
    if (floor) {
      const sessionBlocked =
        floor.session5hPct !== undefined &&
        account.sessionUsed !== null &&
        account.sessionUsed * 100 > 100 - floor.session5hPct;
      const weeklyBlocked =
        floor.weekly7dPct !== undefined &&
        account.weeklyUsed !== null &&
        account.weeklyUsed * 100 > 100 - floor.weekly7dPct;
      if (sessionBlocked || weeklyBlocked) {
        excluded.push({
          accountKey: account.accountKey,
          reason: "reserve_floor",
        });
        continue;
      }
    }

    // Per-account ceiling, opt-in and independent of the pool one above.
    const slice = effectiveSlicePct(
      gates.maxSlicePerAccount,
      spilloverActive ? gates.spillover?.maxSlicePct : undefined,
    );
    const sessionSliceSpent =
      slice.session !== undefined &&
      account.borrowedSessionFraction * 100 >= slice.session;
    const weeklySliceSpent =
      slice.weekly !== undefined &&
      account.borrowedWeeklyFraction * 100 >= slice.weekly;
    if (sessionSliceSpent || weeklySliceSpent) {
      excluded.push({
        accountKey: account.accountKey,
        reason: "slice_exhausted",
      });
      continue;
    }

    allowed.push(account.accountKey);
  }

  return { allowed, excluded };
}

/**
 * Collapse per-account exclusions into the single reason the borrower is told
 * when nothing survived. A transient cause outranks a structural one so the
 * borrower learns whether waiting is worth anything.
 */
export function summarizeAccountExclusions(
  excluded: readonly ProxyShareAccountExclusion[],
): ProxyShareRefusalReason {
  if (excluded.some((entry) => entry.reason === "reserve_floor")) {
    return "reserve_floor";
  }
  if (excluded.some((entry) => entry.reason === "spillover_inactive")) {
    return "spillover_inactive";
  }
  if (excluded.some((entry) => entry.reason === "slice_exhausted")) {
    return "slice_exhausted";
  }
  return "no_capacity";
}
