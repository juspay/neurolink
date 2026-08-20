# Proxy Peer Sharing — Program Plan

Date: 2026-08-20
Status: **P0–P6 implemented** on `feat/proxy-peer-sharing`
Scope: `src/lib/proxy/`, `src/lib/server/routes/claudeProxyRoutes.ts`, `src/cli/commands/proxy*.ts`
Tests: `pnpm run test:proxy-sharing` (48 cases, fully offline)

> **For agentic workers:** this is the program-level plan and the record of what shipped.
> Phase checklists below are the plan as it was written, kept verbatim for the
> record — read the status table and the deviations section for what actually
> landed, not the boxes.

## Implementation status

| Phase            | State                          | Notes                                                                               |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| P0 Gate          | Done                           | `shareGate.ts`, `shareGrants.ts`, refusal contract, CLI                             |
| P1 Controls      | Done                           | `sharePolicy.ts` gates, account filtering, privacy redaction                        |
| P2 NeuroCoins    | Done                           | `shareLedger.ts`, hold→settle, window buckets, refill                               |
| P3 Peer tier     | Done                           | `peerStore.ts`, `peerTransport.ts`, hard tier gate before the provider chain        |
| P4 Expose        | Done                           | `proxyExpose.ts` with an empirical gate probe, share links, docs                    |
| P5 Complete mode | Done, with one unverified step | `shareLease.ts`, `residentGrants.ts`, `shareProvisioning.ts`, `/peer/*`             |
| P6 Economy       | Done                           | `shareReceipts.ts`, `shareNotes.ts`, `shareSigning.ts`, `/peer/{receipts,net,note}` |

Every phase and every follow-up item is implemented. Nothing in this plan is
outstanding.

**The unverified step in P5** is the browser half of `share provision`: minting a
real second grant on a live Anthropic account requires a browser login and has
not been exercised end to end. Everything either side of it — challenge
validation, single-use claim, expiry, lease issue, signature verification, tamper
and wrong-key rejection, the offline grace window, the hard expiry, heartbeat
renewal, pause propagation and heartbeat authentication — is covered offline.

## Deviations from the plan as written

Three, each deliberate:

| Plan said                    | Shipped                         | Why                                                                                                                                                                            |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ed25519 lease signatures     | HMAC-SHA256, per-grant secret   | Exactly two parties, already sharing a secret — the key-distribution problem asymmetry solves does not exist here, and the browser bundle's `node:crypto` stub has no Ed25519. |
| Coins weight model tier only | Also weights input/output/cache | Output costs ~4× input everywhere and cache reads almost nothing; without it a coin means wildly different things for a long prompt and a long completion.                     |
| `peerPool.ts`                | Peer tier lives in the route    | The hard tier gate is one branch after the account loop; a module for it would have been indirection around a single call.                                                     |

## Review findings (2026-08-21) — all fixed

A wiring audit after implementation found six gaps between the plan and the code.
Each is now fixed and covered by the suite.

| #   | Finding                                                                                                                                                                                       | Severity    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `/status` was unauthenticated on a **gated** proxy and enumerated account labels (emails), quota and cooldown state. A loopback allowlist is no defence — cloudflared connects from loopback. | Security    |
| 2   | `summarizeGrantUsage` was never called: `share status` reported no spend at all.                                                                                                              | Functional  |
| 3   | `recordResidentSpend` was never called: complete-mode heartbeats always reported zero, so a resident borrower's spend never reached the lender's balance.                                     | Functional  |
| 4   | The lease snapshotted the lender's gates but the borrower never enforced them — a Sonnet-only complete share allowed Opus.                                                                    | Control     |
| 5   | A lapsed lease surfaced as "Account(s) require re-authentication", advising the borrower to OAuth into the _lender's_ account.                                                                | Correctness |
| 6   | `touchShareGrantUsage` was never called, so `lastUsedAt` never appeared in `share status`.                                                                                                    | Cosmetic    |

Verified live against isolated proxies on ports 9891–9897: `/status` shows
`account-1` with no email present; an out-of-scope model is refused with
`model_not_allowed` while an in-scope one still routes; a lapsed lease returns a
403 naming the lease, not a credential error.

## Second audit (2026-08-21, later) — all fixed

A second pass over the shipped code against this plan found seven more. All are
fixed and covered by the suite.

| #   | Finding                                                                                                                                                                                                                                                  | Severity    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | The pool-slice denominator counted **every** account the node held, not the ones the grant may reach. `--max-slice 20 --accounts alice` on a five-account pool let the borrower take all of `alice` before the ceiling tripped — a 5× loosening.         | Correctness |
| 2   | Coin settlement read the balance outside the grant store's mutex and wrote back a computed figure, so two streams settling together lost one deduction.                                                                                                  | Correctness |
| 3   | `GET /limits` served a borrower every account label (an email for OAuth accounts) with quota and cooldown state — the same leak as review-1 finding 1, through a different route. It also let a borrower drive usage-API calls on the lender's accounts. | Security    |
| 4   | The drift auto-pause set a permanent marker, so a grant that was auto-paused once could never be auto-paused again after `share resume`.                                                                                                                 | Control     |
| 5   | The heartbeat compared the lease secret with `!==`, leaking its divergence point through timing while every other secret compare in the module was constant-time.                                                                                        | Security    |
| 6   | Borrower-side lease enforcement covered the model allowlist only; schedule, reserve floor and slice ceiling were snapshotted into the lease and then ignored.                                                                                            | Control     |
| 7   | `GET /peer/handshake` and `GET /peer/limits` (§5) were never implemented, so a borrower had no way to ask anything without spending a request — and `peer test` probed with an invalid model that reached the upstream when no allowlist was set.        | Functional  |

