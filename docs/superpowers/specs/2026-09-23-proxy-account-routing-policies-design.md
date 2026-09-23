# Proxy Account Routing Policies Design

## Goal

Let an operator choose how the Claude proxy orders usable Anthropic OAuth accounts, instead of the single built-in "spend the soonest-expiring weekly allowance first" rule. Add a headroom-first ranking, and three independent modifiers: prefer the configured primary, keep a Claude Code session on one account, and spill new sessions to another account under load. The default stays byte-for-byte today's behaviour.

## Evidence

From 9.5 days of proxy telemetry (2026-09-13 → 2026-09-23, 134,005 deduplicated routing decisions, v12.19.2):

| Observation                                                             |       Value |
| ----------------------------------------------------------------------- | ----------: |
| Decisions with ≥ 2 usable accounts                                      |      37,155 |
| … rank 0 was the max-headroom account                                   |       17.7% |
| … rank 0 was the soonest-weekly-reset account                           |       94.4% |
| Decisions decided by `configured_primary`                               |           0 |
| Wall-clock time with ≤ 1 usable account                                 |       73.3% |
| Direct mid-session account switches                                     |         316 |
| A→B→A switches within 5 minutes (transient-cooldown ping-pong)          |         107 |
| Extra cache-creation tokens attributable to switches (matched estimate) | ~21 million |
| Weekly resets that expired with unused allowance                        |       0 / 4 |

The current rule meets its own objective (no allowance is wasted at reset) but not the operator's expectations: requests skip the account with the most headroom, `primary-account` never decides anything, and sessions bounce between accounts and lose their prompt cache. A replay model found that headroom-first gains 114–139 hours with ≥ 2 weekly-usable accounts but does not reduce fallback volume, so neither rule dominates. Hence configurable, not replaced.

## Configuration

All keys live under `routing` in `proxy-config.yaml`, are flat like the existing routing keys, accept kebab-case or camelCase, are validated at load, and hot-reload with the runtime config snapshot. An invalid value rejects the load and the last known-good snapshot stays active.

| Key                            | Values                             | Default        | Meaning                                                                                                                                 |
| ------------------------------ | ---------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `account-ranking`              | `expiry-first` \| `headroom-first` | `expiry-first` | Ordering of usable accounts. `expiry-first` is the current comparator, unchanged.                                                       |
| `prefer-primary`               | boolean                            | `false`        | If the configured primary is usable and not session-saturated, it goes first.                                                           |
| `session-affinity`             | boolean                            | `false`        | A Claude Code session stays on its bound account while that account is usable and not session-saturated.                                |
| `session-affinity-idle-ttl-ms` | integer, 60000–86400000            | `3600000`      | After this long without a served request the binding is dropped; the prompt cache is cold by then.                                      |
| `spill-inflight`               | integer, 0–100                     | `0` (off)      | For a request without an active binding: if the chosen account already has ≥ N requests in flight, try the next usable account below N. |

`strategy: round-robin` ignores all five keys. `NEUROLINK_PROXY_QUOTA_ROUTING=off` disables quota-based ranking as today; affinity and `prefer-primary` still apply.

### Rankings

`expiry-first` — the existing `compareAccountRoutingFactors`, moved verbatim: availability → quota-evidence quality → session saturation → model-scoped saturation → soonest weekly reset → soonest session-reset bucket → model-scoped utilization → highest weekly utilization → configured primary → insertion order.

`headroom-first` — availability → quota-evidence quality → session saturation → model-scoped saturation → **highest headroom**, where headroom = min(1 − sessionUsed, 1 − weeklyUsed) using the same reset-freshened values the metrics already compute → soonest weekly reset → configured primary → insertion order. Unknown or stale quota still ranks after known quota because quota-evidence quality stays ahead of headroom, and an account whose headroom cannot be computed (missing session or weekly utilization) sorts after every account whose headroom can. Every step compares totally ordered values, so the order is deterministic and transitive.

### Precedence

"Session-saturated" below means the existing `saturated` metric: hard-saturated, or at the session soft limit (default 0.97).

After unusable accounts are removed, the order a request tries is:

1. the session's bound account, when affinity is on and that account is usable and not session-saturated;
2. the configured primary, when `prefer-primary` is on and it is usable and not session-saturated;
3. the remaining accounts in ranking order.

Spill then only changes which account is tried first, and only for requests without an active binding.

## Components

1. **`src/lib/proxy/accountRanking.ts`** (new, pure: no I/O, no module state).
   `rankAccounts({ accounts, metricsByKey, ranking, primaryKey, affinityKey, preferPrimary })` returns the ordered accounts and the reason that placed rank 0. Exports `compareExpiryFirst` (moved from `claudeProxyRoutes.ts`) and `compareHeadroomFirst`. `orderAccountsByQuotaWithMetrics` in the route becomes a thin wrapper, so the default path runs the same comparator code as today.
2. **`src/lib/proxy/sessionAffinity.ts`** (new). A per-process store: `get(sessionId, now)`, `bind(sessionId, accountKey, now)`, `clear()`. Idle-TTL expiry on read, least-recently-used eviction at 5,000 sessions. The session id comes from the existing `parseClaudeCodeUserId(parsed.metadata?.user_id)`; requests without one skip affinity.
3. **In-flight counting.** The per-account admission state already counts leases when `max-inflight-per-account` is set. The unlimited lease will count too, and `getAccountInflight(accountKey)` will expose the number. Release already fires on JSON completion and on SSE terminal, so a stream counts until it ends.
4. **Types and config.** `ProxyAccountRankingPolicy`, `ProxySessionAffinityConfig` and `ProxyRoutingPolicySnapshot` go in `src/lib/types/` as `type` aliases (no `interface`), with the `Proxy` prefix for global uniqueness and barrel-only imports; parsing and validation in `proxyConfig.ts`; the values ride the runtime config snapshot read per request.

