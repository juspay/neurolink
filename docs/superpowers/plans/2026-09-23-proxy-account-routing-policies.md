# Proxy Account Routing Policies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an operator configure how the Claude proxy orders usable Anthropic OAuth accounts — headroom-first ranking, prefer-primary, session affinity, and spill-under-load — while the default configuration stays byte-for-byte identical to today's `expiry-first` comparator.

**Architecture:** Extract the existing account comparator into a new pure module (`accountRanking.ts`) with zero behaviour change (PR1), then build the four policy features on top of that extraction as additive, individually-gated logic wired through the existing quota-ordering call chain in `claudeProxyRoutes.ts` (PR2). A second new pure module (`sessionAffinity.ts`) tracks session→account bindings in a process-local, LRU-capped map. Every policy value rides the existing hot-reloadable runtime config snapshot; nothing adds a new config-loading mechanism.

**Tech Stack:** TypeScript (strict), Node.js, `tsx` test runner, Hono-style route handlers, existing `ProxyRuntimeConfigStore` snapshot/reload machinery, `pnpm` workspaces.

**Spec:** `docs/superpowers/specs/2026-09-23-proxy-account-routing-policies-design.md`

> **Grounding:** This plan's line citations are verified against `origin/release` at `49c00040c` (full sha `49c00040cc89211edf4e7e95a3e5036e24b69562`). Execution must start by rebasing the branch onto the current `origin/release` tip and re-verifying every citation by name/content search (`git grep`, anchor-text lookup) — never by assuming the offsets below still hold arithmetically. `origin/release` moves; the anchors (function names, unique literals, doc-comment text) do not.

## Global Constraints

- Default behaviour must stay byte-for-byte identical after both PRs merge (spec Goal).
- `strategy: round-robin` ignores all five `routing.*` policy keys (spec Configuration).
- `NEUROLINK_PROXY_QUOTA_ROUTING=off` disables quota-based ranking as today; `session-affinity` and `prefer-primary` still apply (spec Configuration).
- `account-ranking`: `expiry-first` \| `headroom-first`, default `expiry-first` (spec Configuration table).
- `prefer-primary`: boolean, default `false` (spec Configuration table).
- `session-affinity`: boolean, default `false` (spec Configuration table).
- `session-affinity-idle-ttl-ms`: integer, 60000–86400000, default `3600000` (spec Configuration table).
- `spill-inflight`: integer, 0–100, default `0` (off) (spec Configuration table).
- All five keys accept kebab-case or camelCase, are validated at load, and hot-reload with the runtime config snapshot; an invalid value rejects the whole load and the last known-good snapshot stays active (spec Configuration intro).
- Session id comes from the existing `parseClaudeCodeUserId(parsed.metadata?.user_id)` path, not a new identity source (spec Component 2).
- Only Anthropic accounts are ever bound; a Codex or Vertex fallback response never rebinds a session; spill counts only Anthropic accounts (spec Edge cases).
- Types: `type` aliases only (never `interface`), `Proxy` domain prefix, barrel-only imports from `../types/index.js`, no type re-exports outside `src/lib/types/` (CLAUDE.md rules 2, 7–13; spec Component 4).
- Tests are end-to-end only, except the documented determinism exception in `test/continuous-test-suite-proxy.ts`, which the new hooks extend and nothing wider (CLAUDE.md rule 15; spec Testing).
- Assertion messages never quote payloads — mismatches are described, not dumped (CLAUDE.md "Keep payloads out of assertion messages"; spec Testing).
- Delivery is exactly two PRs; juspay/neurolink's `single-commit-enforcement.yml` requires one commit per PR (spec Delivery).
- `/status` must report the active policy and the number of bound sessions (spec Observability).
- `routingDecision`'s schema version stays `1`; new fields are additive only (spec Observability).

## Review Focus

- **Quota routing disabled, policies still on.** `NEUROLINK_PROXY_QUOTA_ROUTING=off` with `session-affinity: true` or `prefer-primary: true` must still bind/prefer — a naive implementation that only wires policies inside the quota-ordered branch would silently drop this. Covered by Task 14's dedicated non-quota-ordered precedence step and its test.
- **Idle-TTL boundary.** An operator setting `session-affinity-idle-ttl-ms` expects the binding to survive exactly up to that many milliseconds and expire the instant it's exceeded, not one request early or late. Covered by Task 10's exact-boundary test (`now - lastServedAt === idleTtlMs` stays bound; `+1` expires).
- **Spill onto a capacity-saturated account.** An operator running both `max-inflight-per-account` and `spill-inflight` expects a request spilled onto an account that is also at its admission cap to fall through the existing attempt loop to the next account, not hang or throw. Covered by Task 19's spill-plus-capacity-gate precedence test.
- **Concurrent requests in one just-starting session.** The spec's "burst of new sessions" case (14 concurrent sessions landing on one account) implies two parallel first-requests for the _same_ new session id can race to bind different accounts before either completes. Covered by Task 19's parallel-unbound-requests test asserting the binding is whatever the first successful response lands on, and a second still-in-flight request is not corrupted by it.
- **Ranking/affinity/spill throwing mid-request.** An operator who mistypes a hot-reloaded value that still passes soft validation (e.g. an object where a string was expected, coerced through `unknown` at a call boundary) expects the request to still succeed via the pre-policy order, not 500. Covered by Task 14's try/catch fallback and Task 19's thrown-error test asserting `routing_policy_error` and a successful response.

## File Structure

**New files:**

- `src/lib/proxy/accountRanking.ts` — pure. `compareExpiryFirst`, `compareHeadroomFirst`, `applyAffinityAndPrimary`, `applySpill`, `rankAccounts`.
- `src/lib/proxy/sessionAffinity.ts` — pure, process-local state. `bind`, `get`, `clear`, `size`.

**Modified files:**

- `src/lib/server/routes/claudeProxyRoutes.ts` — comparator extraction, admission-lease redesign, `selectClaudeProxyAccountOrder` rewrite, session binding, `__testHooks` additions.
- `src/lib/proxy/proxyConfig.ts` — hard validation + soft parsing for the five new keys.
- `src/lib/proxy/runtimeConfig.ts` — snapshot fields, fingerprint, hot-reload affinity-store clearing.
- `src/lib/proxy/routingEvidence.ts` — five new `ProxyAccountRoutingReason` values.
- `src/lib/types/proxy.ts` — new policy/affinity/spill types, `ProxyAccountRoutingDecision` and `ProxyRequestRoutingSnapshot`/`LoadedClaudeAccountContext` extensions.
- `src/lib/types/subscription.ts` — five new optional `ProxyRoutingConfig` fields.
- `src/cli/commands/proxy.ts` — `/status` policy + bound-session-count fields.
- `test/continuous-test-suite-proxy.ts` — new deterministic + integration + CLI tests, one new header sentence.
- `docs/features/claude-proxy-config-reference.md` — five new keys, `primary-account` correction.

**Not part of the repo:** the DuckDB default-equivalence replay script (Task 5) is written to the session scratchpad directory, run locally, and its result is pasted into PR1's description. It is never committed.

---

# PR 1 — Refactor, no behaviour change

## Task 1: Extract `compareExpiryFirst` and a narrow `rankAccounts` into `accountRanking.ts`

**Files:**

- Create: `src/lib/proxy/accountRanking.ts`
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `ProxyPassthroughAccount`, `ProxyAccountSortMetrics`, `ProxyAccountRoutingReason` (all from `../types/index.js`, already defined).
- Produces: `compareExpiryFirst(a, b, metricsByKey, primaryKey): [number, ProxyAccountRoutingReason]`; `rankAccounts({ accounts, metricsByKey, primaryKey }): { orderedAccounts: ProxyPassthroughAccount[]; reason: ProxyAccountRoutingReason }`. Task 2 and Task 11 both build on these exact names.

- [ ] **Step 1: Write the failing test for `compareExpiryFirst` moved verbatim**

Add near the top of `test/continuous-test-suite-proxy.ts`, after the existing imports:

```ts
import {
  compareExpiryFirst,
  rankAccounts,
} from "../src/lib/proxy/accountRanking.js";
```

Add a new test function (near `testOrderAccountsByQuota`, following its structure):

```ts
async function testCompareExpiryFirstAvailability(): Promise<boolean> {
  const usable: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const cooling: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [usable.key, makeSortMetrics({ usable: true })],
    [
      cooling.key,
      makeSortMetrics({ usable: false, coolingUntil: Date.now() + 60_000 }),
    ],
  ]);
  const [sign, reason] = compareExpiryFirst(
    cooling,
    usable,
    metricsByKey,
    undefined,
  );
  if (sign <= 0 || reason !== "availability") {
    log(
      `compareExpiryFirst availability branch wrong — sign=${sign} reason=${reason}`,
      "red",
    );
    return false;
  }
  return true;
}
```