### Fourth pass (2026-08-21, with P6)

Two bugs in my own first cut of the netting and note code, both caught by the
suite before they shipped:

| #   | Finding                                                                                                                                                                         | Severity    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | The first netting formula subtracted each side's _own_ forgiveness separately, so a replayed round still forgave the remainder. Replaying a 3-coin round paid out 2 more.       | Correctness |
| 2   | `share create` minted no receipt secret for grants issued before receipts existed, and the receipt path silently signed nothing rather than skipping. Now it skips and says so. | Correctness |

One deliberate refactor came with it: `shareLease.ts` had its own copy of the
sign/compare pair, which is how two signers end up canonicalising differently.
All three signers now share `shareSigning.ts`, which sorts object keys before
hashing so two nodes that built the same statement in a different order still
agree on the bytes.

### Third pass (2026-08-21, with the share listener)

Five more, found while building item 3:

| #   | Finding                                                                                                                                                                          | Severity    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `applyRefillIfDue` paid a single period however many had elapsed, and reset the clock to `now` — so `--refill 100/week` on a node that slept a month paid 100 and drifted later. | Correctness |
| 2   | `summarizeGrantUsage` counted every ledger bucket as an account drawn on, including buckets created by window attribution before any settlement.                                 | Cosmetic    |
| 3   | The `open` preset carried no rate ceiling at all, despite the plan's own table saying "rate cap only" — a runaway borrower loop was unbounded.                                   | Control     |
| 4   | Heartbeat stop responses carried an `httpStatus` field the route adaptor discards, reading as though a status were being enforced when it was not.                               | Clarity     |
| 5   | The drift audit's blindness across a window reset was undocumented, so the gap read as coverage.                                                                                 | Docs        |

Two smaller ones went with them: `parseShareLink` dropped any path from a
lender's address, so a proxy fronted at `example.com/proxy` minted a link
pointing at `example.com`; and a peer cooldown took the lender's `retry-after`
uncapped, so one malformed header could park a working peer indefinitely (now
capped at a week).

Two cosmetic ones too: `share list` never rendered `maxSlicePerAccount`, and a
doc comment in `claudeProxyRoutes.ts` had been pasted over itself.

**Goal:** Let one person's proxy pool lend unused subscription capacity to another person's
proxy pool, over a peer-to-peer mesh of self-hosted proxies, with the lender retaining full,
revocable control over how much is consumed — including while the lender's own device is off.

**Motivating case:** Pool 1 has 5h/7d windows that go unused. Pool 2 exhausts its own windows.
Pool 1 lends the difference, on Pool 1's terms, and can pause or re-price at any moment.

---

## 1. Terminology

| Term          | Meaning                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------- |
| **Node**      | One person's `neurolink proxy` install: a local account pool, grants issued out, grants received in |
| **Lender**    | The node that owns the Anthropic/Codex accounts being shared                                        |
| **Borrower**  | The node consuming a lender's capacity as fallback, after its own pool is exhausted                 |
| **Grant**     | A lender-issued, revocable authorization for one borrower, carrying the full policy                 |
| **Lease**     | The offline-survivable, time-boxed projection of a grant, used by **complete** mode                 |
| **NeuroCoin** | Normalized token credit. 1 coin = 1,000 normalized tokens                                           |

---

## 2. The policy object

Sharing is **not** a set of competing modes. It is one policy record whose gates are
orthogonal and **all AND-ed**. A "mode" is only a preset that fills these fields, so any
combination is expressible — in particular a headroom-only or spillover grant that _also_
carries a hard window-slice ceiling.

```ts
type ProxyShareGrant = {
  id: string;
  peerLabel: string;
  tokenHash: string; // never the token itself
  level: "live" | "complete";
  state: "active" | "paused" | "revoked" | "expired";

  entitlement: {
    ledger: "coins" | "unlimited";
    coins?: number; // remaining balance when ledger === "coins"
    refill?: { amount: number; per: "session" | "week" };
  };

  gates: {
    // Hard ceiling on how much of each window the borrower may take.
    maxSlice?: { session5hPct?: number; weekly7dPct?: number };

    // Headroom-only: admit the borrower solely while MY utilization is below
    // (100 - floor). Self-regulating — the lender working squeezes the borrower out.
    reserveFloor?: { session5hPct?: number; weekly7dPct?: number };

    // Use-it-or-lose-it: open the tap near a window reset when little was consumed.
    spillover?: {
      beforeResetHours: number;
      whenUtilizationBelowPct: number;
      maxSlicePct?: number; // slice ceiling that applies during spillover
    };

    models?: string[]; // tier allowlist, e.g. ["sonnet", "haiku"]
    accounts?: string[]; // which of the lender's accounts are lendable
    rate?: { perMinute: number; concurrency: number };
    schedule?: { fromHour: number; toHour: number; tz: string };
    notAfter?: number; // grant expiry
  };

  lease?: ProxyShareLease; // complete mode only, see §4
};
```