## Request flow

1. Parse the Claude Code identity (existing).
2. Compute account metrics (existing `accountSortMetrics`).
3. `rankAccounts` with the configured ranking.
4. Apply affinity, then `prefer-primary` (move to front if eligible).
5. Existing gates, unchanged: cooling filter, transient wait, model-scoped exhaustion.
6. Spill check for unbound requests.
7. Existing attempt loop.
8. On the first successful response from an Anthropic account, bind the session to **the account that served it**.

Binding on the serving account is what stops the ping-pong: after a transient cooldown moves a session from A to B, the session stays on B instead of returning to A when A's cooldown ends.

## Edge cases

- **Bound account unusable** (cooling, hard-saturated, weekly-rejected, model-scoped exhausted, removed or disabled) or **session-saturated** at the soft limit: affinity is skipped for that request; the session re-binds to whichever account serves it.
- **Served by Codex or Vertex fallback:** the binding is left unchanged, so the session returns to its Anthropic account, and its warm cache, when that account is usable again. Only Anthropic accounts are bound.
- **Parallel requests in one session** (subagents, parallel tool calls) all follow the binding. Spill never splits a bound session.
- **Burst of new sessions:** spill spreads their first requests; each then binds where it landed. This is the Sep 23 case: 14 concurrent sessions stacked on one account.
- **No usable account:** affinity, primary and spill do nothing; the existing transient wait and fallback chain run as today.
- **Hot reload:** disabling affinity clears the store; enabling starts empty. The idle TTL counts from the session's last served request.
- **Worker restart:** the store starts empty; each session re-binds once on its next request.
- Spill counts only Anthropic accounts.

## Failure mode

Ranking, affinity and spill are pure or local and are wrapped where they join the route. If any throws, the request proceeds with the `expiry-first` order, the routing decision records `routing_policy_error`, and the error is logged once per worker at always level.

## Observability

`routingDecision` (schema version stays 1; fields are additive):

- `policy`: `{ ranking, preferPrimary, sessionAffinity, sessionAffinityIdleTtlMs, spillInflight }`
- `affinity`: `{ sessionBound, boundAccount, applied, skippedReason }` — `skippedReason` ∈ `unusable`, `session_saturated`, `expired`, `no_session`, `disabled`
- `spill`: `{ from, to, inflight }` when it moved the first choice
- `selectionReason` gains `session_affinity`, `preferred_primary`, `headroom`, `spill_inflight`, `routing_policy_error`

`/status` reports the active policy and the number of bound sessions.

## Testing

Tests follow the repository's end-to-end rule (CLAUDE.md rule 15). Two tiers:

- **Deterministic cases in `test/continuous-test-suite-proxy.ts`**, under that suite's existing, documented determinism exception, which already covers account ordering through `__testHooks`. Reproducing these orderings end to end would need a staged sequence of 429s and quota states across several real accounts. The new hooks extend the same surface and nothing wider:
  - **Ranking:** every comparator branch for both rankings, unknown and stale quota, saturation, model-scoped windows and all tie-breakers; a seeded randomized case over candidate sets asserts a deterministic, transitive order.
  - **Affinity store:** bind and get, idle expiry on an injected clock, eviction at the cap, clear.
  - **In-flight counter:** increments and decrements on the unlimited lease, releases on stream terminal and on abort, never negative.
  - **Precedence:** a transient cooldown on A keeps the session on B afterwards; `prefer-primary` takes the usable primary; spill moves only unbound requests; fallback service leaves the binding; a thrown policy error yields the default order.
- **End to end through the built CLI**, in the same suite's CLI half: `proxy start` with each new key in a throwaway config shows the effective policy in `/status`; an invalid value is rejected at load and the last known-good policy stays active; editing the config file hot-reloads the policy.

The suite header gains one sentence naming the new hooks and what determinism buys for them. Assertion messages describe mismatches without quoting payloads (the SKIP-classification hazard in CLAUDE.md).

**Default-equivalence replay (pre-merge, local).** Replay every recorded routing decision from the telemetry snapshot through `rankAccounts` with `expiry-first` and require the recorded order for each. It needs private telemetry, so it runs locally and its result goes in the PR description; the deterministic cases above carry a committed synthetic fixture for every comparator branch.

## Rollout

Defaults are unchanged, so merging changes no behaviour. The suggested configuration for the operator's deployment:

```yaml
routing:
  account-ranking: headroom-first
  session-affinity: true
  session-affinity-idle-ttl-ms: 3600000
  spill-inflight: 20
```

After enabling, compare against the baseline above with the same telemetry queries: mid-session switches per 1,000 session requests (4.05), ping-pong pairs (107), extra cache-creation tokens (~21M), wall-clock share with ≤ 1 usable account (73.3%), and fallback share.

## Delivery

juspay/neurolink merges one commit per PR, so two PRs:

1. **Refactor, no behaviour change:** extract the comparator into `accountRanking.ts` and count in-flight on the unlimited lease. Proven by the replay and the existing route tests.
2. **Policies:** `headroom-first`, `prefer-primary`, session affinity, spill, config, telemetry, `/status`, and the documentation correction below.

## Documentation

`docs/features/claude-proxy-config-reference.md` gains the five keys. The `primary-account` text and source comments that still say the primary is "tried first under fill-first" are corrected: with quota routing the primary is the final tiebreaker unless `prefer-primary` is set.

## Out of scope

Per-model policies, weighted scoring, persisting affinity across restarts, an account reserve, and changes to cooldown classification, in-stream rate-limit handling or state persistence. Those last three are separate designs.