Add a `makeSortMetrics` helper above it (mirrors `makeQuota`'s override-defaults pattern at `test/continuous-test-suite-proxy.ts:6945-6958`):

```ts
function makeSortMetrics(
  over: Partial<ProxyAccountSortMetrics> = {},
): ProxyAccountSortMetrics {
  return {
    usable: true,
    saturated: false,
    hasQuota: true,
    quotaEvidenceRank: 0,
    quotaStale: false,
    quotaFreshness: "fresh",
    refreshNeeded: false,
    refreshReason: null,
    refreshInFlight: false,
    lastRefreshAttemptAt: null,
    lastRefreshSuccessAt: null,
    nextRefreshEligibleAt: null,
    saturationKind: "none",
    softLimitOverrideReason: null,
    quotaLastUpdated: null,
    quotaAgeMs: null,
    coolingActive: false,
    coolingReason: null,
    coolingUntil: 0,
    unifiedStatus: null,
    overageStatus: null,
    sessionStatus: "allowed",
    sessionUsed: 0,
    sessionResetBucket: Number.POSITIVE_INFINITY,
    sessionReset: Number.POSITIVE_INFINITY,
    weeklyStatus: "allowed",
    weeklyReset: Number.POSITIVE_INFINITY,
    weeklyUsed: 0,
    weeklyUsedForSort: 0,
    scopedModel: null,
    scopedStatus: null,
    scopedUsed: null,
    scopedReset: Number.POSITIVE_INFINITY,
    scopedUsedForSort: -1,
    scopedSaturated: false,
    ...over,
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL (or a module-not-found error) because `src/lib/proxy/accountRanking.ts` does not exist yet.

- [ ] **Step 3: Create `accountRanking.ts` with the moved comparator and narrow `rankAccounts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: the new test passes; note the suite as a whole still calls the old in-file `compareAccountRoutingFactors` at this point (removed in Task 2), so both coexist until then.

- [ ] **Step 5: Commit**

This is the first task of PR1, so it creates the branch and the PR's single commit (every later PR1 task amends it).

```bash
workforge create -t refactor -n proxy-account-ranking-extraction
git add src/lib/proxy/accountRanking.ts test/continuous-test-suite-proxy.ts
git commit -m "refactor(proxy): extract account comparator into accountRanking.ts"
```

## Task 2: Wire `orderAccountsByQuotaWithMetrics` as a thin wrapper; delete the old local comparator

**Files:**

- Modify: `src/lib/server/routes/claudeProxyRoutes.ts:2138-2282` (delete `compareAccountRoutingFactors`, rewrite `orderAccountsByQuotaWithMetrics`), `claudeProxyRoutes.ts:2381-2515` (`buildRoutingDecision`'s `quotaOrdered` branch)
- Test: `test/continuous-test-suite-proxy.ts` (existing `testOrderAccountsByQuota` and quota-routing suites, unmodified)

**Interfaces:**

- Consumes: `rankAccounts`, `compareExpiryFirst` from Task 1.
- Produces: `orderAccountsByQuotaWithMetrics(accounts, now, primaryKey, sessionSoftLimit, sessionResetToleranceMs, requestedModel?)` keeps its exact existing signature and return shape — Task 12 (PR2) is the only place that changes it.

- [ ] **Step 1: Add the import**

At the top of `claudeProxyRoutes.ts`, alongside the other `../../proxy/*` imports (e.g. next to `import { MAX_COOLDOWN_MS_BY_REASON } from "../../proxy/routingEvidence.js";`):

```ts
import {
  compareExpiryFirst,
  rankAccounts,
} from "../../proxy/accountRanking.js";
```

- [ ] **Step 2: Delete `compareAccountRoutingFactors` (lines 2138-2209) and rewrite `orderAccountsByQuotaWithMetrics`**

Replace the old function body:

```ts
function orderAccountsByQuotaWithMetrics(
  accounts: ProxyPassthroughAccount[],
  now: number,
  primaryKey: string | undefined,
  sessionSoftLimit: number,
  sessionResetToleranceMs: number,
  requestedModel?: string,
): {
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: Map<string, ProxyAccountSortMetrics>;
} {
  const metricsByKey = new Map(
    accounts.map((account) => [
      account.key,
      accountSortMetrics(
        account.key,
        now,
        sessionSoftLimit,
        sessionResetToleranceMs,
        requestedModel,
      ),
    ]),
  );
  const { orderedAccounts } = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey,
  });
  return { orderedAccounts, metricsByKey };
}
```

`orderAccountsByQuota` (lines 2242-2282, delegating through the wrapper) is untouched — it already calls `orderAccountsByQuotaWithMetrics(...).orderedAccounts`.

- [ ] **Step 3: Update `buildRoutingDecision`'s `quotaOrdered` branch to use the imported comparator**

In `buildRoutingDecision` (`claudeProxyRoutes.ts:2381-2515`), the mode/selection block currently calls the now-deleted local function:

```ts
  } else if (quotaOrdered) {
    mode = "quota";
    selectionReason = compareAccountRoutingFactors(
      orderedAccounts[0],
      orderedAccounts[1],
      metricsByKey,
      primaryKey,
    )[1];
```

Change `compareAccountRoutingFactors` to `compareExpiryFirst`:

```ts
  } else if (quotaOrdered) {
    mode = "quota";
    selectionReason = compareExpiryFirst(
      orderedAccounts[0],
      orderedAccounts[1],
      metricsByKey,
      primaryKey,
    )[1];
```

- [ ] **Step 4: Run the existing route-order tests to confirm zero behaviour change**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS, including the pre-existing `testOrderAccountsByQuota` (`test/continuous-test-suite-proxy.ts:7125-7209`) and `runWeeklyExpiryOrderingCases` (`:8363-8394`), neither of which was modified. Their continued passing is the evidence the extraction changed nothing observable.

- [ ] **Step 5: Type-check**

Run: `pnpm run check`
Expected: PASS — no remaining reference to `compareAccountRoutingFactors` anywhere in the file (`grep -n compareAccountRoutingFactors src/lib/server/routes/claudeProxyRoutes.ts` returns nothing).

- [ ] **Step 6: Commit (amend)**

```bash
git add src/lib/server/routes/claudeProxyRoutes.ts
git commit --amend --no-edit
```

## Task 3: Redesign account admission to count in-flight leases uniformly; add `getAccountInflight`

**Files:**

- Modify: `src/lib/server/routes/claudeProxyRoutes.ts:521-589` (admission lease subsystem), `claudeProxyRoutes.ts:12292+` (`__testHooks`)
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `AccountAdmissionState`, `AccountAdmissionLease` (existing types, `src/lib/types/proxy.ts:1310-1329`).
- Produces: `getAccountInflight(accountKey: string): number`, exposed on `__testHooks`. Task 14 (PR2) calls this directly (it's a route-local function, not exported from the module) to build the spill in-flight map.

- [ ] **Step 1: Write the failing test for unlimited-account in-flight counting**

Add to `test/continuous-test-suite-proxy.ts`:

```ts
async function testUnlimitedAccountInflightCounting(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const before = __testHooks.getAccountInflight("anthropic:unlimited-test");
  if (before !== 0) {
    log(`expected 0 in-flight before any lease, got ${before}`, "red");
    return false;
  }
  const lease = __testHooks.tryAcquireAccountAdmission(
    "anthropic:unlimited-test",
    undefined,
  );
  if (!lease) {
    log("expected an unlimited-capacity lease to be granted", "red");
    return false;
  }
  const during = __testHooks.getAccountInflight("anthropic:unlimited-test");
  if (during !== 1) {
    log(`expected 1 in-flight while lease is held, got ${during}`, "red");
    __testHooks.resetAllRuntimeState();
    return false;
  }
  lease.release();
  const after = __testHooks.getAccountInflight("anthropic:unlimited-test");
  if (after !== 0) {
    log(`expected 0 in-flight after release, got ${after}`, "red");
    __testHooks.resetAllRuntimeState();
    return false;
  }
  // Idempotent release must never go negative.
  lease.release();
  const afterDoubleRelease = __testHooks.getAccountInflight(
    "anthropic:unlimited-test",
  );
  __testHooks.resetAllRuntimeState();
  if (afterDoubleRelease !== 0) {
    log(
      `expected 0 in-flight after a double release, got ${afterDoubleRelease}`,
      "red",
    );
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `__testHooks.getAccountInflight` is not a function yet.

- [ ] **Step 3: Redesign `tryAcquireAccountAdmission`, add `getAccountInflight`, delete `unlimitedAccountAdmissionLease`**

`unlimitedAccountAdmissionLease` (`claudeProxyRoutes.ts:521-523`) has exactly two usages in the file — its own declaration and one `return` inside `tryAcquireAccountAdmission` — so removing it is self-contained. Replace:

```ts
const accountAdmissionStates = new Map<string, AccountAdmissionState>();
const unlimitedAccountAdmissionLease: AccountAdmissionLease = {
  release: () => undefined,
};
```

with:

```ts
const accountAdmissionStates = new Map<string, AccountAdmissionState>();
```

and replace `tryAcquireAccountAdmission`:

```ts
function tryAcquireAccountAdmission(
  accountKey: string,
  capacity: number | undefined,
): AccountAdmissionLease | undefined {
  const normalizedCapacity = normalizeMaxInflightPerAccount(capacity);
  const state = getAccountAdmissionState(accountKey);
  if (normalizedCapacity === undefined) {
    state.active += 1;
    return createAccountAdmissionLease(accountKey, state);
  }
  if (state.waiters.length > 0 || state.active >= normalizedCapacity) {
    return undefined;
  }
  state.active += 1;
  return createAccountAdmissionLease(accountKey, state);
}

/** Current in-flight request count for one account, unlimited or capped. */
function getAccountInflight(accountKey: string): number {
  return accountAdmissionStates.get(accountKey)?.active ?? 0;
}
```

`createAccountAdmissionLease`'s existing `released` guard already makes `release()` idempotent, so the double-release case in the test needs no additional code — it's covered by unchanged logic (`claudeProxyRoutes.ts:544-558`). `discardAccountAdmissionState` already reaps the map entry once `active` returns to `0` with no waiters, so `getAccountInflight` correctly falls back to `?? 0` for an account with no state entry at all.

- [ ] **Step 4: Add `getAccountInflight` to `__testHooks`**

In the `__testHooks` object literal (`claudeProxyRoutes.ts:12292+`), add a line near the other admission hooks:

```ts
  acquireAccountAdmission, acquireFirstAvailableAccountAdmission, tryAcquireAccountAdmission,
  enqueueAccountAdmission,
  getAccountInflight,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 6: Run the existing capacity-limited admission tests to confirm no regression**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: any pre-existing `max-inflight-per-account` admission tests still PASS — the capped branch's logic (`state.waiters.length > 0 || state.active >= normalizedCapacity`) is byte-identical to before, only reordered after the state lookup.

- [ ] **Step 7: Commit (amend)**

```bash
git add src/lib/server/routes/claudeProxyRoutes.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 4: Deterministic parity fixture proving the extraction is behaviour-preserving

**Files:**

- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `rankAccounts`, `compareExpiryFirst` (direct import, Task 1); `__testHooks.orderAccountsByQuota`, `__testHooks.setAccountRuntimeState`, `__testHooks.resetAllRuntimeState` (existing route hooks).
- Produces: nothing new — this task is tests only.

- [ ] **Step 1: Write a synthetic multi-account fixture covering every tie-break branch**

Add to `test/continuous-test-suite-proxy.ts`:

```ts
function buildRankingFixtureAccounts(): ProxyPassthroughAccount[] {
  return [
    { key: "anthropic:cooling", label: "cooling", type: "oauth" },
    { key: "anthropic:stale", label: "stale", type: "oauth" },
    { key: "anthropic:saturated", label: "saturated", type: "oauth" },
    {
      key: "anthropic:scoped-saturated",
      label: "scoped-saturated",
      type: "oauth",
    },
    { key: "anthropic:home", label: "home", type: "oauth" },
    { key: "anthropic:soonest", label: "soonest", type: "oauth" },
  ] as ProxyPassthroughAccount[];
}

function buildRankingFixtureMetrics(): Map<string, ProxyAccountSortMetrics> {
  const now = Date.now();
  return new Map([
    [
      "anthropic:cooling",
      makeSortMetrics({ usable: false, coolingUntil: now + 120_000 }),
    ],
    [
      "anthropic:stale",
      makeSortMetrics({ quotaEvidenceRank: 2, quotaFreshness: "unknown" }),
    ],
    [
      "anthropic:saturated",
      makeSortMetrics({ saturated: true, saturationKind: "soft" }),
    ],
    [
      "anthropic:scoped-saturated",
      makeSortMetrics({
        scopedSaturated: true,
        scopedUsed: 0.99,
        scopedUsedForSort: 0.99,
      }),
    ],
    ["anthropic:home", makeSortMetrics({ weeklyReset: now + 3_600_000 })],
    ["anthropic:soonest", makeSortMetrics({ weeklyReset: now + 60_000 })],
  ]);
}

async function testAccountRankingMatchesRouteWrapper(): Promise<boolean> {
  const accounts = buildRankingFixtureAccounts();
  const metricsByKey = buildRankingFixtureMetrics();
  const direct = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey: "anthropic:home",
  });

  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const now = Date.now();
  // Matches "anthropic:scoped-saturated"'s fabricated scopedSaturated: true
  // below to a real quota window (matchScopedQuotaWindow / accountSortMetrics
  // in claudeProxyRoutes.ts), rather than fabricating the metric on the
  // direct side with nothing on the wrapper side to derive it from — passing
  // requestedModel with no matching window would leave the wrapper computing
  // scopedSaturated: false for every account and the parity check would
  // still pass, comparing two different metric shapes.
  const requestedModel = "claude-fable-5-20260115";
  for (const account of accounts) {
    const m = metricsByKey.get(account.key);
    if (!m) {
      continue;
    }
    const baseQuota = makeQuota({
      weeklyResetAt:
        m.weeklyReset === Number.POSITIVE_INFINITY ? undefined : m.weeklyReset,
      sessionUsed: m.saturated ? 0.99 : 0,
      weeklyUsed: 0,
    });
    __testHooks.setAccountRuntimeState(account.key, {
      coolingUntil: m.coolingUntil > 0 ? m.coolingUntil : undefined,
      quota: m.scopedSaturated
        ? ({
            ...baseQuota,
            windows: [
              {
                kind: "weekly_scoped",
                group: "weekly",
                used: m.scopedUsed ?? 0.99,
                status: "rejected",
                resetsAt: Math.floor(now / 1000) + 3 * 24 * 3600,
                scopeModel: "claude-fable-5",
                source: "headers",
                updatedAt: now,
              },
            ],
          } as never)
        : baseQuota,
    });
  }
  const viaWrapper = __testHooks.orderAccountsByQuota(
    accounts,
    now,
    "anthropic:home",
    0.97,
    5 * 60 * 1000,
    requestedModel,
  );
  __testHooks.resetAllRuntimeState();

  const directKeys = direct.orderedAccounts.map((a) => a.key);
  const wrapperKeys = viaWrapper.map((a) => a.key);
  const matches =
    directKeys.length === wrapperKeys.length &&
    directKeys.every((key, index) => key === wrapperKeys[index]);
  if (!matches) {
    log(
      "rankAccounts and the route's orderAccountsByQuota disagree on order",
      "red",
    );
    return false;
  }
  return true;
}
```

This cross-checks the pure module against the still-live route surface: the direct side's fabricated metrics and the wrapper's quota-derived metrics are built to agree on every branch that decides these six accounts' order, including the scoped-saturation branch via a real matched window — the parity claim is exactly "these two entry points onto the same comparator produce the same order."

- [ ] **Step 2: Register the new tests**

In the `tests: TestFunction[]` array (`test/continuous-test-suite-proxy.ts:8996+`), add:

```ts
  { name: "compareExpiryFirst: availability branch", fn: testCompareExpiryFirstAvailability, category: "proxy-primary" },
  { name: "accountRanking: matches route wrapper order", fn: testAccountRankingMatchesRouteWrapper, category: "proxy-primary" },
  { name: "admission: unlimited account in-flight counting", fn: testUnlimitedAccountInflightCounting, category: "proxy-infra" },
```

- [ ] **Step 3: Run the full suite**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS — all three new tests green, no existing test broken.

- [ ] **Step 4: Commit (amend)**

```bash
git add test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 5: Local DuckDB default-equivalence replay (scratch-only, not committed)

**Files:**

- Create (scratchpad only, never under the repo's git tree): `/private/tmp/claude-501/-Users-sachinsharma/7dca4ba8-adbe-4028-b60c-c66fe9d581ca/scratchpad/replay-expiry-first.py`

**Interfaces:**

- Consumes: the frozen telemetry DuckDB snapshot referenced by the standing rule (everything under `scratchpad/lake/` is read-only; never write the DuckDB file). The exact table/column names live in that snapshot's own `GUIDE.md`/`GUIDE2.md` and must be read at execution time — they are outside this repository's version control, so this task cannot hardcode them the way every other task grounds in checked-in source.
- Consumes: `rankAccounts`/`compareExpiryFirst` semantics (Task 1) — the script re-implements the same comparator in Python rather than shelling out to `tsx`, so its correctness is checked against the TypeScript unit tests in Task 4, not the other way around.
- Produces: a printed pass/fail count plus a short prose summary, pasted into PR1's description. No repo file changes.

- [ ] **Step 1: Read the snapshot's own schema guide before writing any query**

Locate the frozen lake directory (per the standing rule, under `scratchpad/lake/`) and read its `GUIDE.md`/`GUIDE2.md` to find: the decisions table name, the per-decision candidate rows table (or nested column), and which column holds the recorded post-sort rank vs. the pre-sort quota metrics used for that decision. Do not proceed to Step 2 until these are identified.

- [ ] **Step 2: Confirm the read-only-open constraint before touching the file**

```python
import duckdb

# Never open for write. The lake is a frozen snapshot; a write-capable
# connection is a bug even if nothing is ever written through it.
con = duckdb.connect(database="<absolute-path-to-snapshot>.duckdb", read_only=True)
```

Run this alone first (inside the project-scoped Python venv) and confirm it does not raise and does not create a `.wal` file next to the snapshot.

- [ ] **Step 3: Write the replay script with decoupled candidate-input order**

The telemetry's recorded `cand.rank` column reflects **post-sort** order — feeding candidates to the Python comparator in that same order would make the replay trivially self-confirming. Present candidates in a canonical order decoupled from the recorded rank (e.g. sorted by account label) before re-sorting with the ported comparator:

```python
def compare_expiry_first(a, b, primary_key):
    """Ported 1:1 from accountRanking.ts's compareExpiryFirst. Returns a
    negative number when `a` should sort before `b`."""
    if a["usable"] != b["usable"]:
        return -1 if a["usable"] else 1
    if not a["usable"] and not b["usable"]:
        au = a["cooling_until"] or float("inf")
        bu = b["cooling_until"] or float("inf")
        return 0 if au == bu else au - bu
    if a["quota_evidence_rank"] != b["quota_evidence_rank"]:
        return a["quota_evidence_rank"] - b["quota_evidence_rank"]
    if a["saturated"] != b["saturated"]:
        return 1 if a["saturated"] else -1
    if a["scoped_saturated"] != b["scoped_saturated"]:
        return 1 if a["scoped_saturated"] else -1
    if a["saturated"] and b["saturated"]:
        if a["session_reset_bucket"] != b["session_reset_bucket"]:
            return a["session_reset_bucket"] - b["session_reset_bucket"]
        if a["weekly_reset"] != b["weekly_reset"]:
            return a["weekly_reset"] - b["weekly_reset"]
    else:
        if a["weekly_reset"] != b["weekly_reset"]:
            return a["weekly_reset"] - b["weekly_reset"]
        if a["session_reset_bucket"] != b["session_reset_bucket"]:
            return a["session_reset_bucket"] - b["session_reset_bucket"]
    if (
        a["scoped_used"] is not None
        and b["scoped_used"] is not None
        and a["scoped_used_for_sort"] != b["scoped_used_for_sort"]
    ):
        return b["scoped_used_for_sort"] - a["scoped_used_for_sort"]
    if a["weekly_used_for_sort"] != b["weekly_used_for_sort"]:
        return b["weekly_used_for_sort"] - a["weekly_used_for_sort"]
    if primary_key and (a["key"] == primary_key) != (b["key"] == primary_key):
        return -1 if a["key"] == primary_key else 1
    return 0


import functools

def replay_decision(row_candidates, primary_key, recorded_order):
    canonical = sorted(row_candidates, key=lambda c: c["account_label"])
    replayed = sorted(
        canonical,
        key=functools.cmp_to_key(lambda a, b: compare_expiry_first(a, b, primary_key)),
    )
    replayed_order = [c["account_label"] for c in replayed]
    return replayed_order == recorded_order
```

- [ ] **Step 4: Run the replay over the whole snapshot, printing only an aggregate**

```python
total = 0
mismatches = 0
sample_mismatch_ids = []

for decision in con.execute("<query identified in Step 1, read-only>").fetchall():
    total += 1
    ok = replay_decision(decision.candidates, decision.primary_key, decision.recorded_order)
    if not ok:
        mismatches += 1
        if len(sample_mismatch_ids) < 5:
            sample_mismatch_ids.append(decision.decision_id)

print(f"replayed {total} decisions, {mismatches} mismatches")
if sample_mismatch_ids:
    print(f"sample mismatch decision ids: {sample_mismatch_ids}")
con.close()
```

Never print OAuth tokens, Authorization headers, or full request/response bodies — only the aggregate counts and, at most, decision ids for follow-up. Never call Anthropic or any upstream, never restart or signal the running proxy, never touch `~/.neurolink/*.json`, and never query OpenObserve over HTTP — the DuckDB snapshot is the only data source.

- [ ] **Step 5: Paste the result into the PR1 description**

Record the exact printed line (`replayed N decisions, 0 mismatches` is the success condition) in the PR body under a "Default-equivalence replay" heading. If any mismatches are found, do not proceed to Task 6 — treat it as a bug in the extraction and fix Task 1/2 first.

- [ ] **Step 6: Confirm no repo state changed**

```bash
git status --porcelain
```

Expected: empty, or showing only the intentional Task 1–4 changes — nothing under `scratchpad/lake/` and no new file inside the git working tree.

## Task 6: Quality gates and finalize the PR1 commit

**Files:** none (verification only)

- [ ] **Step 1: Type check**

Run: `pnpm run check`
Expected: PASS.

- [ ] **Step 2: Lint**

Run: `pnpm run lint`
Expected: PASS — no `no-local-type-alias`, `no-interface`, or `e2e-tests-only` violations from the new `accountRanking.ts` (it has no local type aliases and is imported directly under the already-allowed `test/continuous-test-suite-proxy.ts` determinism exception, so no `eslint.config.js` change is needed).

- [ ] **Step 3: Full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 4: Build**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 5: Finalize the commit message and open the PR**

```bash
git commit --amend -m "refactor(proxy): extract account comparator into accountRanking.ts

Moves the existing quota-fill comparator into a new pure
src/lib/proxy/accountRanking.ts as compareExpiryFirst, with
orderAccountsByQuotaWithMetrics becoming a thin wrapper around a new
rankAccounts(). Also unifies unlimited- and capacity-limited account
admission onto the same accountAdmissionStates map so getAccountInflight()
works for every account, which PR2's spill-inflight policy needs.

No behaviour change: proven by the existing route tests (unmodified) plus
a new direct-vs-wrapper parity test and a local, telemetry-driven
default-equivalence replay (see PR description)."
```

Do not push and do not open the PR yet unless explicitly asked — leave the branch ready. Report the exact replay result and task count (6 tasks) back to whoever requested this plan.

---

# PR 2 — Policies

## Task 7: Types — policy, affinity, and spill evidence

**Files:**

- Modify: `src/lib/types/proxy.ts` (near `ProxyAccountSortMetrics`/`ProxyAccountRoutingDecision`, `:554-722`), `src/lib/types/subscription.ts:1200-1244` (`ProxyRoutingConfig`), `src/lib/proxy/routingEvidence.ts:14-31` (`PROXY_ACCOUNT_ROUTING_REASONS`)

**Interfaces:**

- Produces: `ProxyAccountRankingPolicy`, `ProxyAccountRoutingAffinitySkipReason`, `ProxyRoutingPolicySnapshot`, `ProxyAccountRoutingAffinityEvidence`, `ProxyAccountRoutingSpillEvidence` (all in `src/lib/types/proxy.ts`, barrel-exported). Every later task imports these from `../types/index.js` (or `../../types/index.js` from routes).

- [ ] **Step 1: Add the new policy/evidence types to `src/lib/types/proxy.ts`**

Insert immediately after `ProxyAccountSortMetrics` (after the closing `};` at what is currently line 702):

```ts
export type ProxyAccountRankingPolicy = "expiry-first" | "headroom-first";

export type ProxyAccountRoutingAffinitySkipReason =
  | "unusable"
  | "session_saturated"
  | "expired"
  | "no_session"
  | "disabled";

/** The five routing.* values in effect for one request, as reported on the decision. */
export type ProxyRoutingPolicySnapshot = {
  ranking: ProxyAccountRankingPolicy;
  preferPrimary: boolean;
  sessionAffinity: boolean;
  sessionAffinityIdleTtlMs: number;
  spillInflight: number;
};

export type ProxyAccountRoutingAffinityEvidence = {
  sessionBound: boolean;
  boundAccount: string | null;
  applied: boolean;
  skippedReason: ProxyAccountRoutingAffinitySkipReason | null;
};

export type ProxyAccountRoutingSpillEvidence = {
  from: string;
  to: string;
  inflight: number;
};
```

- [ ] **Step 2: Extend `ProxyAccountRoutingDecision` with the three new optional fields**

Change (currently ending at `candidates: ProxyAccountRoutingCandidate[];`):

```ts
export type ProxyAccountRoutingDecision = {
  schemaVersion: 1;
  evaluatedAt: string;
  strategy: ProxyAccountRoutingStrategy;
  mode: ProxyAccountRoutingMode;
  selectionReason: ProxyAccountRoutingReason;
  quotaRoutingEnabled: boolean;
  quotaInputsUsed: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
  configuredPrimaryAccount: string | null;
  configuredPrimaryMatched: boolean;
  rotationOffset: number;
  initialAccount: string;
  candidates: ProxyAccountRoutingCandidate[];
  policy?: ProxyRoutingPolicySnapshot;
  affinity?: ProxyAccountRoutingAffinityEvidence;
  spill?: ProxyAccountRoutingSpillEvidence;
};
```

- [ ] **Step 3: Extend `ProxyRoutingConfig` in `subscription.ts` with the five new optional fields**

After `accountAllowlist?: string[];` (currently the last field before the closing `};` at line 1243-1244):

```ts
  accountAllowlist?: string[];
  /** Ordering rule for usable accounts. Defaults to "expiry-first" (today's behaviour). */
  accountRanking?: "expiry-first" | "headroom-first";
  /** If the configured primary is usable and not session-saturated, try it first. */
  preferPrimary?: boolean;
  /** Keep a Claude Code session on its bound account while it stays usable and not session-saturated. */
  sessionAffinity?: boolean;
  /** Idle TTL, in ms, before a session-affinity binding is dropped. 60000-86400000. */
  sessionAffinityIdleTtlMs?: number;
  /** For a request without a binding: spill off an account already at N in-flight. 0-100, 0 = off. */
  spillInflight?: number;
};
```

- [ ] **Step 4: Append the five new routing reasons**

In `src/lib/proxy/routingEvidence.ts`, change:

```ts
export const PROXY_ACCOUNT_ROUTING_REASONS = [
  "single_account",
  "round_robin",
  "configured_primary",
  "insertion_order",
  "availability",
  "cooldown_recovery",
  "quota_evidence",
  "quota_probe",
  "session_headroom",
  "scoped_headroom",
  "session_reset",
  "weekly_reset",
  "weekly_utilization",
  "scoped_utilization",
  "headroom",
  "session_affinity",
  "preferred_primary",
  "spill_inflight",
  "routing_policy_error",
] as const;
```

- [ ] **Step 5: Type check**

Run: `pnpm run check`
Expected: PASS — these are purely additive/optional fields, so nothing downstream breaks yet.

- [ ] **Step 6: Commit**

This is the first task of PR2, so it creates the branch and PR2's single commit.

```bash
workforge create -t feat -n proxy-account-routing-policies
git add src/lib/types/proxy.ts src/lib/types/subscription.ts src/lib/proxy/routingEvidence.ts
git commit -m "feat(proxy): add routing policy, affinity, and spill types"
```

## Task 8: Config parsing and validation for the five new keys

**Files:**

- Modify: `src/lib/proxy/proxyConfig.ts` (hard validation near `:380-434`, soft parsing near `:533-745`)
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `MIN_MAX_INFLIGHT_PER_ACCOUNT`/`MAX_MAX_INFLIGHT_PER_ACCOUNT` pattern from `./modelRouter.js` as a naming precedent only — the two new numeric keys get their own local bounds, not these.
- Produces: `validateProxyConfig` rejects invalid values with a pushed error string; `parseRoutingConfig` returns a `Partial<ProxyRoutingConfig>` with the five new fields populated when valid, warned-and-omitted when not.

- [ ] **Step 1: Write the failing test for hard validation rejecting an invalid `account-ranking`**

Add to `test/continuous-test-suite-proxy.ts`:

```ts
async function testValidateProxyConfigRejectsBadAccountRanking(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const errors = validateProxyConfig({
    routing: { "account-ranking": "fastest-first" },
  } as unknown as Record<string, unknown>);
  const found = errors.some((e) => e.includes("account-ranking"));
  if (!found) {
    log("expected a routing.account-ranking validation error", "red");
    return false;
  }
  return true;
}

async function testValidateProxyConfigRejectsOutOfRangeSpill(): Promise<boolean> {
  const { validateProxyConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const errors = validateProxyConfig({
    routing: { "spill-inflight": 101 },
  } as unknown as Record<string, unknown>);
  const found = errors.some((e) => e.includes("spill-inflight"));
  if (!found) {
    log("expected a routing.spill-inflight validation error", "red");
    return false;
  }
  return true;
}

async function testParseRoutingConfigAcceptsCamelCaseAffinityTtl(): Promise<boolean> {
  const { parseRoutingConfig } =
    await import("../src/lib/proxy/proxyConfig.js");
  const parsed = parseRoutingConfig({ sessionAffinityIdleTtlMs: 120_000 });
  if (parsed?.sessionAffinityIdleTtlMs !== 120_000) {
    log("expected camelCase sessionAffinityIdleTtlMs to parse", "red");
    return false;
  }
  return true;
}
```

Note: `parseRoutingConfig` is currently module-local (not exported). This step also requires exporting it — see Step 3.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — the three new validation/parsing branches don't exist yet, and `parseRoutingConfig` isn't exported.

- [ ] **Step 3: Export `parseRoutingConfig` and add the two local bound constants**

Near the top of `proxyConfig.ts`, alongside the existing `MIN_MAX_INFLIGHT_PER_ACCOUNT`/`MAX_MAX_INFLIGHT_PER_ACCOUNT` import:

```ts
const MIN_SESSION_AFFINITY_IDLE_TTL_MS = 60_000;
const MAX_SESSION_AFFINITY_IDLE_TTL_MS = 86_400_000;
const MIN_SPILL_INFLIGHT = 0;
const MAX_SPILL_INFLIGHT = 100;
```

Change `function parseRoutingConfig(` to `export function parseRoutingConfig(`.

- [ ] **Step 4: Add hard validation**

Inside `validateProxyConfig`'s `routing` block, immediately after the existing `session-reset-tolerance-ms` check (ending just before the closing `}` that was at `proxyConfig.ts:433-434`):

```ts
const rawAccountRanking = routing["account-ranking"] ?? routing.accountRanking;
if (
  rawAccountRanking !== undefined &&
  rawAccountRanking !== "expiry-first" &&
  rawAccountRanking !== "headroom-first"
) {
  errors.push("routing.account-ranking must be expiry-first or headroom-first");
}

const rawPreferPrimary = routing["prefer-primary"] ?? routing.preferPrimary;
const normalizedPreferPrimary =
  typeof rawPreferPrimary === "string"
    ? rawPreferPrimary.trim().toLowerCase()
    : undefined;
if (
  rawPreferPrimary !== undefined &&
  typeof rawPreferPrimary !== "boolean" &&
  normalizedPreferPrimary !== "true" &&
  normalizedPreferPrimary !== "false"
) {
  errors.push("routing.prefer-primary must be a boolean");
}

const rawSessionAffinity =
  routing["session-affinity"] ?? routing.sessionAffinity;
const normalizedSessionAffinity =
  typeof rawSessionAffinity === "string"
    ? rawSessionAffinity.trim().toLowerCase()
    : undefined;
if (
  rawSessionAffinity !== undefined &&
  typeof rawSessionAffinity !== "boolean" &&
  normalizedSessionAffinity !== "true" &&
  normalizedSessionAffinity !== "false"
) {
  errors.push("routing.session-affinity must be a boolean");
}

const rawAffinityTtl =
  routing["session-affinity-idle-ttl-ms"] ?? routing.sessionAffinityIdleTtlMs;
if (
  rawAffinityTtl !== undefined &&
  (typeof rawAffinityTtl !== "number" ||
    !Number.isInteger(rawAffinityTtl) ||
    rawAffinityTtl < MIN_SESSION_AFFINITY_IDLE_TTL_MS ||
    rawAffinityTtl > MAX_SESSION_AFFINITY_IDLE_TTL_MS)
) {
  errors.push(
    "routing.session-affinity-idle-ttl-ms must be an integer between 60000 and 86400000",
  );
}

const rawSpillInflight = routing["spill-inflight"] ?? routing.spillInflight;
if (
  rawSpillInflight !== undefined &&
  (typeof rawSpillInflight !== "number" ||
    !Number.isInteger(rawSpillInflight) ||
    rawSpillInflight < MIN_SPILL_INFLIGHT ||
    rawSpillInflight > MAX_SPILL_INFLIGHT)
) {
  errors.push("routing.spill-inflight must be an integer between 0 and 100");
}
```

- [ ] **Step 5: Add soft parsing**

Inside `parseRoutingConfig`, immediately after the existing `accountAllowlist` block (the function's last block before `return result;`):

```ts
const rawAccountRanking = raw["account-ranking"] ?? raw.accountRanking;
if (rawAccountRanking !== undefined) {
  if (
    rawAccountRanking === "expiry-first" ||
    rawAccountRanking === "headroom-first"
  ) {
    result.accountRanking = rawAccountRanking;
  } else {
    logger.warn(
      `[proxy-config] Ignoring routing.accountRanking: expected expiry-first|headroom-first, got ${String(rawAccountRanking)}`,
    );
  }
}

const rawPreferPrimary = raw["prefer-primary"] ?? raw.preferPrimary;
if (rawPreferPrimary !== undefined) {
  if (typeof rawPreferPrimary === "boolean") {
    result.preferPrimary = rawPreferPrimary;
  } else if (
    typeof rawPreferPrimary === "string" &&
    ["true", "false"].includes(rawPreferPrimary.trim().toLowerCase())
  ) {
    result.preferPrimary = rawPreferPrimary.trim().toLowerCase() === "true";
  } else {
    logger.warn(
      `[proxy-config] Ignoring routing.preferPrimary: expected boolean, got ${typeof rawPreferPrimary}`,
    );
  }
}

const rawSessionAffinity = raw["session-affinity"] ?? raw.sessionAffinity;
if (rawSessionAffinity !== undefined) {
  if (typeof rawSessionAffinity === "boolean") {
    result.sessionAffinity = rawSessionAffinity;
  } else if (
    typeof rawSessionAffinity === "string" &&
    ["true", "false"].includes(rawSessionAffinity.trim().toLowerCase())
  ) {
    result.sessionAffinity = rawSessionAffinity.trim().toLowerCase() === "true";
  } else {
    logger.warn(
      `[proxy-config] Ignoring routing.sessionAffinity: expected boolean, got ${typeof rawSessionAffinity}`,
    );
  }
}

const rawAffinityTtl =
  raw["session-affinity-idle-ttl-ms"] ?? raw.sessionAffinityIdleTtlMs;
if (rawAffinityTtl !== undefined) {
  if (
    typeof rawAffinityTtl === "number" &&
    Number.isInteger(rawAffinityTtl) &&
    rawAffinityTtl >= MIN_SESSION_AFFINITY_IDLE_TTL_MS &&
    rawAffinityTtl <= MAX_SESSION_AFFINITY_IDLE_TTL_MS
  ) {
    result.sessionAffinityIdleTtlMs = rawAffinityTtl;
  } else {
    logger.warn(
      `[proxy-config] Ignoring routing.sessionAffinityIdleTtlMs: expected integer between 60000 and 86400000, got ${String(rawAffinityTtl)}`,
    );
  }
}

const rawSpillInflight = raw["spill-inflight"] ?? raw.spillInflight;
if (rawSpillInflight !== undefined) {
  if (
    typeof rawSpillInflight === "number" &&
    Number.isInteger(rawSpillInflight) &&
    rawSpillInflight >= MIN_SPILL_INFLIGHT &&
    rawSpillInflight <= MAX_SPILL_INFLIGHT
  ) {
    result.spillInflight = rawSpillInflight;
  } else {
    logger.warn(
      `[proxy-config] Ignoring routing.spillInflight: expected integer between 0 and 100, got ${String(rawSpillInflight)}`,
    );
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 7: Register the new tests**

```ts
  { name: "proxyConfig: rejects invalid account-ranking", fn: testValidateProxyConfigRejectsBadAccountRanking, category: "proxy-infra" },
  { name: "proxyConfig: rejects out-of-range spill-inflight", fn: testValidateProxyConfigRejectsOutOfRangeSpill, category: "proxy-infra" },
  { name: "proxyConfig: parses camelCase sessionAffinityIdleTtlMs", fn: testParseRoutingConfigAcceptsCamelCaseAffinityTtl, category: "proxy-infra" },
```

- [ ] **Step 8: Commit (amend)**

```bash
git add src/lib/proxy/proxyConfig.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 9: Runtime config snapshot carries the five policy values

**Files:**

- Modify: `src/lib/proxy/runtimeConfig.ts:352-388` (`buildCandidate`), `src/lib/types/proxy.ts:3614-3627` (`ProxyRequestRoutingSnapshot`)

**Interfaces:**

- Consumes: `parseRoutingConfig`'s output (Task 8) via the existing `routing` variable already in scope in `buildCandidate`.
- Produces: `ProxyRuntimeConfigSnapshot` (which extends `ProxyRequestRoutingSnapshot`) now carries `accountRanking`, `preferPrimary`, `sessionAffinity`, `sessionAffinityIdleTtlMs`, `spillInflight`. Task 14/15/18 all read these off the snapshot.

- [ ] **Step 1: Extend `ProxyRequestRoutingSnapshot`**

In `src/lib/types/proxy.ts`, change:

```ts
export type ProxyRequestRoutingSnapshot = {
  generation: number;
  strategy: ProxyStartStrategy;
  modelRouter?: ModelRouterInterface;
  passthrough: boolean;
  primaryAccountKey?: string;
  accountAllowlist?: ReadonlySet<string>;
  quotaRoutingEnabled: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
  useOverage: ProxyOveragePolicy;
  accountRanking: ProxyAccountRankingPolicy;
  preferPrimary: boolean;
  sessionAffinity: boolean;
  sessionAffinityIdleTtlMs: number;
  spillInflight: number;
};
```

- [ ] **Step 2: Resolve the five values in `buildCandidate`, following the existing `useOverage` precedent exactly**

In `runtimeConfig.ts`, immediately after `const useOverage = routing?.useOverage ?? "auto";`:

```ts
const useOverage = routing?.useOverage ?? "auto";
const accountRanking = routing?.accountRanking ?? "expiry-first";
const preferPrimary = routing?.preferPrimary ?? false;
const sessionAffinity = routing?.sessionAffinity ?? false;
const sessionAffinityIdleTtlMs = routing?.sessionAffinityIdleTtlMs ?? 3_600_000;
const spillInflight = routing?.spillInflight ?? 0;
```

No environment-variable layer and no dedicated resolver function — this mirrors `useOverage`'s simple inline nullish-coalescing rather than `sessionSoftLimit`/`sessionResetToleranceMs`'s pattern, because none of the five keys has (or the spec asks for) an env-var override.

- [ ] **Step 3: Add the five values to the fingerprint and the returned snapshot**

```ts
const fingerprintSource = JSON.stringify({
  strategy,
  passthrough: options.passthrough,
  routing: routing ?? null,
  primaryAccountKey,
  accountAllowlist: accountAllowlist ? [...accountAllowlist].sort() : null,
  quotaRoutingEnabled,
  sessionSoftLimit,
  sessionResetToleranceMs,
  useOverage,
  accountRanking,
  preferPrimary,
  sessionAffinity,
  sessionAffinityIdleTtlMs,
  spillInflight,
});
const configHash = createHash("sha256")
  .update(fingerprintSource)
  .digest("hex")
  .slice(0, 16);

return {
  snapshot: Object.freeze({
    generation,
    loadedAt: new Date().toISOString(),
    configHash,
    proxyConfig,
    strategy,
    modelRouter,
    passthrough: options.passthrough,
    primaryAccountKey,
    accountAllowlist,
    quotaRoutingEnabled,
    sessionSoftLimit,
    sessionResetToleranceMs,
    useOverage,
    accountRanking,
    preferPrimary,
    sessionAffinity,
    sessionAffinityIdleTtlMs,
    spillInflight,
  }),
  configFilePresent,
  envFilePresent,
  envFileHash,
};
```

- [ ] **Step 4: Type check**

Run: `pnpm run check`
Expected: FAIL at this point — the POST /v1/messages route's inline fallback-snapshot literal (`claudeProxyRoutes.ts:10734-10745`) and `LoadedClaudeAccountContext`/`handleAnthropicRoutedClaudeRequest` do not yet supply these fields. This is expected; Task 15 completes the threading. Confirm the errors are exactly the two call sites named here (`grep -n "useOverage: \"auto\"" src/lib/server/routes/claudeProxyRoutes.ts` to locate the fallback literal) and nowhere else.

- [ ] **Step 5: Commit (amend)**

```bash
git add src/lib/proxy/runtimeConfig.ts src/lib/types/proxy.ts
git commit --amend --no-edit
```

(The type-check failure from Step 4 is carried forward intentionally; Task 15 clears it. Do not run `pnpm run build`/`pnpm run lint` as gates again until Task 15 is done — `pnpm run check` is used here only to confirm the two known call sites, not as a pass/fail gate for this task.)

## Task 10: `sessionAffinity.ts` — the session→account binding store

**Files:**

- Create: `src/lib/proxy/sessionAffinity.ts`
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Produces: `bind(sessionId: string, accountKey: string, now: number): void`, `get(sessionId: string, now: number, idleTtlMs: number): string | undefined`, `clear(): void`, `size(): number`, and a `sessionAffinity` namespace object bundling all four. Task 14 (ranking call sites) and Task 16 (binding on success) both import this.
- **Design decision:** the spec's `get(sessionId, now)` is written with two parameters, but `idleTtlMs` is hot-reloadable per-request config, not a fixed module constant, so it is threaded as an explicit third parameter here — the module has no other way to know the currently configured TTL. `get()` never refreshes a binding's position or `lastServedAt`; only `bind()` does, since the spec's "idle TTL counts from the session's last **served** request" ties freshness to being served, not merely checked.
- **Design decision:** the per-record shape (`{ accountKey, lastServedAt }`) is an inline object type on the `Map`'s generic parameter, not a named `type` alias, so it does not trigger CLAUDE.md rule 2's "all type definitions go in `src/lib/types/`" for a private, single-use implementation detail with no external consumer.

- [ ] **Step 1: Write the failing tests for bind/get, idle expiry, eviction, and clear**

Add to `test/continuous-test-suite-proxy.ts`:

```ts
import { sessionAffinity } from "../src/lib/proxy/sessionAffinity.js";

async function testSessionAffinityBindAndGet(): Promise<boolean> {
  sessionAffinity.clear();
  sessionAffinity.bind("session-a", "anthropic:acct-1", 1_000);
  const bound = sessionAffinity.get("session-a", 1_500, 60_000);
  sessionAffinity.clear();
  if (bound !== "anthropic:acct-1") {
    log("expected session-a bound to anthropic:acct-1", "red");
    return false;
  }
  return true;
}

async function testSessionAffinityIdleExpiryBoundary(): Promise<boolean> {
  sessionAffinity.clear();
  sessionAffinity.bind("session-b", "anthropic:acct-1", 1_000);
  const atBoundary = sessionAffinity.get("session-b", 1_000 + 60_000, 60_000);
  const pastBoundary = sessionAffinity.get("session-b", 1_000 + 60_001, 60_000);
  sessionAffinity.clear();
  if (atBoundary !== "anthropic:acct-1") {
    log("expected binding to survive exactly at the idle TTL boundary", "red");
    return false;
  }
  if (pastBoundary !== undefined) {
    log("expected binding to expire one ms past the idle TTL boundary", "red");
    return false;
  }
  return true;
}

async function testSessionAffinityEvictsAtCap(): Promise<boolean> {
  sessionAffinity.clear();
  for (let i = 0; i < 5_000; i += 1) {
    sessionAffinity.bind(`session-${i}`, "anthropic:acct-1", 1_000 + i);
  }
  const beforeOverflow = sessionAffinity.size();
  sessionAffinity.bind("session-5000", "anthropic:acct-1", 1_000 + 5_000);
  const afterOverflow = sessionAffinity.size();
  const oldestStillBound = sessionAffinity.get(
    "session-0",
    1_000 + 5_001,
    1_000_000_000,
  );
  sessionAffinity.clear();
  if (beforeOverflow !== 5_000) {
    log(
      `expected 5000 bound sessions before overflow, got ${beforeOverflow}`,
      "red",
    );
    return false;
  }
  if (afterOverflow !== 5_000) {
    log(
      `expected the store to stay capped at 5000, got ${afterOverflow}`,
      "red",
    );
    return false;
  }
  if (oldestStillBound !== undefined) {
    log(
      "expected the least-recently-bound session to have been evicted",
      "red",
    );
    return false;
  }
  return true;
}

async function testSessionAffinityClear(): Promise<boolean> {
  sessionAffinity.clear();
  sessionAffinity.bind("session-c", "anthropic:acct-1", 1_000);
  sessionAffinity.clear();
  const size = sessionAffinity.size();
  const bound = sessionAffinity.get("session-c", 1_500, 60_000);
  if (size !== 0 || bound !== undefined) {
    log("expected clear() to empty the store", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `src/lib/proxy/sessionAffinity.ts` does not exist.

- [ ] **Step 3: Write the module**

```ts
const MAX_BOUND_SESSIONS = 5_000;

const bindings = new Map<
  string,
  { accountKey: string; lastServedAt: number }
>();

/** Bind a session to the account that just served it, refreshing its idle clock. */
export function bind(sessionId: string, accountKey: string, now: number): void {
  bindings.delete(sessionId);
  bindings.set(sessionId, { accountKey, lastServedAt: now });
  if (bindings.size > MAX_BOUND_SESSIONS) {
    const oldestKey = bindings.keys().next().value;
    if (oldestKey !== undefined) {
      bindings.delete(oldestKey);
    }
  }
}

/**
 * The account a session is bound to, or undefined if unbound or idle-expired.
 * A read never refreshes the binding — only a served request (bind) does.
 */
export function get(
  sessionId: string,
  now: number,
  idleTtlMs: number,
): string | undefined {
  const record = bindings.get(sessionId);
  if (!record) {
    return undefined;
  }
  if (now - record.lastServedAt > idleTtlMs) {
    bindings.delete(sessionId);
    return undefined;
  }
  return record.accountKey;
}

export function clear(): void {
  bindings.clear();
}

export function size(): number {
  return bindings.size;
}

export const sessionAffinity = { bind, get, clear, size };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 5: Register the new tests**

```ts
  { name: "sessionAffinity: bind and get", fn: testSessionAffinityBindAndGet, category: "proxy-primary" },
  { name: "sessionAffinity: idle expiry boundary", fn: testSessionAffinityIdleExpiryBoundary, category: "proxy-primary" },
  { name: "sessionAffinity: evicts least-recently-bound at cap", fn: testSessionAffinityEvictsAtCap, category: "proxy-primary" },
  { name: "sessionAffinity: clear empties the store", fn: testSessionAffinityClear, category: "proxy-primary" },
```

- [ ] **Step 6: Commit (amend)**

```bash
git add src/lib/proxy/sessionAffinity.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 11: `accountRanking.ts` PR2 extension — `compareHeadroomFirst`, precedence, spill

**Files:**

- Modify: `src/lib/proxy/accountRanking.ts`
- Test: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Produces: `compareHeadroomFirst(a, b, metricsByKey, primaryKey): [number, ProxyAccountRoutingReason]`; `applyAffinityAndPrimary({ orderedAccounts, metricsByKey, affinityKey?, primaryKey?, preferPrimary? }): { orderedAccounts, reason: "session_affinity" | "preferred_primary" | null, affinitySkippedReason: "unusable" | "session_saturated" | null }`; `applySpill({ orderedAccounts, inflightByKey, spillInflight }): { orderedAccounts, spill: { from, to, inflight } | null }`; extended `rankAccounts({ accounts, metricsByKey, primaryKey, ranking?, affinityKey?, preferPrimary? }): { orderedAccounts, reason, affinitySkippedReason }`.
- Consumes: `ProxyAccountRankingPolicy` (Task 7).

- [ ] **Step 1: Write the failing test for `compareHeadroomFirst`'s headroom rung**

Add to `test/continuous-test-suite-proxy.ts`:

```ts
async function testCompareHeadroomFirstPrefersMoreHeadroom(): Promise<boolean> {
  const lowHeadroom: ProxyPassthroughAccount = {
    key: "anthropic:low",
    label: "low",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const highHeadroom: ProxyPassthroughAccount = {
    key: "anthropic:high",
    label: "high",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [lowHeadroom.key, makeSortMetrics({ sessionUsed: 0.9, weeklyUsed: 0.9 })],
    [highHeadroom.key, makeSortMetrics({ sessionUsed: 0.1, weeklyUsed: 0.1 })],
  ]);
  const [sign, reason] = compareHeadroomFirst(
    lowHeadroom,
    highHeadroom,
    metricsByKey,
    undefined,
  );
  if (sign <= 0 || reason !== "headroom") {
    log(
      `compareHeadroomFirst headroom branch wrong — sign=${sign} reason=${reason}`,
      "red",
    );
    return false;
  }
  return true;
}

async function testCompareHeadroomFirstUnknownHeadroomSortsLast(): Promise<boolean> {
  const known: ProxyPassthroughAccount = {
    key: "anthropic:known",
    label: "known",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const unknown: ProxyPassthroughAccount = {
    key: "anthropic:unknown",
    label: "unknown",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [known.key, makeSortMetrics({ sessionUsed: 0.5, weeklyUsed: 0.5 })],
    [unknown.key, makeSortMetrics({ sessionUsed: null, weeklyUsed: null })],
  ]);
  const [sign, reason] = compareHeadroomFirst(
    unknown,
    known,
    metricsByKey,
    undefined,
  );
  if (sign <= 0 || reason !== "headroom") {
    log(
      "expected the unknown-headroom account to sort after the known one",
      "red",
    );
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `compareHeadroomFirst` is not exported yet.

- [ ] **Step 3: Add `compareHeadroomFirst`**

Append to `src/lib/proxy/accountRanking.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `applyAffinityAndPrimary`'s precedence**

```ts
async function testApplyAffinityTakesPrecedenceOverPreferPrimary(): Promise<boolean> {
  const { applyAffinityAndPrimary } =
    await import("../src/lib/proxy/accountRanking.js");
  const bound: ProxyPassthroughAccount = {
    key: "anthropic:bound",
    label: "bound",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const primary: ProxyPassthroughAccount = {
    key: "anthropic:primary",
    label: "primary",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [bound.key, makeSortMetrics({})],
    [primary.key, makeSortMetrics({})],
  ]);
  const result = applyAffinityAndPrimary({
    orderedAccounts: [primary, bound],
    metricsByKey,
    affinityKey: bound.key,
    primaryKey: primary.key,
    preferPrimary: true,
  });
  if (
    result.reason !== "session_affinity" ||
    result.orderedAccounts[0]?.key !== bound.key
  ) {
    log("expected session affinity to win over prefer-primary", "red");
    return false;
  }
  return true;
}

async function testApplyAffinitySkipsUnusableBoundAccount(): Promise<boolean> {
  const { applyAffinityAndPrimary } =
    await import("../src/lib/proxy/accountRanking.js");
  const bound: ProxyPassthroughAccount = {
    key: "anthropic:bound",
    label: "bound",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const other: ProxyPassthroughAccount = {
    key: "anthropic:other",
    label: "other",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [bound.key, makeSortMetrics({ usable: false })],
    [other.key, makeSortMetrics({})],
  ]);
  const result = applyAffinityAndPrimary({
    orderedAccounts: [bound, other],
    metricsByKey,
    affinityKey: bound.key,
  });
  if (result.reason !== null || result.affinitySkippedReason !== "unusable") {
    log("expected affinity to be skipped as unusable", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `applyAffinityAndPrimary` is not exported yet.

- [ ] **Step 7: Add `applyAffinityAndPrimary`**

```ts
/**
 * Session affinity, then prefer-primary: move the eligible one to the front
 * of an already-ordered list. Shared by rankAccounts (for the quota-ordered
 * path) and the route directly (for round-robin/quota-off fill-first, where
 * the base order is never comparator-sorted but affinity/prefer-primary must
 * still apply per spec).
 */
export function applyAffinityAndPrimary(args: {
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>;
  affinityKey?: string;
  primaryKey?: string;
  preferPrimary?: boolean;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  reason: "session_affinity" | "preferred_primary" | null;
  affinitySkippedReason: "unusable" | "session_saturated" | null;
} {
  const {
    orderedAccounts,
    metricsByKey,
    affinityKey,
    primaryKey,
    preferPrimary = false,
  } = args;
  const isEligible = (key: string): boolean => {
    const m = metricsByKey.get(key);
    return !!m && m.usable && !m.saturated;
  };

  let affinitySkippedReason: "unusable" | "session_saturated" | null = null;
  if (affinityKey) {
    const bound = orderedAccounts.find((a) => a.key === affinityKey);
    if (bound && isEligible(affinityKey)) {
      return {
        orderedAccounts: [
          bound,
          ...orderedAccounts.filter((a) => a.key !== affinityKey),
        ],
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
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing test for extended `rankAccounts`**

```ts
async function testRankAccountsHeadroomFirstWithAffinity(): Promise<boolean> {
  const bound: ProxyPassthroughAccount = {
    key: "anthropic:bound",
    label: "bound",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const highHeadroom: ProxyPassthroughAccount = {
    key: "anthropic:high",
    label: "high",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const metricsByKey = new Map([
    [bound.key, makeSortMetrics({ sessionUsed: 0.8, weeklyUsed: 0.8 })],
    [highHeadroom.key, makeSortMetrics({ sessionUsed: 0.1, weeklyUsed: 0.1 })],
  ]);
  const result = rankAccounts({
    accounts: [highHeadroom, bound],
    metricsByKey,
    primaryKey: undefined,
    ranking: "headroom-first",
    affinityKey: bound.key,
  });
  if (
    result.reason !== "session_affinity" ||
    result.orderedAccounts[0]?.key !== bound.key
  ) {
    log("expected affinity to override headroom-first ranking", "red");
    return false;
  }
  return true;
}

async function testRankAccountsDefaultsToExpiryFirstWhenRankingOmitted(): Promise<boolean> {
  const accounts = buildRankingFixtureAccounts();
  const metricsByKey = buildRankingFixtureMetrics();
  const withRanking = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey: "anthropic:home",
    ranking: "expiry-first",
  });
  const withoutRanking = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey: "anthropic:home",
  });
  const same =
    withRanking.orderedAccounts.map((a) => a.key).join(",") ===
    withoutRanking.orderedAccounts.map((a) => a.key).join(",");
  if (!same) {
    log("expected omitted ranking to default to expiry-first", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 10: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `rankAccounts` doesn't yet accept `ranking`/`affinityKey`/`preferPrimary`.

- [ ] **Step 11: Extend `rankAccounts`**

Replace the Task 1 version:

```ts
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
  affinitySkippedReason: "unusable" | "session_saturated" | null;
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
```

- [ ] **Step 12: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS, and re-run Task 4's `testAccountRankingMatchesRouteWrapper` to confirm the default-args behaviour is still identical.

- [ ] **Step 13: Write the failing test for `applySpill`**

```ts
async function testApplySpillMovesAccountUnderThreshold(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const first: ProxyPassthroughAccount = {
    key: "anthropic:first",
    label: "first",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const second: ProxyPassthroughAccount = {
    key: "anthropic:second",
    label: "second",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const inflightByKey = new Map([
    [first.key, 25],
    [second.key, 3],
  ]);
  const result = applySpill({
    orderedAccounts: [first, second],
    inflightByKey,
    spillInflight: 20,
  });
  if (
    result.orderedAccounts[0]?.key !== second.key ||
    result.spill?.from !== first.key ||
    result.spill?.to !== second.key ||
    result.spill?.inflight !== 25
  ) {
    log(
      "expected spill to move the under-threshold account to the front",
      "red",
    );
    return false;
  }
  return true;
}

async function testApplySpillNoOpBelowThreshold(): Promise<boolean> {
  const { applySpill } = await import("../src/lib/proxy/accountRanking.js");
  const first: ProxyPassthroughAccount = {
    key: "anthropic:first",
    label: "first",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const second: ProxyPassthroughAccount = {
    key: "anthropic:second",
    label: "second",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const inflightByKey = new Map([
    [first.key, 5],
    [second.key, 0],
  ]);
  const result = applySpill({
    orderedAccounts: [first, second],
    inflightByKey,
    spillInflight: 20,
  });
  if (result.spill !== null || result.orderedAccounts[0]?.key !== first.key) {
    log("expected no spill when the first account is under threshold", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 14: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `applySpill` is not exported yet.

- [ ] **Step 15: Add `applySpill`**

```ts
/**
 * For a request without an active binding: if the current first choice is
 * already at spillInflight in-flight requests, try the next usable account
 * below that threshold. `spill.inflight` records the SOURCE account's count
 * — the number that triggered the move, not the destination's.
 */
export function applySpill(args: {
  orderedAccounts: ProxyPassthroughAccount[];
  inflightByKey: ReadonlyMap<string, number>;
  spillInflight: number;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  spill: { from: string; to: string; inflight: number } | null;
} {
  const { orderedAccounts, inflightByKey, spillInflight } = args;
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
    (account) => (inflightByKey.get(account.key) ?? 0) < spillInflight,
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
```

- [ ] **Step 16: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 17: Add a seeded randomized transitivity check**

```ts
async function testRankAccountsIsDeterministicAndTransitive(): Promise<boolean> {
  // Fixed seed (mulberry32) so failures reproduce without quoting inputs.
  let seed = 0x2f6e2b1;
  const rand = (): number => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (const ranking of ["expiry-first", "headroom-first"] as const) {
    for (let trial = 0; trial < 20; trial += 1) {
      const accounts: ProxyPassthroughAccount[] = Array.from(
        { length: 6 },
        (_, i) => ({
          key: `anthropic:acct-${i}`,
          label: `acct-${i}`,
          type: "oauth",
        }),
      ) as ProxyPassthroughAccount[];
      const metricsByKey = new Map(
        accounts.map((a) => [
          a.key,
          makeSortMetrics({
            usable: rand() > 0.1,
            saturated: rand() > 0.7,
            scopedSaturated: rand() > 0.85,
            sessionUsed: rand(),
            weeklyUsed: rand(),
            weeklyReset: Math.floor(rand() * 1_000_000),
            coolingUntil: rand() > 0.9 ? Math.floor(rand() * 1_000_000) : 0,
          }),
        ]),
      );
      const first = rankAccounts({
        accounts,
        metricsByKey,
        primaryKey: undefined,
        ranking,
      });
      const shuffled = [...accounts].sort(() => rand() - 0.5);
      const second = rankAccounts({
        accounts: shuffled,
        metricsByKey,
        primaryKey: undefined,
        ranking,
      });
      const firstKeys = first.orderedAccounts.map((a) => a.key).join(",");
      const secondKeys = second.orderedAccounts.map((a) => a.key).join(",");
      if (firstKeys !== secondKeys) {
        log(`${ranking} order depends on input order at trial ${trial}`, "red");
        return false;
      }
    }
  }
  return true;
}
```

- [ ] **Step 18: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 19: Register every new test from this task**

```ts
  { name: "compareHeadroomFirst: prefers more headroom", fn: testCompareHeadroomFirstPrefersMoreHeadroom, category: "proxy-primary" },
  { name: "compareHeadroomFirst: unknown headroom sorts last", fn: testCompareHeadroomFirstUnknownHeadroomSortsLast, category: "proxy-primary" },
  { name: "applyAffinityAndPrimary: affinity beats prefer-primary", fn: testApplyAffinityTakesPrecedenceOverPreferPrimary, category: "proxy-primary" },
  { name: "applyAffinityAndPrimary: skips unusable bound account", fn: testApplyAffinitySkipsUnusableBoundAccount, category: "proxy-primary" },
  { name: "rankAccounts: headroom-first with affinity", fn: testRankAccountsHeadroomFirstWithAffinity, category: "proxy-primary" },
  { name: "rankAccounts: omitted ranking defaults to expiry-first", fn: testRankAccountsDefaultsToExpiryFirstWhenRankingOmitted, category: "proxy-primary" },
  { name: "applySpill: moves under-threshold account to front", fn: testApplySpillMovesAccountUnderThreshold, category: "proxy-primary" },
  { name: "applySpill: no-op below threshold", fn: testApplySpillNoOpBelowThreshold, category: "proxy-primary" },
  { name: "rankAccounts: deterministic and transitive (seeded)", fn: testRankAccountsIsDeterministicAndTransitive, category: "proxy-primary" },
```

- [ ] **Step 20: Commit (amend)**

```bash
git add src/lib/proxy/accountRanking.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 12: `orderAccountsByQuotaWithMetrics` policy extension and `buildRoutingDecision`'s `policySelectionReason`

**Files:**

- Modify: `src/lib/server/routes/claudeProxyRoutes.ts:2211-2240` (`orderAccountsByQuotaWithMetrics`), `:2381-2515` (`buildRoutingDecision`), `:12292+` (`__testHooks.buildQuotaRoutingDecision`)

**Interfaces:**

- Consumes: `rankAccounts`'s extended signature (Task 11).
- Produces: `orderAccountsByQuotaWithMetrics(..., policy?: { ranking?, affinityKey?, preferPrimary? })` returns `{ orderedAccounts, metricsByKey, reason, affinitySkippedReason }`; `buildRoutingDecision(...)` accepts `policySelectionReason?`, `policy?`, `affinity?`, `spill?`.

- [ ] **Step 1: Write the failing test for `buildRoutingDecision`'s override**

```ts
async function testBuildQuotaRoutingDecisionUsesPolicySelectionReason(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const now = Date.now();
  const accounts: ProxyPassthroughAccount[] = [
    { key: "anthropic:a", label: "a", type: "oauth" },
    { key: "anthropic:b", label: "b", type: "oauth" },
  ] as ProxyPassthroughAccount[];
  for (const account of accounts) {
    __testHooks.setAccountRuntimeState(account.key, {
      quota: makeQuota({}),
    });
  }
  const decision = __testHooks.buildQuotaRoutingDecision(
    accounts,
    now,
    undefined,
    0.97,
    5 * 60 * 1000,
    undefined,
    { affinityKey: "anthropic:b" },
  );
  __testHooks.resetAllRuntimeState();
  if (decision?.selectionReason !== "session_affinity") {
    log(
      `expected selectionReason to be overridden by the policy reason, got ${decision?.selectionReason}`,
      "red",
    );
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `buildQuotaRoutingDecision` doesn't accept a `policy` argument yet.

- [ ] **Step 3: Extend `orderAccountsByQuotaWithMetrics`**

```ts
function orderAccountsByQuotaWithMetrics(
  accounts: ProxyPassthroughAccount[],
  now: number,
  primaryKey: string | undefined,
  sessionSoftLimit: number,
  sessionResetToleranceMs: number,
  requestedModel?: string,
  policy?: {
    ranking?: ProxyAccountRankingPolicy;
    affinityKey?: string;
    preferPrimary?: boolean;
  },
): {
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: Map<string, ProxyAccountSortMetrics>;
  reason: ProxyAccountRoutingReason;
  affinitySkippedReason: "unusable" | "session_saturated" | null;
} {
  const metricsByKey = new Map(
    accounts.map((account) => [
      account.key,
      accountSortMetrics(
        account.key,
        now,
        sessionSoftLimit,
        sessionResetToleranceMs,
        requestedModel,
      ),
    ]),
  );
  const { orderedAccounts, reason, affinitySkippedReason } = rankAccounts({
    accounts,
    metricsByKey,
    primaryKey,
    ranking: policy?.ranking,
    affinityKey: policy?.affinityKey,
    preferPrimary: policy?.preferPrimary,
  });
  return { orderedAccounts, metricsByKey, reason, affinitySkippedReason };
}
```

`orderAccountsByQuota` (the label-only wrapper) is untouched — it only ever reads `.orderedAccounts` off the return value, which keeps working.

- [ ] **Step 4: Extend `buildRoutingDecision`**

Add three new optional fields to its `args` type and use them in the `quotaOrdered` branch and the return object:

```ts
function buildRoutingDecision(args: {
  accounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: ReadonlyMap<string, ProxyAccountSortMetrics>;
  evaluatedAt: number;
  strategy: "round-robin" | "fill-first";
  primaryKey: string | undefined;
  quotaRoutingEnabled: boolean;
  quotaOrdered: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
  rotationOffset: number;
  policySelectionReason?: ProxyAccountRoutingReason;
  policy?: ProxyRoutingPolicySnapshot;
  affinity?: ProxyAccountRoutingAffinityEvidence;
  spill?: ProxyAccountRoutingSpillEvidence;
}): ProxyAccountRoutingDecision | undefined {
```

In the mode/selectionReason block:

```ts
  } else if (quotaOrdered) {
    mode = "quota";
    selectionReason =
      args.policySelectionReason ??
      compareExpiryFirst(orderedAccounts[0], orderedAccounts[1], metricsByKey, primaryKey)[1];
```

In the returned object, append after `candidates,`:

```ts
    candidates,
    ...(args.policy ? { policy: args.policy } : {}),
    ...(args.affinity ? { affinity: args.affinity } : {}),
    ...(args.spill ? { spill: args.spill } : {}),
  };
```

Omitting `policySelectionReason`/`policy`/`affinity`/`spill` reproduces PR1's exact output — this preserves every existing call site (including Task 6's replay assumptions) without modification.

- [ ] **Step 5: Extend `__testHooks.buildQuotaRoutingDecision`**

```ts
  buildQuotaRoutingDecision: (
    accounts, now, primaryKey,
    sessionSoftLimit = getSessionSoftLimit(),
    sessionResetToleranceMs = getSessionResetToleranceMs(),
    requestedModel?,
    policy?: {
      ranking?: ProxyAccountRankingPolicy;
      affinityKey?: string;
      preferPrimary?: boolean;
    },
  ): ProxyAccountRoutingDecision | undefined => {
    const order = orderAccountsByQuotaWithMetrics(
      accounts, now, primaryKey, sessionSoftLimit, sessionResetToleranceMs, requestedModel, policy,
    );
    return buildRoutingDecision({
      accounts, orderedAccounts: order.orderedAccounts, metricsByKey: order.metricsByKey,
      evaluatedAt: now, strategy: "fill-first", primaryKey, quotaRoutingEnabled: true,
      quotaOrdered: accounts.length > 1, sessionSoftLimit, sessionResetToleranceMs, rotationOffset: 0,
      policySelectionReason: order.reason,
    });
  },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 7: Re-run the Task 2 route-order tests to confirm no regression**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS — `testOrderAccountsByQuota` and `runWeeklyExpiryOrderingCases` never pass a `policy` argument, so they exercise the exact PR1 path.

- [ ] **Step 8: Register the new test**

```ts
  { name: "buildQuotaRoutingDecision: uses policySelectionReason override", fn: testBuildQuotaRoutingDecisionUsesPolicySelectionReason, category: "proxy-primary" },
```

- [ ] **Step 9: Commit (amend)**

```bash
git add src/lib/server/routes/claudeProxyRoutes.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 13: Thread the Claude Code session id through `loadClaudeProxyAccounts`

**Files:**

- Modify: `src/lib/server/routes/claudeProxyRoutes.ts:4618-4641` (signature), `:4965-5023` (tail), `:9749-9888` (`handleAnthropicRoutedClaudeRequest` destructure)
- Modify: `src/lib/types/proxy.ts:1288-1298` (`LoadedClaudeAccountContext`)

**Interfaces:**

- Produces: `LoadedClaudeAccountContext.sessionId?: string`. Task 14 consumes it as `selectClaudeProxyAccountOrder`'s `sessionId` argument.

- [ ] **Step 1: Write the failing test asserting `sessionId` is threaded through**

```ts
async function testLoadClaudeProxyAccountsExposesSessionId(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  if (typeof __testHooks.extractSnapshotBodySessionIdForTests !== "function") {
    log("expected a test hook exposing the resolved sessionId path", "red");
    return false;
  }
  return true;
}
```

(Rather than exercising the full route — which needs a live account pool and is covered end-to-end by Task 19 — this task's own test only pins the plumbing hook that Task 19 depends on. Add the hook in Step 4.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL.

- [ ] **Step 3: Move `extractSnapshotBody` earlier and add `sessionId` to the returned context**

In `loadClaudeProxyAccounts` (currently ending at `claudeProxyRoutes.ts:4965-5023`), the call:

```ts
const clientHeaders = ctx.headers ?? {};
const clientSnapshotBody = extractSnapshotBody(body);

return {
  accounts,
  enabledAccounts,
  orderedAccounts,
  bodyStr,
  requestStart,
  toolCount,
  url,
  clientHeaders,
  isClaudeClientRequest: isLikelyClaudeClient(
    clientHeaders,
    clientSnapshotBody,
  ),
};
```

currently runs `extractSnapshotBody(body)` **after** `selectClaudeProxyAccountOrder` has already been called (`claudeProxyRoutes.ts:4978`). Move the extraction up so `sessionId` is available before that call. Replace the whole tail:

```ts
  const clientHeaders = ctx.headers ?? {};
  const clientSnapshotBody = extractSnapshotBody(body);

  const { orderedAccounts, metricsByKey } = selectClaudeProxyAccountOrder({
    enabledAccounts, accountStrategy, primaryAccountKey, quotaRoutingEnabled,
    sessionSoftLimit, sessionResetToleranceMs,
    requestedModel: typeof body.model === "string" ? body.model : undefined,
    sessionId: clientSnapshotBody?.sessionId,
    ranking, preferPrimary, sessionAffinityEnabled, sessionAffinityIdleTtlMs, spillInflight,
    setRoutingDecision,
  });
  if (accountStrategy === "fill-first" && quotaRoutingEnabled && enabledAccounts.length > 1) {
    scheduleAdaptiveQuotaRefreshes(enabledAccounts, orderedAccounts, sessionSoftLimit, metricsByKey);
  }

  const normalizedAnthropicBody = normalizeClaudeRequestForAnthropic(body);
  const bodyStr = JSON.stringify(normalizedAnthropicBody);
  const requestStart = Date.now();
  const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const url = "https://api.anthropic.com/v1/messages?beta=true";

  return {
    accounts, enabledAccounts, orderedAccounts, bodyStr, requestStart, toolCount, url, clientHeaders,
    isClaudeClientRequest: isLikelyClaudeClient(clientHeaders, clientSnapshotBody),
    sessionId: clientSnapshotBody?.sessionId,
  };
}
```

(`ranking`, `preferPrimary`, `sessionAffinityEnabled`, `sessionAffinityIdleTtlMs`, `spillInflight` are added to `loadClaudeProxyAccounts`'s own `args`/destructure in Task 15, alongside `selectClaudeProxyAccountOrder`'s rewrite in Task 14 — this step only moves the extraction and adds the plumbing that depends on it existing.)

- [ ] **Step 4: Extend `LoadedClaudeAccountContext` and add the pinning test hook**

In `src/lib/types/proxy.ts`:

```ts
export type LoadedClaudeAccountContext = {
  accounts: ProxyPassthroughAccount[];
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  bodyStr: string;
  requestStart: number;
  toolCount: number;
  url: string;
  clientHeaders: Record<string, string | undefined>;
  isClaudeClientRequest: boolean;
  sessionId?: string;
};
```

In `__testHooks`:

```ts
  extractSnapshotBodySessionIdForTests: (body: unknown): string | undefined =>
    extractSnapshotBody(body)?.sessionId,
```

- [ ] **Step 5: Add `sessionId` to `handleAnthropicRoutedClaudeRequest`'s destructure**

```ts
const {
  accounts,
  enabledAccounts,
  orderedAccounts,
  bodyStr,
  requestStart,
  toolCount,
  url,
  clientHeaders,
  isClaudeClientRequest,
  sessionId,
} = loadedAccounts;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS for the new hook test; expect `pnpm run check` to still fail until Task 14/15 supply `ranking`/`preferPrimary`/etc. to `selectClaudeProxyAccountOrder` and `loadClaudeProxyAccounts`'s own args — that's expected and cleared by Task 15.

- [ ] **Step 7: Register the new test**

```ts
  { name: "loadClaudeProxyAccounts: exposes resolved sessionId", fn: testLoadClaudeProxyAccountsExposesSessionId, category: "proxy-infra" },
```

- [ ] **Step 8: Commit (amend)**

```bash
git add src/lib/server/routes/claudeProxyRoutes.ts src/lib/types/proxy.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 14: Rewrite `selectClaudeProxyAccountOrder` to apply the full precedence chain

**Files:**

- Modify: `src/lib/server/routes/claudeProxyRoutes.ts:2517-2624`

**Interfaces:**

- Consumes: `applyAffinityAndPrimary`, `applySpill`, `orderAccountsByQuotaWithMetrics` (extended, Task 12), `sessionAffinity.get` (Task 10), `getAccountInflight` (Task 3).
- Produces: `selectClaudeProxyAccountOrder`'s new signature, consumed by Task 15's threading through `loadClaudeProxyAccounts`/`handleAnthropicRoutedClaudeRequest`.

- [ ] **Step 1: Write the failing test for the "quota routing off, affinity still applies" case (Review Focus item 1)**

```ts
async function testAffinityAppliesWithQuotaRoutingDisabled(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const { sessionAffinity } =
    await import("../src/lib/proxy/sessionAffinity.js");
  sessionAffinity.clear();
  const accounts: ProxyPassthroughAccount[] = [
    { key: "anthropic:a", label: "a", type: "oauth" },
    { key: "anthropic:b", label: "b", type: "oauth" },
  ] as ProxyPassthroughAccount[];
  for (const account of accounts) {
    __testHooks.setAccountRuntimeState(account.key, { quota: makeQuota({}) });
  }
  sessionAffinity.bind("test-session", "anthropic:b", Date.now());
  const decisions: ProxyAccountRoutingDecision[] = [];
  const { orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests(
    {
      enabledAccounts: accounts,
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: false,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "test-session",
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    },
  );
  sessionAffinity.clear();
  __testHooks.resetAllRuntimeState();
  if (orderedAccounts[0]?.key !== "anthropic:b") {
    log("expected affinity to apply even with quota routing disabled", "red");
    return false;
  }
  if (decisions[0]?.affinity?.applied !== true) {
    log("expected the routing decision to record affinity as applied", "red");
    return false;
  }
  return true;
}
```

This requires a new `__testHooks.selectClaudeProxyAccountOrderForTests` — added in Step 4, since `selectClaudeProxyAccountOrder` itself is route-local.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL.

- [ ] **Step 3: Write the failing test for "thrown spill on the quota-off path restores the base order" (Review Focus item 1)**

The non-quota-ordered branch's catch must not leave a partial policy reorder
in place. Bind session affinity so `applyAffinityAndPrimary` genuinely
reorders `orderedAccounts` (`reason: "session_affinity"`), then force
`maybeSpill` to throw regardless of that reason — its own guard normally
skips `session_affinity`/`preferred_primary`, so a deterministic test-only
hook (`forceSpillThrowForTests`, added in Step 5) is the only way to reach
the throwing branch on this reason. The assertion is that the pre-policy
order is served, not the partial `[b, a]` reorder:

```ts
async function testSpillThrowOnQuotaOffPathRestoresBaseOrder(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const { sessionAffinity } =
    await import("../src/lib/proxy/sessionAffinity.js");
  sessionAffinity.clear();
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
  sessionAffinity.bind("session-spill-throw", accountB.key, Date.now());
  __testHooks.setForceSpillThrowForTests(true);
  const decisions: ProxyAccountRoutingDecision[] = [];
  let orderedAccounts: ProxyPassthroughAccount[] = [];
  try {
    ({ orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests({
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: false,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "session-spill-throw",
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 5,
      setRoutingDecision: (decision) => decisions.push(decision),
    }));
  } finally {
    __testHooks.setForceSpillThrowForTests(false);
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
  }
  if (orderedAccounts[0]?.key !== accountA.key) {
    log(
      "expected a thrown spill to restore the pre-policy base order, not the partial reorder",
      "red",
    );
    return false;
  }
  if (decisions[0]?.selectionReason !== "routing_policy_error") {
    log("expected selectionReason to record routing_policy_error", "red");
    return false;
  }
  return true;
}
```

This requires `__testHooks.setForceSpillThrowForTests` — added in Step 7,
alongside `forceSpillThrowForTests`'s declaration in Step 5 and its check
inside `maybeSpill` in Step 6.

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL (the hook doesn't exist yet, and even once it does, the
pre-fix catch block doesn't restore `orderedAccounts`).

- [ ] **Step 5: Add the once-per-worker failure-mode logger and the test-only spill-throw hook**

Near `selectClaudeProxyAccountOrder`'s current location:

```ts
let routingPolicyErrorLogged = false;
function logRoutingPolicyErrorOnce(error: unknown): void {
  if (routingPolicyErrorLogged) {
    return;
  }
  routingPolicyErrorLogged = true;
  logger.always(
    `[proxy] routing policy threw; falling back to expiry-first order: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// Test-only: forces maybeSpill() to throw unconditionally, including on
// reasons ("session_affinity", "preferred_primary") its own guard would
// otherwise skip. This is the only way to deterministically exercise the
// non-quota-ordered branch's catch after a genuine policy reorder, since
// applyAffinityAndPrimary returns the same array reference unchanged
// whenever neither affinity nor preferred-primary fires.
let forceSpillThrowForTests = false;
```

- [ ] **Step 6: Rewrite `selectClaudeProxyAccountOrder`**

```ts
function selectClaudeProxyAccountOrder(args: {
  enabledAccounts: ProxyPassthroughAccount[];
  accountStrategy: "round-robin" | "fill-first";
  primaryAccountKey: string | undefined;
  quotaRoutingEnabled: boolean;
  sessionSoftLimit: number;
  sessionResetToleranceMs: number;
  requestedModel?: string;
  sessionId?: string;
  ranking: ProxyAccountRankingPolicy;
  preferPrimary: boolean;
  sessionAffinityEnabled: boolean;
  sessionAffinityIdleTtlMs: number;
  spillInflight: number;
  setRoutingDecision: (decision: ProxyAccountRoutingDecision) => void;
}): {
  orderedAccounts: ProxyPassthroughAccount[];
  metricsByKey: Map<string, ProxyAccountSortMetrics>;
} {
  const {
    enabledAccounts,
    accountStrategy,
    primaryAccountKey,
    quotaRoutingEnabled,
    sessionSoftLimit,
    sessionResetToleranceMs,
    requestedModel,
    sessionId,
    ranking,
    preferPrimary,
    sessionAffinityEnabled,
    sessionAffinityIdleTtlMs,
    spillInflight,
    setRoutingDecision,
  } = args;
  let orderedAccounts = [...enabledAccounts];
  const evaluatedAt = Date.now();
  let metricsByKey: Map<string, ProxyAccountSortMetrics>;
  let rotationOffset = 0;
  const quotaOrdered =
    accountStrategy === "fill-first" &&
    orderedAccounts.length > 1 &&
    quotaRoutingEnabled;
  const policiesApply =
    accountStrategy === "fill-first" && orderedAccounts.length > 1;

  let policySelectionReason: ProxyAccountRoutingReason | undefined;
  let policy: ProxyRoutingPolicySnapshot | undefined;
  let affinity: ProxyAccountRoutingAffinityEvidence | undefined;
  let spill: ProxyAccountRoutingSpillEvidence | undefined;

  const resolveAffinityKey = (): string | undefined =>
    sessionAffinityEnabled && sessionId
      ? sessionAffinity.get(sessionId, evaluatedAt, sessionAffinityIdleTtlMs)
      : undefined;

  const buildAffinityEvidence = (
    boundAccountKey: string | undefined,
    applied: boolean,
    skippedFromPrecedence: "unusable" | "session_saturated" | null,
  ): ProxyAccountRoutingAffinityEvidence => ({
    sessionBound: !!boundAccountKey,
    boundAccount:
      (boundAccountKey &&
        enabledAccounts.find((a) => a.key === boundAccountKey)?.label) ??
      null,
    applied,
    skippedReason: !sessionAffinityEnabled
      ? "disabled"
      : !sessionId
        ? "no_session"
        : !boundAccountKey
          ? "expired"
          : applied
            ? null
            : skippedFromPrecedence,
  });

  const maybeSpill = (reason: ProxyAccountRoutingReason): void => {
    if (forceSpillThrowForTests) {
      throw new Error("forced failure for spill throw test");
    }
    if (
      spillInflight <= 0 ||
      reason === "session_affinity" ||
      reason === "preferred_primary"
    ) {
      return;
    }
    const inflightByKey = new Map(
      orderedAccounts.map((account) => [
        account.key,
        getAccountInflight(account.key),
      ]),
    );
    const spillResult = applySpill({
      orderedAccounts,
      inflightByKey,
      spillInflight,
    });
    if (spillResult.spill) {
      orderedAccounts = spillResult.orderedAccounts;
      const fromLabel =
        enabledAccounts.find((a) => a.key === spillResult.spill!.from)?.label ??
        spillResult.spill!.from;
      const toLabel =
        enabledAccounts.find((a) => a.key === spillResult.spill!.to)?.label ??
        spillResult.spill!.to;
      spill = {
        from: fromLabel,
        to: toLabel,
        inflight: spillResult.spill.inflight,
      };
      policySelectionReason = "spill_inflight";
    }
  };

  if (!quotaOrdered && accountStrategy === "fill-first") {
    // A hot-reloaded primary change must apply to this request.
    maybeResetPrimaryToHome(enabledAccounts, primaryAccountKey);
  }

  if (quotaOrdered) {
    policy = {
      ranking,
      preferPrimary,
      sessionAffinity: sessionAffinityEnabled,
      sessionAffinityIdleTtlMs,
      spillInflight,
    };
    try {
      const boundAccountKey = resolveAffinityKey();
      const quotaOrder = orderAccountsByQuotaWithMetrics(
        enabledAccounts,
        evaluatedAt,
        primaryAccountKey,
        sessionSoftLimit,
        sessionResetToleranceMs,
        requestedModel,
        { ranking, affinityKey: boundAccountKey, preferPrimary },
      );
      orderedAccounts = quotaOrder.orderedAccounts;
      metricsByKey = quotaOrder.metricsByKey;
      policySelectionReason = quotaOrder.reason;
      affinity = buildAffinityEvidence(
        boundAccountKey,
        quotaOrder.reason === "session_affinity",
        quotaOrder.affinitySkippedReason,
      );
      maybeSpill(quotaOrder.reason);
    } catch (error) {
      logRoutingPolicyErrorOnce(error);
      const fallback = orderAccountsByQuotaWithMetrics(
        enabledAccounts,
        evaluatedAt,
        primaryAccountKey,
        sessionSoftLimit,
        sessionResetToleranceMs,
        requestedModel,
      );
      orderedAccounts = fallback.orderedAccounts;
      metricsByKey = fallback.metricsByKey;
      policySelectionReason = "routing_policy_error";
      affinity = undefined;
      spill = undefined;
    }
    if (logger.shouldLog("debug")) {
      logger.debug(
        `[proxy] quota-ordered fill sequence: ${orderedAccounts.map((a) => a.label).join(" → ")}`,
      );
    }
  } else {
    if (
      accountStrategy === "round-robin" &&
      orderedAccounts.length !== lastKnownAccountCount
    ) {
      primaryAccountIndex = resolveHomeIndex(
        orderedAccounts,
        primaryAccountKey,
      );
      lastKnownAccountCount = orderedAccounts.length;
    }
    if (orderedAccounts.length > 1) {
      rotationOffset = primaryAccountIndex % orderedAccounts.length;
      if (accountStrategy === "round-robin") {
        primaryAccountIndex =
          (primaryAccountIndex + 1) % orderedAccounts.length;
      }
      if (rotationOffset > 0) {
        const head = orderedAccounts.splice(0, rotationOffset);
        orderedAccounts.push(...head);
      }
    }
    metricsByKey = new Map(
      enabledAccounts.map((account) => [
        account.key,
        accountSortMetrics(
          account.key,
          evaluatedAt,
          sessionSoftLimit,
          sessionResetToleranceMs,
          requestedModel,
        ),
      ]),
    );

    if (policiesApply) {
      // Captured before the try so the catch can restore it: orderedAccounts
      // is reassigned to the policy-reordered list below, and a throw from
      // applyAffinityAndPrimary or maybeSpill (spill's admission-lease read)
      // must not leave that partial reorder in place while the decision
      // reports routing_policy_error.
      const baseOrder = [...orderedAccounts];
      policy = {
        ranking,
        preferPrimary,
        sessionAffinity: sessionAffinityEnabled,
        sessionAffinityIdleTtlMs,
        spillInflight,
      };
      try {
        const boundAccountKey = resolveAffinityKey();
        const precedence = applyAffinityAndPrimary({
          orderedAccounts,
          metricsByKey,
          affinityKey: boundAccountKey,
          primaryKey: primaryAccountKey,
          preferPrimary,
        });
        orderedAccounts = precedence.orderedAccounts;
        if (precedence.reason) {
          policySelectionReason = precedence.reason;
        }
        affinity = buildAffinityEvidence(
          boundAccountKey,
          precedence.reason === "session_affinity",
          precedence.affinitySkippedReason,
        );
        if (precedence.reason) {
          maybeSpill(precedence.reason);
        } else {
          maybeSpill("insertion_order");
        }
      } catch (error) {
        logRoutingPolicyErrorOnce(error);
        orderedAccounts = baseOrder;
        policySelectionReason = "routing_policy_error";
        affinity = undefined;
        spill = undefined;
      }
    }
  }

  const routingDecision = buildRoutingDecision({
    accounts: enabledAccounts,
    orderedAccounts,
    metricsByKey,
    evaluatedAt,
    strategy: accountStrategy,
    primaryKey: primaryAccountKey,
    quotaRoutingEnabled,
    quotaOrdered,
    sessionSoftLimit,
    sessionResetToleranceMs,
    rotationOffset,
    policySelectionReason,
    policy,
    affinity,
    spill,
  });
  if (routingDecision) {
    setRoutingDecision(routingDecision);
  }
  return { orderedAccounts, metricsByKey };
}
```

- [ ] **Step 7: Add the test-only wrapper hooks**

In `__testHooks`:

```ts
  selectClaudeProxyAccountOrderForTests: selectClaudeProxyAccountOrder,
  setForceSpillThrowForTests: (value: boolean): void => {
    forceSpillThrowForTests = value;
  },
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS (both `testAffinityAppliesWithQuotaRoutingDisabled` and
`testSpillThrowOnQuotaOffPathRestoresBaseOrder`).

- [ ] **Step 9: Register the new tests**

```ts
  { name: "selectClaudeProxyAccountOrder: affinity applies with quota routing disabled", fn: testAffinityAppliesWithQuotaRoutingDisabled, category: "proxy-primary" },
  { name: "selectClaudeProxyAccountOrder: thrown spill on quota-off path restores base order", fn: testSpillThrowOnQuotaOffPathRestoresBaseOrder, category: "proxy-primary" },
```

- [ ] **Step 10: Commit (amend)**

```bash
git add src/lib/server/routes/claudeProxyRoutes.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 15: Thread the five policy values through the call chain to `/v1/messages`

**Files:**

- Modify: `src/lib/server/routes/claudeProxyRoutes.ts:4618-4641` (`loadClaudeProxyAccounts` args), `:9749-9888` (`handleAnthropicRoutedClaudeRequest` args + call site), `:10717-10749` (`requestRouting` fallback literal), `:10829-10845` (call into `handleAnthropicRoutedClaudeRequest`)

**Interfaces:**

- Consumes: `ProxyRuntimeConfigSnapshot`'s five new fields (Task 9).
- Produces: every function in the chain now accepts and forwards `ranking`, `preferPrimary`, `sessionAffinityEnabled`, `sessionAffinityIdleTtlMs`, `spillInflight`.

- [ ] **Step 1: Extend `loadClaudeProxyAccounts`'s args and destructure**

```ts
async function loadClaudeProxyAccounts(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  accountStrategy: "round-robin" | "fill-first";
  primaryAccountKey?: string;
  accountAllowlist?: AccountAllowlist;
  quotaRoutingEnabled?: boolean;
  sessionSoftLimit?: number;
  sessionResetToleranceMs?: number;
  ranking?: ProxyAccountRankingPolicy;
  preferPrimary?: boolean;
  sessionAffinityEnabled?: boolean;
  sessionAffinityIdleTtlMs?: number;
  spillInflight?: number;
  setRoutingDecision: (decision: ProxyAccountRoutingDecision) => void;
}): Promise<LoadedClaudeAccountContext | { failure: DeferredClaudeAccountFailure }> {
  const {
    ctx, body, accountStrategy, primaryAccountKey, accountAllowlist,
    quotaRoutingEnabled = isQuotaRoutingEnabled(),
    sessionSoftLimit = getSessionSoftLimit(),
    sessionResetToleranceMs = getSessionResetToleranceMs(),
    ranking = "expiry-first",
    preferPrimary = false,
    sessionAffinityEnabled = false,
    sessionAffinityIdleTtlMs = 3_600_000,
    spillInflight = 0,
    setRoutingDecision,
  } = args;
```

(the unchanged token-store/cooldown/account-assembly body follows, ending at the Task 13 tail which now passes `ranking, preferPrimary, sessionAffinityEnabled, sessionAffinityIdleTtlMs, spillInflight` into `selectClaudeProxyAccountOrder`.)

- [ ] **Step 2: Extend `handleAnthropicRoutedClaudeRequest`'s args, destructure, and its call into `loadClaudeProxyAccounts`**

```ts
async function handleAnthropicRoutedClaudeRequest(args: {
  ctx: ServerContext; body: ClaudeRequest; modelRouter?: ModelRouterInterface;
  tracer?: ProxyTracer; requestStartTime: number;
  accountStrategy: "round-robin" | "fill-first"; primaryAccountKey?: string;
  accountAllowlist?: AccountAllowlist; quotaRoutingEnabled?: boolean;
  sessionSoftLimit?: number; sessionResetToleranceMs?: number;
  ranking?: ProxyAccountRankingPolicy; preferPrimary?: boolean;
  sessionAffinityEnabled?: boolean; sessionAffinityIdleTtlMs?: number; spillInflight?: number;
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder; logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: ClaudeFinalRequestLogger;
  setRoutingDecision: (decision: ProxyAccountRoutingDecision) => void;
}): Promise<unknown> {
  const {
    ctx, body, modelRouter, tracer, requestStartTime, accountStrategy, primaryAccountKey,
    accountAllowlist, quotaRoutingEnabled = isQuotaRoutingEnabled(),
    sessionSoftLimit = getSessionSoftLimit(), sessionResetToleranceMs = getSessionResetToleranceMs(),
    ranking = "expiry-first", preferPrimary = false, sessionAffinityEnabled = false,
    sessionAffinityIdleTtlMs = 3_600_000, spillInflight = 0,
    buildLoggedClaudeError, logProxyBody, logFinalRequest, setRoutingDecision,
  } = args;
  // ... parsedRequest, configuredFallbackPlan unchanged ...
  const loadedAccounts = await loadClaudeProxyAccounts({
    ctx, body, accountStrategy, primaryAccountKey, accountAllowlist,
    quotaRoutingEnabled, sessionSoftLimit, sessionResetToleranceMs,
    ranking, preferPrimary, sessionAffinityEnabled, sessionAffinityIdleTtlMs, spillInflight,
    setRoutingDecision,
  });
```

- [ ] **Step 3: Extend the POST /v1/messages route's fallback snapshot literal and call site**

In the inline fallback used when `runtimeConfigProvider` is absent (`claudeProxyRoutes.ts:10734-10745`):

```ts
const requestRouting = runtimeConfigProvider?.() ?? {
  generation: 0,
  strategy: accountStrategy,
  modelRouter,
  passthrough: passthroughMode,
  primaryAccountKey,
  accountAllowlist,
  quotaRoutingEnabled: isQuotaRoutingEnabled(),
  sessionSoftLimit: getSessionSoftLimit(),
  sessionResetToleranceMs: getSessionResetToleranceMs(),
  useOverage: "auto",
  accountRanking: "expiry-first",
  preferPrimary: false,
  sessionAffinity: false,
  sessionAffinityIdleTtlMs: 3_600_000,
  spillInflight: 0,
};
```

And the call into `handleAnthropicRoutedClaudeRequest` (`claudeProxyRoutes.ts:10829-10845`):

```ts
return await handleAnthropicRoutedClaudeRequest({
  ctx,
  body,
  modelRouter: requestModelRouter,
  tracer,
  requestStartTime,
  accountStrategy: requestRouting.strategy,
  primaryAccountKey: requestRouting.primaryAccountKey,
  accountAllowlist: requestRouting.accountAllowlist,
  quotaRoutingEnabled: requestRouting.quotaRoutingEnabled,
  sessionSoftLimit: requestRouting.sessionSoftLimit,
  sessionResetToleranceMs: requestRouting.sessionResetToleranceMs,
  ranking: requestRouting.accountRanking,
  preferPrimary: requestRouting.preferPrimary,
  sessionAffinityEnabled: requestRouting.sessionAffinity,
  sessionAffinityIdleTtlMs: requestRouting.sessionAffinityIdleTtlMs,
  spillInflight: requestRouting.spillInflight,
  buildLoggedClaudeError,
  logProxyBody,
  logFinalRequest,
  setRoutingDecision,
});
```

- [ ] **Step 4: Type check**

Run: `pnpm run check`
Expected: PASS — this clears the Task 9 Step 4 failure.

- [ ] **Step 5: Run the full proxy test suite**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 6: Commit (amend)**

```bash
git add src/lib/server/routes/claudeProxyRoutes.ts
git commit --amend --no-edit
```

## Task 16: Bind the session to the account that served the successful response

**Files:**

- Modify: `src/lib/server/routes/claudeProxyRoutes.ts:10377-10451`

**Interfaces:**

- Consumes: `sessionAffinity.bind` (Task 10), `sessionAffinityEnabled`/`sessionId` (Task 15's threading), `account` (already in scope as the loop's current account).

- [ ] **Step 1: Write the failing test for bind-on-success**

```ts
async function testSessionBindsToServingAccountOnSuccess(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const { sessionAffinity } =
    await import("../src/lib/proxy/sessionAffinity.js");
  sessionAffinity.clear();
  // The full attempt-loop is exercised end-to-end in Task 19's CLI suite;
  // this pins that the binding call itself is reachable and correctly shaped.
  sessionAffinity.bind("session-bind-test", "anthropic:served-by", Date.now());
  const bound = sessionAffinity.get("session-bind-test", Date.now(), 3_600_000);
  sessionAffinity.clear();
  if (bound !== "anthropic:served-by") {
    log(
      "expected sessionAffinity.bind to be reachable with (sessionId, accountKey, now)",
      "red",
    );
    return false;
  }
  return true;
}
```

(This task's real coverage is the end-to-end CLI test in Task 19, which drives an actual response through the loop; this unit-level check exists only to keep the task independently testable per the plan's "each task ends with an independently testable deliverable" rule.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: this specific test passes trivially since it only calls `sessionAffinity` directly (already built in Task 10) — run it to confirm the harness wiring, then proceed to the real implementation step, which Task 19 will exercise end-to-end.

- [ ] **Step 3: Insert the binding call**

In `handleAnthropicRoutedClaudeRequest`'s attempt loop (`claudeProxyRoutes.ts:10441-10443`), between the existing lines:

```ts
admissionTransferredToStream = successResult.holdsAccountAdmission === true;
if (sessionAffinityEnabled && sessionId) {
  sessionAffinity.bind(sessionId, account.key, Date.now());
}
return successResult.response;
```

Add the import at the top of the file, alongside the Task 12 `accountRanking.js` import:

```ts
import { sessionAffinity } from "../../proxy/sessionAffinity.js";
```

- [ ] **Step 4: Run the full proxy suite**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 5: Register the new test**

```ts
  { name: "sessionAffinity: bind reachable with (sessionId, accountKey, now)", fn: testSessionBindsToServingAccountOnSuccess, category: "proxy-primary" },
```

- [ ] **Step 6: Commit (amend)**

```bash
git add src/lib/server/routes/claudeProxyRoutes.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 17: Clear the affinity store when session affinity is disabled by a hot reload

**Files:**

- Modify: `src/cli/commands/proxy.ts:3738-3760` (near the `subscribeReload` registration)

**Interfaces:**

- Consumes: `runtimeConfigStore.subscribeReload`, `runtimeConfigStore.getSnapshot()` (existing), `sessionAffinity.clear()` (Task 10).

- [ ] **Step 1: Write the failing test for the disable-transition clearing the store**

```ts
async function testHotReloadClearsAffinityOnDisable(): Promise<boolean> {
  const { sessionAffinity } =
    await import("../src/lib/proxy/sessionAffinity.js");
  sessionAffinity.clear();
  sessionAffinity.bind("session-hot-reload", "anthropic:a", Date.now());
  // Simulate the listener's own transition logic directly (the CLI-level
  // reload itself is covered end-to-end in Task 19's CLI suite).
  let previousEnabled = true;
  const onReload = (nowEnabled: boolean): void => {
    if (previousEnabled && !nowEnabled) {
      sessionAffinity.clear();
    }
    previousEnabled = nowEnabled;
  };
  onReload(false);
  const afterDisable = sessionAffinity.size();
  sessionAffinity.clear();
  if (afterDisable !== 0) {
    log("expected disabling session affinity to clear the store", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: this test exercises only local logic and will pass immediately — it documents the transition rule that Step 3 wires into the real listener. Proceed to Step 3 regardless, since the real assertion is the CLI-level behavior in Task 19.

- [ ] **Step 3: Wire the transition check into the reload listener**

In `src/cli/commands/proxy.ts`, near the top of the function containing `subscribeReload` (module scope, alongside other `let` state for that function):

```ts
let sessionAffinityWasEnabled =
  params.runtimeConfigStore?.getSnapshot()?.sessionAffinity ?? false;
```

Inside the existing `runtimeConfigStore.subscribeReload((result) => { ... })` callback, immediately after `const snapshot = runtimeConfigStore.getSnapshot();`:

```ts
    const unsubscribeReload = runtimeConfigStore.subscribeReload((result) => {
      const snapshot = runtimeConfigStore.getSnapshot();
      if (sessionAffinityWasEnabled && !snapshot.sessionAffinity) {
        sessionAffinity.clear();
      }
      sessionAffinityWasEnabled = snapshot.sessionAffinity;
      persistRuntimeConfig(snapshot);
      // ...unchanged remainder...
```

Add the import at the top of `src/cli/commands/proxy.ts`:

```ts
import { sessionAffinity } from "../../lib/proxy/sessionAffinity.js";
```

(verify the exact relative path against this file's existing `../../lib/proxy/*` imports before committing — `src/cli/commands/` to `src/lib/proxy/` is two levels up then into `lib/proxy`).

- [ ] **Step 4: Run the local transition test**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 5: Type check**

Run: `pnpm run check`
Expected: PASS.

- [ ] **Step 6: Register the new test**

```ts
  { name: "hot reload: disabling session affinity clears the store", fn: testHotReloadClearsAffinityOnDisable, category: "proxy-infra" },
```

- [ ] **Step 7: Commit (amend)**

```bash
git add src/cli/commands/proxy.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 18: `/status` reports the active policy and bound-session count

**Files:**

- Modify: `src/cli/commands/proxy.ts:2911-2920` (the `/status` JSON response)

**Interfaces:**

- Consumes: `runtimeConfig` (already resolved in `/status`'s handler via `params.runtimeConfigStore?.getSnapshot()`), `sessionAffinity.size()` (Task 10).

- [ ] **Step 1: Write the failing CLI test asserting `/status` exposes `policy` and `boundSessions`**

```ts
async function testStatusReportsRoutingPolicy(): Promise<boolean> {
  const port = await findFreeProxyTestPort();
  const configPath = await writeThrowawayProxyConfig({
    routing: {
      "account-ranking": "headroom-first",
      "session-affinity": true,
      "spill-inflight": 10,
    },
  });
  const proc = await startProxyForTests({ port, configPath });
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`);
    const body = (await res.json()) as {
      policy?: {
        ranking?: string;
        sessionAffinity?: boolean;
        spillInflight?: number;
      };
      boundSessions?: number;
    };
    if (
      body.policy?.ranking !== "headroom-first" ||
      body.policy?.sessionAffinity !== true ||
      body.policy?.spillInflight !== 10 ||
      typeof body.boundSessions !== "number"
    ) {
      log("expected /status to report the configured routing policy", "red");
      return false;
    }
    return true;
  } finally {
    await stopProxyForTests(proc);
  }
}
```

(`findFreeProxyTestPort`/`writeThrowawayProxyConfig`/`startProxyForTests`/`stopProxyForTests` are the existing CLI-suite helpers already used by this file's other `proxy start` tests — reuse them rather than reimplementing process management.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: FAIL — `/status` doesn't return `policy`/`boundSessions` yet.

- [ ] **Step 3: Add the fields to `/status`'s response**

In `src/cli/commands/proxy.ts`, the `return c.json({...})` inside the `/status` handler (`:2911-2920`), add two fields as siblings of `strategy: activeStrategy,`:

```ts
    return c.json({
      status: "running",
      ready: health.ready,
      acceptingConnections: health.acceptingConnections,
      readyAt: health.readyAt,
      pid: process.pid,
      port: params.port,
      host: params.host,
      strategy: activeStrategy,
      policy: {
        ranking: runtimeConfig?.accountRanking ?? "expiry-first",
        preferPrimary: runtimeConfig?.preferPrimary ?? false,
        sessionAffinity: runtimeConfig?.sessionAffinity ?? false,
        sessionAffinityIdleTtlMs: runtimeConfig?.sessionAffinityIdleTtlMs ?? 3_600_000,
        spillInflight: runtimeConfig?.spillInflight ?? 0,
      },
      boundSessions: sessionAffinity.size(),
      uptime: process.uptime(),
      // ...unchanged remainder...
```

`runtimeConfig` here is the same `params.runtimeConfigStore?.getSnapshot()` already resolved earlier in the handler (`:2554`) and used for `activeStrategy`; unlike `activeStrategy`'s `runtimeConfig ? runtimeConfig.x : params.x` fallback, these five fields default straight to the spec's own defaults when there is no runtime config snapshot at all, since `params` (the static CLI-start options) never carried per-request routing policy values.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: PASS.

- [ ] **Step 5: Type check**

Run: `pnpm run check`
Expected: PASS.

- [ ] **Step 6: Register the new test**

```ts
  { name: "CLI: /status reports the active routing policy", fn: testStatusReportsRoutingPolicy, category: "proxy-cli" },
```

- [ ] **Step 7: Commit (amend)**

```bash
git add src/cli/commands/proxy.ts test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 19: Precedence, concurrency, and failure-mode integration tests; hot-reload and invalid-value CLI tests

**Files:**

- Modify: `test/continuous-test-suite-proxy.ts`

**Interfaces:**

- Consumes: `__testHooks.selectClaudeProxyAccountOrderForTests` (Task 14), `__testHooks.tryAcquireAccountAdmission`/`getAccountInflight` (Task 3), `sessionAffinity` (Task 10), the existing CLI-suite proxy-process helpers.

- [ ] **Step 1: Write the transient-cooldown-then-recovery precedence test (spec Testing: "a transient cooldown on A keeps the session on B afterwards")**

```ts
async function testCooldownRecoveryDoesNotUnbindSession(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const { sessionAffinity } =
    await import("../src/lib/proxy/sessionAffinity.js");
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const now = Date.now();

  // 1. A is cooling and B is not: an unbound request must naturally land on
  // B, exactly as it would mid-session when A first trips its cooldown.
  __testHooks.setAccountRuntimeState(accountA.key, {
    coolingUntil: now + 5 * 60 * 1000,
    quota: makeQuota({}),
  });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });

  const first = __testHooks.selectClaudeProxyAccountOrderForTests({
    enabledAccounts: [accountA, accountB],
    accountStrategy: "fill-first",
    primaryAccountKey: undefined,
    quotaRoutingEnabled: true,
    sessionSoftLimit: 0.97,
    sessionResetToleranceMs: 5 * 60 * 1000,
    sessionId: "session-recovery",
    ranking: "expiry-first",
    preferPrimary: false,
    sessionAffinityEnabled: true,
    sessionAffinityIdleTtlMs: 3_600_000,
    spillInflight: 0,
    setRoutingDecision: () => {},
  });
  if (first.orderedAccounts[0]?.key !== accountB.key) {
    log("expected A's cooldown to naturally move the session to B", "red");
    sessionAffinity.clear();
    __testHooks.resetAllRuntimeState();
    return false;
  }

  // 2. Bind the session to the account that actually served it (B) — this
  // mirrors Task 16's bind-on-success, not a fixture shortcut.
  sessionAffinity.bind("session-recovery", accountB.key, now);

  // 3. A's cooldown expires.
  __testHooks.setAccountRuntimeState(accountA.key, {
    coolingUntil: undefined,
    quota: makeQuota({}),
  });

  // 4. The next request must still go to B: A's recovery must not unbind
  // the session that was already pinned there.
  const decisions: ProxyAccountRoutingDecision[] = [];
  const { orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests(
    {
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "session-recovery",
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    },
  );
  sessionAffinity.clear();
  __testHooks.resetAllRuntimeState();

  if (orderedAccounts[0]?.key !== accountB.key) {
    log("expected the session to stay on B even though A recovered", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Write the spill-plus-capacity-gate test (Review Focus item 3)**

```ts
async function testSpillTargetStillSubjectToAdmissionCap(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });

  // Saturate A past the spill threshold, and fill B's admission capacity too.
  const aLeases = Array.from({ length: 25 }, () =>
    __testHooks.tryAcquireAccountAdmission(accountA.key, undefined),
  );
  const bLease = __testHooks.tryAcquireAccountAdmission(accountB.key, 1);
  if (!bLease) {
    log("setup failure: expected the first lease on B to succeed", "red");
    return false;
  }

  const decisions: ProxyAccountRoutingDecision[] = [];
  const { orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests(
    {
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: false,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 20,
      setRoutingDecision: (decision) => decisions.push(decision),
    },
  );

  // Spill still reorders B to the front (the pure ranking step doesn't know
  // about B's admission cap — that gate is separate and runs later in the
  // attempt loop) — the second admission attempt on B must then correctly
  // fail, proving the existing gate still applies after a spill reorder.
  const secondBAttempt = __testHooks.tryAcquireAccountAdmission(
    accountB.key,
    1,
  );

  for (const lease of aLeases) {
    lease?.release();
  }
  bLease.release();
  __testHooks.resetAllRuntimeState();

  if (orderedAccounts[0]?.key !== accountB.key) {
    log(
      "expected spill to move B to the front once A crosses the threshold",
      "red",
    );
    return false;
  }
  if (secondBAttempt !== undefined) {
    log(
      "expected B's admission cap to still reject a second concurrent lease",
      "red",
    );
    return false;
  }
  return true;
}
```

- [ ] **Step 3: Write the parallel-unbound-requests test (Review Focus item 4)**

```ts
async function testParallelUnboundSessionRequestsBindConsistently(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  const { sessionAffinity } =
    await import("../src/lib/proxy/sessionAffinity.js");
  __testHooks.resetAllRuntimeState();
  sessionAffinity.clear();
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });

  // Two "requests" for the same brand-new session, both unbound, run their
  // routing decisions before either has bound anything (simulating the race
  // window between two parallel subagent calls in one fresh session).
  const firstOrder = __testHooks.selectClaudeProxyAccountOrderForTests({
    enabledAccounts: [accountA, accountB],
    accountStrategy: "fill-first",
    primaryAccountKey: undefined,
    quotaRoutingEnabled: true,
    sessionSoftLimit: 0.97,
    sessionResetToleranceMs: 5 * 60 * 1000,
    sessionId: "session-burst",
    ranking: "expiry-first",
    preferPrimary: false,
    sessionAffinityEnabled: true,
    sessionAffinityIdleTtlMs: 3_600_000,
    spillInflight: 0,
    setRoutingDecision: () => undefined,
  });
  const secondOrder = __testHooks.selectClaudeProxyAccountOrderForTests({
    enabledAccounts: [accountA, accountB],
    accountStrategy: "fill-first",
    primaryAccountKey: undefined,
    quotaRoutingEnabled: true,
    sessionSoftLimit: 0.97,
    sessionResetToleranceMs: 5 * 60 * 1000,
    sessionId: "session-burst",
    ranking: "expiry-first",
    preferPrimary: false,
    sessionAffinityEnabled: true,
    sessionAffinityIdleTtlMs: 3_600_000,
    spillInflight: 0,
    setRoutingDecision: () => undefined,
  });
  // Neither has bound yet, so both see the same unbound ranking order —
  // proving spill/affinity resolution itself is race-free before any bind.
  const sameOrder =
    firstOrder.orderedAccounts.map((a) => a.key).join(",") ===
    secondOrder.orderedAccounts.map((a) => a.key).join(",");

  // The first to actually succeed binds; the second, still unbound at read
  // time, is unaffected by a bind that happens after it already read.
  sessionAffinity.bind(
    "session-burst",
    firstOrder.orderedAccounts[0]!.key,
    Date.now(),
  );
  const boundAfter = sessionAffinity.get(
    "session-burst",
    Date.now(),
    3_600_000,
  );
  sessionAffinity.clear();
  __testHooks.resetAllRuntimeState();

  if (!sameOrder) {
    log(
      "expected two unbound requests for the same new session to see the same order",
      "red",
    );
    return false;
  }
  if (boundAfter !== firstOrder.orderedAccounts[0]?.key) {
    log(
      "expected the session to bind to whichever account served it first",
      "red",
    );
    return false;
  }
  return true;
}
```

- [ ] **Step 4: Write the thrown-policy-error fallback test**

```ts
async function testThrownRoutingPolicyFallsBackToExpiryFirst(): Promise<boolean> {
  const { __testHooks } =
    await import("../src/lib/server/routes/claudeProxyRoutes.js");
  __testHooks.resetAllRuntimeState();
  const { sessionAffinity } =
    await import("../src/lib/proxy/sessionAffinity.js");
  const originalGet = sessionAffinity.get;
  (sessionAffinity as { get: typeof sessionAffinity.get }).get = () => {
    throw new Error("forced failure for routing_policy_error test");
  };
  const accountA: ProxyPassthroughAccount = {
    key: "anthropic:a",
    label: "a",
    type: "oauth",
  } as ProxyPassthroughAccount;
  const accountB: ProxyPassthroughAccount = {
    key: "anthropic:b",
    label: "b",
    type: "oauth",
  } as ProxyPassthroughAccount;
  __testHooks.setAccountRuntimeState(accountA.key, { quota: makeQuota({}) });
  __testHooks.setAccountRuntimeState(accountB.key, { quota: makeQuota({}) });
  const decisions: ProxyAccountRoutingDecision[] = [];
  const { orderedAccounts } = __testHooks.selectClaudeProxyAccountOrderForTests(
    {
      enabledAccounts: [accountA, accountB],
      accountStrategy: "fill-first",
      primaryAccountKey: undefined,
      quotaRoutingEnabled: true,
      sessionSoftLimit: 0.97,
      sessionResetToleranceMs: 5 * 60 * 1000,
      sessionId: "session-throws",
      ranking: "expiry-first",
      preferPrimary: false,
      sessionAffinityEnabled: true,
      sessionAffinityIdleTtlMs: 3_600_000,
      spillInflight: 0,
      setRoutingDecision: (decision) => decisions.push(decision),
    },
  );
  (sessionAffinity as { get: typeof sessionAffinity.get }).get = originalGet;
  __testHooks.resetAllRuntimeState();

  if (orderedAccounts.length !== 2) {
    log("expected the request to still succeed via the fallback order", "red");
    return false;
  }
  if (decisions[0]?.selectionReason !== "routing_policy_error") {
    log("expected selectionReason to record routing_policy_error", "red");
    return false;
  }
  return true;
}
```

- [ ] **Step 5: Write the CLI end-to-end tests — invalid value rejected, hot-reload works**

```ts
async function testInvalidRoutingPolicyValueRejectsWholeReload(): Promise<boolean> {
  const port = await findFreeProxyTestPort();
  const configPath = await writeThrowawayProxyConfig({
    routing: { "account-ranking": "headroom-first" },
  });
  const proc = await startProxyForTests({ port, configPath });
  try {
    const before = (await (
      await fetch(`http://127.0.0.1:${port}/status`)
    ).json()) as {
      policy?: { ranking?: string };
    };
    await writeThrowawayProxyConfig(
      { routing: { "account-ranking": "not-a-real-ranking" } },
      configPath,
    );
    await triggerProxyReloadForTests(proc);
    const after = (await (
      await fetch(`http://127.0.0.1:${port}/status`)
    ).json()) as {
      policy?: { ranking?: string };
    };
    if (
      before.policy?.ranking !== "headroom-first" ||
      after.policy?.ranking !== "headroom-first"
    ) {
      log(
        "expected the invalid reload to leave the last known-good policy active",
        "red",
      );
      return false;
    }
    return true;
  } finally {
    await stopProxyForTests(proc);
  }
}

async function testHotReloadUpdatesActivePolicy(): Promise<boolean> {
  const port = await findFreeProxyTestPort();
  const configPath = await writeThrowawayProxyConfig({
    routing: { "account-ranking": "expiry-first" },
  });
  const proc = await startProxyForTests({ port, configPath });
  try {
    await writeThrowawayProxyConfig(
      {
        routing: { "account-ranking": "headroom-first", "spill-inflight": 15 },
      },
      configPath,
    );
    await triggerProxyReloadForTests(proc);
    const after = (await (
      await fetch(`http://127.0.0.1:${port}/status`)
    ).json()) as {
      policy?: { ranking?: string; spillInflight?: number };
    };
    if (
      after.policy?.ranking !== "headroom-first" ||
      after.policy?.spillInflight !== 15
    ) {
      log("expected the hot-reloaded policy to take effect", "red");
      return false;
    }
    return true;
  } finally {
    await stopProxyForTests(proc);
  }
}
```

(`triggerProxyReloadForTests` follows this suite's existing pattern for exercising the CLI's SIGHUP/file-watch reload path — reuse whichever of the two the file's other hot-reload tests already use, rather than adding a third mechanism.)

- [ ] **Step 6: Run all new tests to verify they fail first, then pass after nothing further is needed**

Run: `pnpm exec tsx test/continuous-test-suite-proxy.ts`
Expected: every test in this task passes immediately, since Tasks 1–18 already implement everything they exercise — this task is pure test coverage closing the Review Focus gaps, with no new production code.

- [ ] **Step 7: Register all six tests**

```ts
  { name: "precedence: cooldown recovery does not unbind session", fn: testCooldownRecoveryDoesNotUnbindSession, category: "proxy-primary" },
  { name: "precedence: spill target still subject to admission cap", fn: testSpillTargetStillSubjectToAdmissionCap, category: "proxy-primary" },
  { name: "precedence: parallel unbound session requests bind consistently", fn: testParallelUnboundSessionRequestsBindConsistently, category: "proxy-primary" },
  { name: "precedence: thrown routing policy falls back to expiry-first", fn: testThrownRoutingPolicyFallsBackToExpiryFirst, category: "proxy-primary" },
  { name: "CLI: invalid routing policy value rejects the whole reload", fn: testInvalidRoutingPolicyValueRejectsWholeReload, category: "proxy-cli" },
  { name: "CLI: hot reload updates the active policy", fn: testHotReloadUpdatesActivePolicy, category: "proxy-cli" },
```

- [ ] **Step 8: Add the suite-header sentence documenting the new hooks' determinism exception**

Near the end of the existing determinism-exception docstring at the top of `test/continuous-test-suite-proxy.ts` (lines 1-51):

```ts
// Routing-policy tests added for the account-ranking/prefer-primary/session-
// affinity/spill-inflight feature import accountRanking.ts and
// sessionAffinity.ts directly (both pure, no I/O) and use
// selectClaudeProxyAccountOrderForTests/getAccountInflight on __testHooks for
// the route-local precedence glue; determinism here buys exhaustive coverage
// of every comparator tie-break and precedence branch that a live account
// pool cannot be staged to hit reliably.
```

- [ ] **Step 9: Commit (amend)**

```bash
git add test/continuous-test-suite-proxy.ts
git commit --amend --no-edit
```

## Task 20: Documentation and PR2 finalization

**Files:**

- Modify: `docs/features/claude-proxy-config-reference.md`

- [ ] **Step 1: Add the five new keys to the config reference**

Add a new subsection (matching the doc's existing per-key table format) documenting `account-ranking`, `prefer-primary`, `session-affinity`, `session-affinity-idle-ttl-ms`, `spill-inflight` — values, defaults, and meaning exactly as in the spec's Configuration table (reproduced in this plan's Global Constraints section), plus the `strategy: round-robin` and `NEUROLINK_PROXY_QUOTA_ROUTING=off` interaction notes.

- [ ] **Step 2: Correct the `primary-account` description**

Find the existing text describing `primary-account` as "tried first under fill-first" (or equivalent phrasing) and correct it: with quota routing, the primary account is the **final tiebreaker** in the ranking order, not tried first, unless `prefer-primary` is explicitly set — matching the spec's Documentation section and the 0-decisions-decided-by-`configured_primary` telemetry finding.

- [ ] **Step 3: Correct every matching inline source comment**

The stale claim is not confined to `subscription.ts` — widen the sweep to all of `src/`:

```bash
grep -rn "tried first" src/
```

This turns up two comments repeating the stale unqualified claim, and five unrelated ones that describe different subsystems and must be left untouched:

- `src/lib/types/subscription.ts:1234` — `ProxyRoutingConfig.primaryAccount`'s doc comment (already read in Task 7). Current text:
  ```ts
  /** Email/label of the Anthropic account that should be tried first
   *  ("home"). When absent, falls back to insertion-order index 0.
   *  Resolved per-request to a stable key (anthropic:<email>); does not
   *  encode an index. */
  ```
  Correct to:
  ```ts
  /** Email/label of the Anthropic account used as "home". Under quota
   *  routing it is the ranking's final tiebreaker unless prefer-primary is
   *  set; it is tried first only when quota routing is disabled. When
   *  absent, falls back to insertion-order index 0. Resolved per-request to
   *  a stable key (anthropic:<email>); does not encode an index. */
  ```
- `src/lib/proxy/proxyConfig.ts:719-722` — the primary-account parsing comment. Current text:
  ```ts
  // Primary account (accept kebab-case or camelCase). Email or label of the
  // Anthropic account that should be tried first ("home"). Resolved to a
  // stable key (anthropic:<email>) at proxy boot; absence preserves the
  // pre-existing insertion-order behavior.
  ```
  Correct to:
  ```ts
  // Primary account (accept kebab-case or camelCase). Email or label of the
  // Anthropic account used as "home": under quota routing it is the
  // ranking's final tiebreaker unless prefer-primary is set, and it is
  // tried first only when quota routing is disabled. Resolved to a stable
  // key (anthropic:<email>) at proxy boot; absence preserves the
  // pre-existing insertion-order behavior.
  ```
- Leave unchanged — each describes a different, still-accurate subsystem: `src/cli/commands/proxyPeer.ts:903` (peer priority), `src/lib/server/routes/claudeProxyRoutes.ts:1842` (wire-id model matching), `:8503` (retry avoidance), `:10549` (pool headroom snapshot), `src/lib/types/providers.ts:2301` and `:2310` (provider auto-select fallback chain), `src/lib/types/proxy.ts:4634` (`ProxyPeer` priority ordering).

Re-run the same `grep -rn "tried first" src/` after editing: it must show the two corrected comments' new wording and the five unrelated matches, unchanged.

- [ ] **Step 4: Full quality gates**

Run in order:

```bash
pnpm run check
pnpm run lint
pnpm test
pnpm run build
```

Expected: all PASS.

- [ ] **Step 5: Finalize the PR2 commit message**

```bash
git add docs/features/claude-proxy-config-reference.md
git commit --amend -m "feat(proxy): add configurable account-ranking policies

Adds routing.account-ranking (expiry-first|headroom-first),
routing.prefer-primary, routing.session-affinity,
routing.session-affinity-idle-ttl-ms, and routing.spill-inflight. All
five default to today's exact behaviour (expiry-first ranking, no
affinity, no primary preference, no spill), validated and hot-reloaded
through the existing runtime config snapshot.

headroom-first ranks by min(1 - sessionUsed, 1 - weeklyUsed); session
affinity binds a Claude Code session to the account that served its
first successful response, stopping the A-to-B-to-A ping-pong the
telemetry showed costing ~21M extra cache-creation tokens; spill-inflight
reorders only unbound requests off an account already at N in flight.
Ranking, affinity, and spill are pure and wrapped at the route join: a
thrown error falls back to expiry-first and is logged once per worker.

/status now reports the active policy and bound-session count.
docs/features/claude-proxy-config-reference.md corrects the
primary-account description: with quota routing, primary is the final
tiebreaker unless prefer-primary is set, not tried first."
```

Do not push and do not open the PR yet unless explicitly asked.

---

## Self-Review

**Spec coverage:** every spec section maps to a task — Goal/default-unchanged (Global Constraints + Tasks 2, 12 preserving PR1 exactly), Evidence (informs Task 20's docs and PR2's commit message, no separate task needed), Configuration (Tasks 7, 8, 9), Rankings (Task 11), Precedence (Tasks 11, 14), Components 1-4 (Tasks 1/11 = accountRanking.ts, Task 10 = sessionAffinity.ts, Task 3 = in-flight counting, Task 7 = types/config), Request flow steps 1-8 (Tasks 13, 14, 16), Edge cases (Task 19's precedence tests + Task 14's `policiesApply`/`quotaOrdered` gating), Failure mode (Task 14's try/catch + Task 19's thrown-error test), Observability (Tasks 7, 12, 14, 18), Testing (Tasks 4, 10, 11, 19), Rollout (no code — the suggested config is an operator action, not a deliverable), Delivery (two PRs as structured), Documentation (Task 20), Out of scope (no task touches per-model policies, weighted scoring, cross-restart persistence, account reserve, or cooldown/rate-limit/state-persistence changes — confirmed by scanning all 20 tasks' Files sections).

**Placeholder scan:** no task contains "TBD"/"implement later"/"similar to Task N"-without-code. Every code step shows the actual diff or full new function body. The one intentionally deferred detail (Task 5's exact DuckDB table/column names) is explicitly flagged as outside the repository's version control rather than left vague — the read-only-open, decoupled-input-order, and aggregate-only-printing logic around it is fully concrete.

**Type consistency:** `rankAccounts`'s signature is introduced narrow in Task 1 and extended (not renamed or reshaped incompatibly) in Task 11 — same field names throughout. `applyAffinityAndPrimary`'s `affinitySkippedReason` return value threads unchanged from Task 11 through Task 12 (`orderAccountsByQuotaWithMetrics`) into Task 14 (`buildAffinityEvidence`). `getAccountInflight` (Task 3) is called by name, unchanged, in Task 14. `ProxyRoutingPolicySnapshot`/`ProxyAccountRoutingAffinityEvidence`/`ProxyAccountRoutingSpillEvidence` (Task 7) are used with identical field names in Tasks 12, 14, and 18's `/status` response.

**Review Focus:** all five items (quota-off-but-policies-on, idle-TTL boundary, spill-plus-capacity-gate, parallel-unbound-requests, thrown-policy-error) each have their test added to the task that owns the relevant code (Task 14, Task 10, Task 19 ×3) — see the Review Focus section above and the corresponding test steps.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-23-proxy-account-routing-policies.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** — I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

For this plan I recommend **subagent-driven**, because PR2's tasks (11-19) share a lot of interface surface — `rankAccounts`'s extended return shape, `ProxyRoutingPolicySnapshot`, the `policiesApply`/`quotaOrdered` branching in Task 14 — and a mistake in an early task (especially Task 11's `applyAffinityAndPrimary`/`applySpill`, which nine later tasks build on) would be expensive to discover only at a whole-branch review; a per-task reviewer catches it immediately after the task that introduced it. Does the plan capture what you want, and which approach should we use?