**Admission rule:** a borrowed request is admitted only when _every_ configured gate passes
and the ledger has balance. Effective allowance is the **minimum** across gates.

```
effectiveAllowance = min(entitlement, maxSlice, headroomAboveReserveFloor, spilloverWindow)
```

This composition is the point. `--preset spare` grants a 30% reserve floor _and_ a 20%
window-slice ceiling: the borrower is squeezed out when the lender gets busy **and** can
never take more than a fifth of a window even when the lender is idle all week.

### Presets

| Preset      | Fills                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| `spare`     | `reserveFloor {5h:30, 7d:30}`, `maxSlice {5h:20, 7d:20}`, `ledger: unlimited` |
| `spillover` | `spillover {beforeResetHours:12, whenUtilizationBelowPct:60, maxSlicePct:25}` |
| `metered`   | `ledger: coins`, `coins: <n>`, `maxSlice {5h:25}`                             |
| `open`      | `ledger: unlimited`, `reserveFloor {5h:10}`, rate cap only                    |

### NeuroCoin pricing

1 coin = 1,000 normalized tokens. Model weight is applied to actual usage at settlement:

| Class      | Weight | Rationale               |
| ---------- | ------ | ----------------------- |
| Haiku      | ×0.25  | Cheapest tier           |
| Sonnet     | ×1.0   | Reference unit          |
| Opus       | ×5.0   | Mirrors the price ratio |
| Cache read | ×0.1   | Charged, but nominally  |

Coins are per-grant, never global. A lender may over-commit across grants; the reserve floor
and window slices — not the ledger — are what actually protect the lender's own capacity.

---

## 3. Level 1 — LIVE sharing (piggyback)

The borrower's proxy forwards the request over the lender's exposed tunnel. The lender's
OAuth tokens never leave the lender's device.

```
Claude Code → borrower proxy → [local pool exhausted]
                             → cloudflared tunnel → lender proxy → gate → lender pool → Anthropic
```

- **Enforcement:** cryptographic. Every single request passes the lender's gate.
- **Revocation:** instant — `share pause` applies on the next request via the existing
  runtime-config generation bump (`runtimeConfig.ts:547`), no restart.
- **Availability:** bound to the lender's device being awake and the tunnel being up.
- **Latency:** one extra hop (borrower → tunnel → lender), then the normal upstream call.
- **Privacy:** the lender's node sees the borrower's prompts. Body capture and request-log
  bodies must be **forced off** for borrowed traffic, and `x-neurolink-account*` must be
  stripped from responses (it currently carries the lender's email — `quotaHeaders.ts:148`).

Live mode is the default recommendation for anyone you would not hand your password to.

---

## 4. Level 2 — COMPLETE sharing (resident grant)

The borrower's node holds its own Anthropic credential for the lender's account, and calls
Anthropic directly. The lender's device may be off; the borrower keeps working.

```
Claude Code → borrower proxy → [local pool exhausted] → resident grant → Anthropic
                             ↕ heartbeat (when reachable) → lender proxy
```

### 4.1 Provision an independent grant — never copy tokens

**Do not copy the lender's token pair to the borrower.** Verified failure mode: Anthropic
OAuth refresh tokens rotate (`tokenRefresh.ts:113-114`), and the in-process serialization that
handles rotation (`tokenRefresh.ts:143-176`) is process-local. Two devices refreshing the same
chain will invalidate each other; the loser gets a 400/401, which
`isPermanentRefreshFailure` → `disableAccountUntilReauth` turns into a **disabled account on
the lender's own pool**. Sharing would break the sharer.

Instead, `neurolink proxy share provision --peer bob` runs a **separate** PKCE authorization
in the lender's browser (`anthropicOAuth.ts` — `ANTHROPIC_AUTH_URL`, `generatePKCE`,
authorization-code exchange). That yields an independent refresh chain bound to the same
account. Two chains, no collision, one shared quota pool — exactly the desired semantics.

**Key-namespace trap:** the borrower must store the resident grant under a locally unique
label, e.g. `anthropic:alice-shared`. Per `CLAUDE.md`, Anthropic **quota** is keyed by the
_bare label_, so a colliding label would silently merge quota snapshots between the borrower's
own account and the shared one. Uniqueness must be enforced at provision time.

### 4.2 The lease — control without reachability

The grant is projected into a signed lease that the borrower's proxy enforces
locally. This section was written against Ed25519; what shipped signs with
HMAC-SHA256 over the grant's own secret — see "Deviations from the plan as
written" for why. The lease shape below is otherwise as built:

```ts
type ProxyShareLease = {
  grantId: string;
  issuedAt: number;
  notAfter: number; // hard stop regardless of heartbeats
  heartbeatEveryMs: number; // default 15 min
  offlineGraceMs: number; // default 24 h — how long the borrower runs unheard-from
  policy: ProxyShareGrant["gates"] & {
    entitlementSnapshot: number | "unlimited";
  };
  signature: string;
};
```

- Lender online → `share pause` lands at the next heartbeat (≤ 15 min), or immediately if the
  borrower is mid-heartbeat.
- Lender offline → the borrower keeps serving until `offlineGraceMs` elapses, then refuses.
  **This is the property that makes complete mode worth building.**
- Lease expiry (`notAfter`) is an unconditional stop, immune to a borrower that never calls home.

The single knob that distinguishes every posture is _how long may the borrower run without
hearing from me_:

| Posture             | Unheard-from tolerance                              | Enforcement           |
| ------------------- | --------------------------------------------------- | --------------------- |
| Live                | 0 — every request checked                           | Cryptographic         |
| Complete `--strict` | ≤ access-token TTL (~55 min, `tokenRefresh.ts:332`) | Cryptographic-ish     |
| Complete (default)  | `offlineGraceMs`, default 24 h                      | Cooperative + audited |

### 4.3 `--strict` (sealed credential)

The borrower stores only short-lived access tokens; the refresh token is held sealed and each
refresh requires a call to the lender's node. Anthropic access tokens are ~55 minutes
(`tokenRefresh.ts:332` defaults to `Date.now() + 55*60*1000`), so a lender who goes offline
cuts the borrower off within the hour. Offered as an opt-in for high-value accounts, since it
trades away the offline-availability property that motivates complete mode.

### 4.4 Trust-but-verify — the audit channel

The lender's node polls `https://api.anthropic.com/api/oauth/usage`
(`accountUsage.ts:41`, zero-cost GET, already implemented) and sees the account's **true**
5h/7d utilization, which includes the borrower's draw. Compare that against the spend the
borrower reported at heartbeat:

- Drift within tolerance → normal.
- Drift beyond tolerance → auto-pause the grant, surface in `share status`, notify.

This detects a borrower that under-reports or bypasses local enforcement **without needing the
borrower's cooperation**, and it works on the lender's schedule, not the borrower's.

### 4.5 The honest limitation

`TokenStore` is XOR obfuscation with a locally derived key, not encryption
(`tokenStore.ts:11`, 0o600 perms). A resident credential can be extracted by the person whose
machine it sits on, and local policy enforcement can be bypassed by not running our proxy.
Complete-mode control is therefore **cooperative and audited, not cryptographic**. The only
hard levers are lease expiry, the usage-drift auto-pause, and account-level session
revocation (which also logs the lender out). `share provision` must print this in plain words
before it mints anything.

---

## 5. Wire contracts

| Endpoint               | Level    | Purpose                                                                    |
| ---------------------- | -------- | -------------------------------------------------------------------------- |
| `POST /v1/messages`    | live     | Existing route, now behind the grant gate                                  |
| `GET /peer/handshake`  | both     | Version + capability negotiation, grant state                              |
| `GET /peer/limits`     | both     | Remaining coins / slice / headroom, so the borrower routes before spending |
| `POST /peer/heartbeat` | complete | Borrower reports spend, receives refreshed lease or a stop                 |

**Response headers** (added in `quotaHeaders.ts`, which already owns this contract):

- `x-neurolink-grant-status: active | paused | exhausted | revoked | expired | out-of-window`
- `x-neurolink-grant-remaining-coins`
- `x-neurolink-grant-slice-left-pct`
- `x-neurolink-grant-reason` — human-readable refusal cause
- **Stripped for borrowed traffic:** `x-neurolink-account`, `x-neurolink-account-type`

A grant refusal must be distinguishable from an Anthropic 429. If it is not, the borrower's
cooldown planner will treat "you are out of credits" as a rate limit and keep retrying a peer
that will never serve it.

**Share link:** `neurolink://share/<host>/<grantId>#<token>` — the token is in the fragment so
it is not sent to any host that resolves the URL. Consumed by `proxy peer add`.

---

## 6. Data files

| Path                                   | Owner    | Contents                                               |
| -------------------------------------- | -------- | ------------------------------------------------------ |
| `~/.neurolink/proxy-grants.json`       | lender   | Grants, hashed tokens, policy, state                   |
| `~/.neurolink/proxy-share-ledger.json` | lender   | Coin balances, holds, settled entries, per-grant spend |
| `~/.neurolink/proxy-peers.json`        | borrower | Peer name, url, token, priority, last-known limits     |
| `~/.neurolink/proxy-leases.json`       | borrower | Signed leases, last heartbeat, grace deadline          |

All four follow the existing 0o600 + atomic-rename discipline used by `tokenStore.ts` and the
lock/snapshot discipline of `usageStats.ts`.

---

## 7. Hook points

| Concern                  | Existing code to plug into                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Edge auth gate           | Wrap handlers in `createClaudeProxyRoutes` (`claudeProxyRoutes.ts:8316`); apply the same wrapper to the Codex and OpenAI route groups |
| Lendable account subset  | Pass the grant's `accounts` into the existing `accountAllowlist` path (`accountSelection.ts:34`) — no new selector code               |
| Reserve floor / slice    | Read the metrics `accountSortMetrics` already computes (`claudeProxyRoutes.ts:~1600`)                                                 |
| Coin settlement (stream) | The `telemetry` promise resolved by `createSSEInterceptor` (`claudeProxyRoutes.ts:3120`, `3253`, `5155`)                              |
| Coin settlement (JSON)   | The `usage` block at `claudeProxyRoutes.ts:~3440`                                                                                     |
| Hot pause/resume         | Config generation bump (`runtimeConfig.ts:547`) — already applies without restart                                                     |
| Peer cooldown state      | Existing planner, keyed `peer:<name>` (safe: bare labels never contain `:`)                                                           |
| Usage audit              | `fetchAccountUsage` / `ANTHROPIC_USAGE_URL` (`accountUsage.ts:41`)                                                                    |

**New modules** (all under `src/lib/proxy/`): `shareGrants.ts`, `shareLedger.ts`,
`sharePolicy.ts` (pure evaluation, hot-path safe), `shareLease.ts`, `peerPool.ts`,
`peerTransport.ts`.

**Types:** all into `src/lib/types/proxy.ts` with `ProxyGrant*` / `ProxyShare*` / `ProxyPeer*`
prefixes (rules 2, 9, 10, 13).

**CLI:** `src/cli/commands/proxyShare.ts` and `src/cli/commands/proxyPeer.ts`.

---

## 8. Commands

```bash
# Lender — issuing and controlling
neurolink proxy share create --peer bob --preset spare --level live
neurolink proxy share create --peer bob --level complete \
    --ledger coins --coins 500 --refill 100/week \
    --max-slice 5h=20,7d=15 --reserve 30 --models sonnet,haiku \
    --rate 20/min --concurrency 2 --expires 7d --offline-grace 24h
neurolink proxy share provision --peer bob        # complete mode: browser OAuth, mints grant
neurolink proxy share list
neurolink proxy share status [bob] [--watch]      # spend, remaining, drift vs usage API
neurolink proxy share pause bob | resume bob
neurolink proxy share topup bob --coins 200
neurolink proxy share set bob --coins 0 --reserve 50 --max-slice 5h=10
neurolink proxy share level bob --to complete     # upgrade/downgrade an existing grant
neurolink proxy share revoke bob [--rotate]
neurolink proxy share link bob
neurolink proxy expose [--cloudflared] [--named my-pool] [--access]

# Borrower — consuming
neurolink proxy peer add <link> [--priority 1]
neurolink proxy peer list | status | test bob | pause bob | remove bob
neurolink proxy peer sync [bob]                   # force a heartbeat now
```

---

## 9. Phases

Each phase is independently shippable and independently useful.

### P0 — Gate and grants

- [ ] `shareGrants.ts`: store, token minting, hashing at rest, state machine
- [ ] Edge auth gate wrapping all three route groups; loopback stays open by default
- [ ] Refusal contract: `x-neurolink-grant-*` headers + dedicated error type
- [ ] `share create` / `list` / `pause` / `resume` / `revoke` / `link`
- [ ] Hot state changes via the config generation bump
- [ ] E2E: unauthenticated request refused, paused grant refused, revoked grant refused

**Nothing is exposed in P0.** This is the security floor that must exist before `expose` ships.

### P1 — Policy gates

- [ ] `sharePolicy.ts`: pure admission evaluation over the gate set
- [ ] `reserveFloor`, `maxSlice`, `spillover`, `models`, `accounts`, `rate`, `concurrency`, `schedule`, `notAfter`
- [ ] Presets (`spare`, `spillover`, `metered`, `open`)
- [ ] Per-grant accounting dimension added alongside `AccountStats`
- [ ] `share status` with per-peer spend
- [ ] Privacy defaults: body capture forced off, `x-neurolink-account*` stripped for borrowed traffic
- [ ] E2E: each gate independently refuses; composed gates refuse on the tightest

At the end of P1, an `unlimited` grant with a reserve floor is already a usable product for a
trusted pair pointing a client straight at the tunnel.

### P2 — NeuroCoins

- [ ] `shareLedger.ts`: balances, **hold → settle → release**, persistence with the
      `usageStats.ts` lock/snapshot discipline
- [ ] Model-weighted normalization; cache-read weighting
- [ ] `share topup` / `set --coins` / refill policy
- [x] `GET /peer/limits` (shipped in the second audit, with `/peer/handshake`)
- [ ] E2E: concurrent streams cannot overspend; client disconnect settles from partial usage

### P3 — Borrower peer tier (LIVE end to end)

- [ ] `proxy-peers.json`, `peer add/list/status/test/remove/pause`
- [ ] `peerPool.ts`: synthetic members keyed `peer:<name>` behind a **hard tier gate** —
      admitted only when every local account is unusable, never as a comparator tweak
- [ ] `peerTransport.ts`: raw Anthropic passthrough forward, short connect timeout, at most one
      retry before the next peer
- [ ] Peer response headers feed the existing cooldown/quota state for that peer key
- [ ] E2E: two proxies, disposable homes, distinct ports — borrower falls through to peer only
      after local exhaustion, and stops on pause

**"Fallback pool" is literal from here on.**

### P4 — Expose and mesh usability

- [ ] `proxy expose` wrapping `cloudflared tunnel --url`; named-tunnel guidance
- [ ] Share-link mint/consume round trip
- [ ] Optional Cloudflare Access service-token second factor
- [ ] Codex engine parity for the gate
- [ ] `docs/features/proxy-peer-sharing.md` + troubleshooting entries

### P5 — COMPLETE mode

- [ ] `share provision`: separate PKCE authorization → independent refresh chain
- [ ] Unique local label enforcement on the borrower
- [ ] `shareLease.ts`: sign/verify (planned Ed25519; shipped HMAC-SHA256), `notAfter`, `heartbeatEveryMs`, `offlineGraceMs`
- [ ] `POST /peer/heartbeat`: spend reporting, lease refresh, stop propagation
- [ ] Borrower-side local enforcement of the leased policy; refuse past grace
- [ ] Usage-drift reconciliation against `/api/oauth/usage`, auto-pause on drift
- [ ] `--strict` sealed-credential variant
- [ ] `share level --to complete` upgrade path
- [ ] E2E: lender offline → borrower serves within grace, refuses past it; pause propagates at
      the next heartbeat; drift triggers auto-pause

### P6 — Mesh economy

- [x] Signed usage receipts so neither side must trust the other's accounting
- [x] Reciprocal netting between peers
- [x] Transferable coins (A-issued, B-held, C-redeemed against A) with replay protection

**Receipts.** The lender signs every settlement and the statement carries the
usage the charge was computed from, so the borrower recomputes rather than
believes. Sequences are contiguous per grant, so a withheld charge is a gap.
Three findings are reported separately because they have three causes:
`unverified` (not from this lender), `miscounted` (the coin figure disagrees
with its own usage), `gap` (never shown to us). Keyed by a per-grant **receipt
secret** minted with the grant and carried in the share link as
`#<token>.<secret>` — it survives `share rotate` so old receipts stay checkable.

**Netting.** `round = max(0, min(consumedByThem, consumedByMe) − alreadyForgiven)`.
Cumulative positions rather than a delta is what makes a replay free by
construction. When the two sides' records of `alreadyForgiven` disagree the
larger wins: forgiving less is the direction that cannot pay twice. The claim is
signed with the receipt secret and bound to the grant id, so it cannot be
replayed against a different peer.

**Notes.** A bearer credit against the issuer, redeemable once. The record is
written before the note is returned (no credit the issuer has no memory of), and
marking spent happens under the same lock as the credit (two holders racing one
note produce one credit and one `spent`). Marking precedes crediting, so a crash
between them costs the redeemer the note rather than allowing a double redeem.

An HMAC means a holder cannot verify a note offline, so `--check` asks the
issuer. That round trip is not a workaround: a valid signature says nothing
about whether the note has already been spent, so the issuer has to be asked
regardless of the signature scheme.

---

## 10. Verified traps

1. **No inbound auth exists today.** Nothing reads `Authorization` on `/v1/messages`. P0 must
   land before any `expose` command ships. Exposing a tunnel without the gate publishes the
   lender's subscription to the internet.
2. **Refresh-token rotation** (`tokenRefresh.ts:113-176`) makes naive credential copying
   destructive to the lender's own pool. Complete mode must provision an independent grant.
3. **Rolling worker replacement** (`rollingWorkerSupervisor.ts`) means two generations can be
   live briefly. The ledger must not double-spend; reuse the `usageStats.ts` lock-owner pattern.
4. **Streaming settlement**: usage is only known at `message_delta`. Without hold→settle, N
   concurrent streams each pass the same balance check.
5. **Mid-stream disconnect**: settle from partial telemetry, never leak the hold.
6. **Privacy leaks**: `x-neurolink-account` carries the lender's email (`quotaHeaders.ts:148`);
   body capture persists the borrower's prompts to the lender's disk.
7. **429 ambiguity**: a grant refusal cooled as an Anthropic rate limit will be retried forever.
8. **Quota key namespace**: Anthropic quota is keyed by _bare label_ (documented asymmetry in
   `CLAUDE.md`). Peer keys use the `peer:` prefix, which is safe; resident grants need
   label-uniqueness enforcement.
9. **Cloudflare quick tunnels change URL on restart** — every peer entry rots. Use named tunnels.
10. **Latency stacking**: borrower → tunnel → lender → Anthropic. Peer attempts need a tighter
    connect timeout and minimal retry.
11. **Provider terms**: sharing subscription capacity with other people is very likely outside
    Anthropic's consumer terms, and the account carrying the traffic is the one exposed.
    `share create` and `share provision` must warn explicitly. This does not change the build;
    it changes the framing and the defaults.

---

## 11. Testing

Rule 15 applies: end-to-end only. `test/continuous-test-suite-proxy-sharing.ts` drives **two**
proxy processes with disposable homes and non-live ports (never 55669), following the isolation
boundary established in `2026-08-15-proxy-completion-and-test-isolation.md`:

- Never read or write the operator's real proxy state, tokens, quotas, or cooldowns.
- Scrub provider credentials; live paths require `NEUROLINK_PROXY_TEST_ALLOW_LIVE=1`.
- **No payloads in assertion messages** — a message quoting provider-ish text is downgraded to
  SKIP and the run still exits 0. Sanity-check each new suite by breaking one assertion and
  confirming `✗` with a non-zero exit.

---

## 12. Deliberate non-goals

- No central broker or hosted service. The mesh is peer-to-peer; the only always-on component
  is whatever tunnel the lender chooses to run.
- No generalization of the pool into a provider-agnostic `CredentialPool` (that is separate
  future work noted in the provider-redesign roadmap).
- No changes to the Anthropic quota keying asymmetry documented in `CLAUDE.md`.

---

## Follow-up work (specified 2026-08-21, NOT implemented)

Five items agreed after review. Ordered by dependency. Item 1 is a correctness
bug; the rest are design corrections. None are started.

### 1. Pool-wide slice accounting — DONE (2026-08-21)

Implemented and verified. `readSharePoolWindowUsage` normalises
`Σ per-account fractions / accountCount`; `filterAccountsForGrant` settles the
pool ceiling once before the per-account loop and refuses every account when it
is spent. `maxSlicePerAccount` preserves the old behaviour as an opt-in. Covered
by "a slice ceiling means a share of the pool, not of every account".

Verified: 3 accounts at 10% each → pool 0.10 (not 0.30); the same total taken
from one account reads identically; 3 at 25% → 0.25 → refused everywhere with
`slice_exhausted`; a one-account (complete-mode) pool collapses to the
per-account case; the reserve floor still withholds a busy account while an idle
one serves; a rolled-over window contributes zero.

Original description follows.

### 1b. Pool-wide slice accounting — correctness bug (original)

**Symptom.** `--max-slice 20` on an N-account pool grants 20% of _each_ account,
so the borrower gets 20 × N percent of pool capacity. On five accounts the "one
fifth" ceiling is really a whole account-window.

**Cause.** `filterAccountsForGrant` (`sharePolicy.ts`) evaluates every gate
per-account inside its `for (const account of accounts)` loop, and the ledger
keys borrowed usage per account (`bucketKey` = `grantId|accountKey`).

**Correct semantics, per gate:**

| Gate                         | Scope                       | Rationale                                                                                                             |
| ---------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `reserveFloor`               | **per-account** (unchanged) | Protects each account individually. Pool-wide would let a borrower drain one account to 100% while others stay fresh. |
| `maxSlice`                   | **pool-wide** (change)      | The operator means "this fraction of what I have", not "per credential".                                              |
| `spillover.maxSlicePct`      | **pool-wide** (change)      | Same ceiling, same reasoning.                                                                                         |
| `spillover` admission window | **per-account** (unchanged) | Each account has its own reset clock; near-reset is genuinely a per-account fact.                                     |
| coins                        | already pool-wide           | One balance per grant.                                                                                                |

**Math.** For window W ∈ `{session5h, weekly7d}`, over the grant's admissible
accounts A:

```
poolFractionW = ( Σ_{a ∈ A} borrowedFractionW(grant, a) ) / |A|
admit iff poolFractionW * 100 < maxSlice.W
```

Dividing by `|A|` normalises to "one window's worth", so 20% means a fifth of
total pool capacity however it is spread. Only accounts whose bucket matches the
current window epoch contribute; a rolled-over window contributes 0 (existing
`readShareWindowUsage` behaviour).

**Complete mode.** A resident credential is minted from exactly one account
(`grant.provisionedAccount`), so `|A| = 1` and pool-wide collapses to
per-account. No special case needed — but the borrower's local enforcement must
use the same formula, since it is the party applying the lease.

**Changes.**

- `shareLedger.ts`: add `readSharePoolWindowUsage(grantId, accounts)` returning
  `{ sessionFraction, weeklyFraction }` already divided by `accounts.length`.
- `sharePolicy.ts`: `filterAccountsForGrant` takes a `poolUsage` argument; slice
  checks read it instead of the per-account view. Keep the per-account path
  behind a new `maxSlicePerAccount` gate.
- `types/proxy.ts`: add `ProxyShareGates.maxSlicePerAccount`.
- `claudeProxyRoutes.ts`: `applyShareAccountGates` computes pool usage before
  filtering.
- CLI: `--max-slice` (pool) and `--max-slice-per-account`.

**Behaviour change to flag in docs:** once the pool ceiling is hit the borrower
is refused on _every_ account, including idle ones. That is the point of a cap,
but it differs from what shipped.

**Tests:** 3 accounts each 10% borrowed with `--max-slice 20` → pool fraction
10%, admitted. Each 25% → pool 25%, refused everywhere. One account at 60% and
two at 0% → pool 20%, at the boundary. Complete-mode single account unchanged.

### 2. `share url` verbs — DONE (2026-08-21)

`share url get` prints the bare value and exits non-zero when unset;
`share url --clear` (or `share url clear`) forgets it. Documented in both the
proxy doc and the sharing guide.

### 3. Separate share listener — DONE (2026-08-21)

Implemented in `shareListener.ts` and wired through the proxy runtime.

A second, gate-only listener runs on `--share-port` (default: main port + 1,
overridable by `NEUROLINK_PROXY_SHARE_PORT`, suppressible with
`NEUROLINK_PROXY_SHARE_LISTENER=0`). It comes up when the first active grant
appears and closes when the last is revoked — polled against the grant file
every 15s, so neither edge needs a restart. `share create` reports the port and
`proxy expose` targets it by default; the main port keeps serving the operator's
own untokened client exactly as before.

**Which listener a request arrived on is decided by the accepting socket**
(`incoming.socket.localPort`), not by a header or an address, which is the only
way to separate tunnelled traffic from local traffic when cloudflared connects
from `127.0.0.1` too.

Two things worth knowing:

- A bind failure — the derived `port + 1` already taken — is logged **once** and
  retried, never fatal. The operator moves it with `--share-port`.
- It runs under socket workers as well. During a rolling replacement the
  incoming generation loses the bind until the outgoing one drains, then takes
  it on the next poll. Disabling it there instead would have left launchd
  installs, the main production shape, without the feature at all.

`NEUROLINK_PROXY_REQUIRE_GRANT` survives with a narrower meaning: gate the
**main** port too. It is the answer for binding `0.0.0.0` with nothing in front,
and nothing else.

Original description follows.

### 3b. Separate share listener — removes `NEUROLINK_PROXY_REQUIRE_GRANT` (original)

The flag exists because the gate refuses _untokened_ requests, which includes the
operator's own client, so enabling it needs a restart and breaks local use. A
loopback allowlist cannot fix this: cloudflared and any reverse proxy connect
from 127.0.0.1, so tunnelled traffic is indistinguishable from local.

**Fix.** A second listener, gate-only, started automatically when at least one
active grant exists. Expose that port; the main port keeps today's behaviour.
`share create` reports the share port. The env var survives only as an override
for operators who bind `0.0.0.0` with nothing in front.

### 4. PKCE-split provisioning — DONE (2026-08-21)

Implemented and covered. `bundle.json` is gone, and so are
`share provision --out` and `peer adopt --bundle`.

The flow is now: `peer request` generates a verifier and sends only its S256
challenge over the authenticated grant → `share provision` prints an
authorization URL carrying that challenge and records the pasted code against the
grant → `peer request --claim` collects the code once and exchanges it locally
with its own verifier. The lender never holds a token for the credential it
mints.

Bindings, all enforced: the challenge arrives on an authenticated grant and is
keyed to it; a challenge must be a well-formed base64url S256 digest; the request
expires after 15 minutes; the code is claimable exactly once; the borrower
refuses a claim whose state does not match the one it generated; the account is
pinned via `--from-account` for the drift audit. New module
`shareProvisioning.ts`, new routes `POST`/`GET /peer/provision`, new shared
helpers `buildSubscriptionAuthUrl` / `exchangeSubscriptionCode` in
`anthropicOAuth.ts` so the interactive login and this flow cannot drift apart.

Note the deliberate difference from `auth login`: that flow sets `state` to the
verifier as a convenience, which is safe when one machine holds both. Here it
would hand the verifier to the party that must not have it, so the borrower sends
an unrelated random state.

Original description follows.

### 4b. PKCE-split provisioning — removes the credential file (original)

`share provision` currently writes `bundle.json` containing a live access and
refresh token, plaintext at 0600, handed over out of band. It is copyable and
re-sharable.

**Fix — the borrower generates the verifier; the lender only authorizes:**

1. Borrower creates a PKCE verifier locally, sends the **challenge** to the
   lender over its authenticated grant.
2. Lender opens the browser and authorizes on its own account.
3. The **authorization code** is returned to the borrower.
4. Borrower exchanges code + its own verifier for tokens, on its machine.

The lender never holds the tokens; the code is single-use and bound to a verifier
only the borrower has, so interception yields nothing. Replaces
`share provision --out` / `peer adopt --bundle` with `peer request`.

Binding requirements: challenge must arrive on an authenticated grant; code
issued once, tied to that grant id, short TTL; resulting account pinned to
`grant.provisionedAccount`.

### 5. Documentation — DONE (2026-08-21)

`claude-proxy.md` documents all 12 proxy and 17 auth commands. The config
reference now carries flag tables for `proxy share`, `proxy peer` and
`proxy expose`; a **Peer-sharing state** subsection covering all six state files;
`NEUROLINK_PROXY_REQUIRE_GRANT` in the environment table; and `/limits` plus
every `/peer/*` route in the endpoints table. `claude-proxy-architecture.md`
places the gate, the account-scoping step, the peer tier and borrowed-response
redaction in the request-flow diagram, and lists the eleven sharing modules.

The share-port setting, the listener's lifecycle and the narrowed meaning of
`NEUROLINK_PROXY_REQUIRE_GRANT` are documented alongside it.
