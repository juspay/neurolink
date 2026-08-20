---
title: Proxy Peer Sharing
description: Lend unused subscription capacity from your proxy pool to a peer's, with the lender keeping full control
keywords:
  [
    proxy,
    sharing,
    peer-to-peer,
    pool,
    fallback,
    neurocoins,
    grants,
    cloudflared,
  ]
---

# Proxy Peer Sharing

Your proxy pool has 5-hour and 7-day windows that often go unused. Someone else's
pool runs out. Peer sharing lets the first lend to the second — on the lender's
terms, revocable at any moment.

Each person runs their own `neurolink proxy`. There is no central server: a
**lender** exposes their proxy and issues a **grant**; a **borrower** adds it as a
**peer** and reaches for it only once their own accounts are spent.

> **Before you share.** Lending subscription capacity to other people is very
> likely outside your provider's consumer terms, and the account carrying the
> traffic is the one exposed. This is a deliberate choice, not a default.

## Quick start

**Lender:**

```bash
# 1. Start the proxy as usual. Your own client keeps using this port.
neurolink proxy start --port 3000

# 2. Issue a grant. This brings up the gate-only share listener on 3001,
#    which refuses every request that carries no token.
neurolink proxy share create --peer bob --preset spare

# 3. Publish that listener — not the main port — and re-mint the link
#    against the URL it prints.
neurolink proxy expose
neurolink proxy share url https://your-tunnel.trycloudflare.com
neurolink proxy share rotate --peer bob
```

**Borrower:**

```bash
neurolink proxy peer add --name alice --link "neurolink://share/...#nls_..."
neurolink proxy peer test --name alice
```

That is the whole loop. The borrower's own accounts keep serving as before; the
peer is consulted only when none of them can.

## Gates

Sharing is not a menu of modes. A grant carries one set of **gates**, all of which
must pass. The effective allowance is the tightest of them, so a grant can lend
spare headroom _and_ cap the total _and_ restrict the model, all at once.

| Gate              | Flag                            | Means                                                             |
| ----------------- | ------------------------------- | ----------------------------------------------------------------- |
| Reserve floor     | `--reserve 30`                  | Admit only while your own utilization leaves 30% headroom         |
| Window slice      | `--max-slice 5h=20,7d=15`       | At most a fifth of the **pool**, however it is spread             |
| Per-account slice | `--max-slice-per-account 20`    | The same ceiling applied to each account independently            |
| Spillover         | `--spillover 12h<60@25`         | Lend in the last 12h before a reset if under 60% used, capped 25% |
| Model allowlist   | `--models sonnet haiku`         | Never Opus                                                        |
| Account subset    | `--accounts work@x.com`         | Only this account of yours is lendable                            |
| Rate              | `--rate 20/min --concurrency 2` | Request and in-flight ceilings                                    |
| Schedule          | `--schedule 21-9`               | Night shift only (wraps midnight)                                 |
| Expiry            | `--expires 7d`                  | Hard stop                                                         |

The reserve floor is the one that protects you: as you get busy, the borrower is
squeezed out automatically without you doing anything.

### How the percentages are counted on a multi-account pool

The two ceilings are deliberately scoped differently:

- **Reserve floor is per-account.** Each account must independently keep the
  headroom you asked for. Pooling it would let a borrower drain one account to
  nothing while the others sat untouched.
- **Slice is pool-wide.** Consumption is summed across accounts and divided by
  the account count, so `--max-slice 20` means a fifth of your total capacity —
  the same number whether the borrower takes it from one account or spreads it
  over ten.

```
poolFraction = ( Σ borrowed fraction per account ) / number of accounts
```

Three accounts at 10% each is 10% of the pool, not 30%. Once the pool ceiling is
reached the borrower is refused on **every** account, including idle ones — that
is what a ceiling on the whole means.

A complete share draws on exactly one account, so the pool figure and the
per-account figure are the same number there.

Use `--max-slice-per-account` when you genuinely mean "this much of every
credential, independently".

### Presets

| Preset      | What it sets                                                   |
| ----------- | -------------------------------------------------------------- |
| `spare`     | 30% reserve floor **and** a 20% window slice, unlimited ledger |
| `spillover` | Last 12h before a reset, under 60% used, capped at 25%         |
| `metered`   | Coin ledger with a 25% 5h slice                                |
| `open`      | 10% reserve floor and 60 requests/minute, unlimited ledger     |

Any explicit flag overrides the preset, so `--preset spare --reserve 50` is the
preset with a tighter floor.

## NeuroCoins

A grant is either `unlimited` (bounded only by the gates) or metered in coins.

**1 coin = 1,000 normalized tokens.** Usage is weighted before conversion, so a
coin means roughly the same amount of value regardless of request shape:

| Component      | Weight |
| -------------- | ------ |
| Input tokens   | ×1     |
| Output tokens  | ×4     |
| Cache creation | ×1.25  |
| Cache read     | ×0.1   |

then multiplied by the model tier — Haiku ×0.25, Sonnet ×1, Opus and Fable ×5.
An unrecognised model weighs ×1.

```bash
neurolink proxy share create --peer bob --ledger coins --coins 500 --refill 100/week
neurolink proxy share topup --peer bob --coins 200
neurolink proxy share set --peer bob --coins 0        # cut off without revoking
```

Coins are **pre-authorized** at admission and settled from real usage when the
response completes. Without that, several concurrent streams would each pass the
same balance check and overspend.

A request is admitted while the balance is above zero, not while it covers the
whole estimate — so a grant can overshoot by at most one in-flight request. That
is deliberate: the estimate is conservative, and refusing someone's last small
request because a worst-case guess exceeded their balance is worse than a
bounded overshoot.

Coins and gates are independent: a coin balance is an entitlement ceiling, the
reserve floor is an availability gate. Both apply. Granting 500 coins does not
promise capacity that your own week has already consumed.

## Controlling a live share

```bash
neurolink proxy share list
neurolink proxy share status --peer bob
neurolink proxy share pause --peer bob      # stops at the next request
neurolink proxy share resume --peer bob
neurolink proxy share revoke --peer bob     # permanent for that token
neurolink proxy share rotate --peer bob     # new token, same controls
```

Every one of these takes effect on the borrower's **next request** — no restart.

## What the borrower sees

The lender answers a refusal with headers that say precisely what happened, so a
borrower can tell "you are out of credit" from "the upstream throttled me":

| Header                              | Meaning                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `x-neurolink-grant-status`          | `active`, `paused`, `exhausted`, `revoked`, `expired`, `out-of-window` |
| `x-neurolink-grant-reason`          | The precise refusal, e.g. `slice_exhausted`                            |
| `x-neurolink-grant-remaining-coins` | Balance left on a metered grant                                        |
| `retry-after`                       | When coming back is worth anything                                     |

The borrower parks a peer for a duration matched to the reason — minutes for a
transient problem, until the next window for an exhausted grant, a day for a
revoked one.

### Asking before spending

These routes let a borrower ask questions that cost nothing. All authenticate
with the share token, none touches an account, and none is subject to the
grant's rate or coin ceilings — they exist to ask whether spending is possible.

| Route                  | Answers                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `GET /peer/handshake`  | Protocol version, node capabilities, and this grant's lifecycle state      |
| `GET /peer/limits`     | Remaining coins, slice left per window, whether anything can serve you now |
| `POST /peer/heartbeat` | Complete shares only: report spend, collect a refreshed lease or a stop    |
| `GET /peer/receipts`   | Signed statements of what you were charged, `?since=<sequence>`            |
| `POST /peer/net`       | Settle one round of reciprocal netting                                     |
| `POST /peer/note`      | Check a coin note, or redeem it into your balance                          |

`/peer/limits` is scoped to the caller's own grant. It carries no account
labels and no per-account figures, so it cannot be used to describe — or count —
the lender's pool.

## Privacy

Borrowed traffic is somebody else's conversation, so on the lender's node:

- **Request and response bodies are never captured** for a borrowed request.
- **`x-neurolink-account` and the pool counters are stripped** from borrowed
  responses — that header carries the lender's account label, which for an OAuth
  account is their email address.
- **`GET /limits` is refused for borrowed traffic.** The operator view names
  every account and its quota; a borrower gets `/peer/limits` instead.
- **`/status` releases account identity only to the update-control token** once
  the gate is on, since a gated proxy is by definition one that may be exposed.

The borrower still receives the quota and grant headers their routing needs.

## Ordering

A borrower's request falls through in this order:

1. Its own accounts, in the usual quota-aware order.
2. Peers, by priority — same models, same wire format, one extra hop.
3. The configured provider fallback chain (Gemini, OpenAI, …), which answers as
   a different model.

A node with no accounts at all still borrows: peers are tried before the
"no credentials" error is returned.

A borrowed request is never forwarded on to another peer. Chaining a lend onto a
lend would spend a third party's capacity under a grant that says nothing about
them.

## Two levels of sharing

Everything above describes **live** sharing: the borrower forwards each request
through your proxy, so your gate is in the request path and your credentials
never leave your device. It is the default and the right choice for most people.

**Complete** sharing trades that for availability. The borrower holds its own
credential on your account and calls the provider directly, so it keeps working
when your laptop is shut.

|                                    | Live                         | Complete                               |
| ---------------------------------- | ---------------------------- | -------------------------------------- |
| Your credentials leave your device | No                           | Yes — a separate, independent grant    |
| Works while you are offline        | No                           | Yes, until the lease's grace runs out  |
| Revocation                         | Instant, next request        | Next heartbeat; grace period at worst  |
| Enforcement                        | Cryptographic                | Cooperative, plus after-the-fact audit |
| Extra latency                      | One hop                      | None                                   |
| You can see their prompts          | Yes (never captured to disk) | No                                     |

### Provisioning a complete share

Provisioning is **split**: the borrower generates the PKCE verifier and you only
authorize. You never hold a token for the credential you just minted, so there
is nothing for you to leak, re-send, or forget to delete.

**1. The borrower asks** (they must already have your share token added as a
peer):

```bash
neurolink proxy peer request --name alice
```

This generates a verifier locally, sends only its SHA-256 challenge over the
authenticated grant, and keeps the verifier on their machine.

**2. You authorize:**

```bash
neurolink proxy share provision --peer bob \
    --from-account you@example.com \
    --offline-grace 24h --heartbeat 15m --lease-ttl 7d
```

It prints an authorization URL carrying _their_ challenge. Sign in, authorize,
and paste the code back:

```bash
neurolink proxy share provision --peer bob --code <code>
```

**3. The borrower collects:**

```bash
neurolink proxy peer request --name alice --claim
neurolink proxy peer sync                    # force a check-in
```

They exchange the code with their own verifier, on their own machine, and the
tokens land only there.

The code is single-use and expires with the request (15 minutes). Intercepting
it buys nothing: the token endpoint will not exchange a code without the
verifier, and the verifier never crossed the wire.

This does **not** copy your own tokens. Anthropic's OAuth refresh tokens rotate,
so two devices on one refresh chain invalidate each other — and the loser gets
disabled. That loser could be you.

### How control survives your device being off

What the borrower collects carries a **lease**: a signed, time-boxed statement of
consent that the borrower enforces on itself.

- **`--heartbeat`** (default 15m) — how often the borrower checks in. A `pause`
  or `revoke` reaches them at the next one.
- **`--offline-grace`** (default 24h) — how long they may keep working while you
  are unreachable. This is the headline trade-off: shorter means tighter
  control, longer means they survive your weekend.
- **`--lease-ttl`** (default 7d) — a hard stop baked into the signature, binding
  even on a borrower that never calls home again.

Set `--offline-grace 0` and complete mode has live mode's availability with none
of its enforcement, which is rarely what anyone wants.

### Verifying what a borrower reports

Reported spend is the borrower's word. The lender checks it against something
the borrower cannot influence: the account's own utilization, which the provider
reports.

At each heartbeat the lender records the account's 5h/7d utilization alongside
what the borrower claimed. When a window moved materially, **this node served
none of that traffic**, and the borrower reported nothing, the interval is
counted as drift. Three consecutive drifting check-ins pause the grant
automatically.

The check abstains whenever the movement is explainable — the lender used the
account too, or the borrower did declare spend — because a false accusation
costs someone their access. `share status` shows the verdict on every complete
share:

```
  audit           consistent with the account's own usage
  audit           drifting (2 consecutive)
  audit           auto-paused on usage drift 2026-08-21T11:04:00.000Z
```

Auditing needs to know which of your accounts the share draws on, so pass
`--from-account` at provision time. Without it the share still works, but
reported spend is the only record of it.

Resuming an auto-paused grant rearms the audit, so a grant that drifts again is
paused again.

### What complete mode cannot promise

A credential on someone else's machine can be extracted by them, and the token
store is obfuscated rather than encrypted. A borrower who stops running the
shipped software is not stopped by any of the above.

What you keep is the honest path plus the audit above. It catches a borrower
that stops reporting; it cannot catch one that reports honestly and simply
spends what it was lent, and it says nothing about intervals you also used.

Use complete sharing for people you would trust with the account itself. Use live
sharing for everyone else.

### What the borrower enforces locally

A complete-mode borrower applies the lease's own terms before using the
credential, so a share scoped to Sonnet stays scoped to Sonnet even though the
lender is not in the request path:

- the lease's **hard expiry** and **offline grace**;
- the **model allowlist** and **schedule** snapshotted into the lease; and
- the **reserve floor** and **slice ceiling**, evaluated against the account's own
  quota figures.

The last two run through the same evaluator the lender uses, rather than a
borrower-side reimplementation that would drift the first time a gate was added.
A resident credential is minted from exactly one account, so the pool-wide slice
collapses to the per-account case and both sides read the same number.

A refusal says which of those applied — an out-of-scope model tells the borrower
to ask for a wider share, while a lapsed lease tells them to `peer sync`. Neither
is reported as a credential problem, because sending someone to re-authenticate
into a lender's account is advice that cannot work.

## Receipts

Until a charge is settled, the lender's word is the only record of it. A receipt
makes that checkable: the lender signs every settlement, and the statement
carries the **usage it was computed from**, so a borrower recomputes the charge
rather than accepting it.

```bash
neurolink proxy peer receipts --name alice    # borrower: collect and check
neurolink proxy share receipts --peer bob     # lender: what you charged
```

The borrower's check answers three separate questions, because they have three
different causes:

| Finding    | Means                                                                |
| ---------- | -------------------------------------------------------------------- |
| Unverified | The receipt did not come from this lender's secret                   |
| Miscounted | The coin figure disagrees with the receipt's own usage block         |
| Gap        | A charge was never shown to you — sequences are contiguous per grant |

The signing key is a per-grant **receipt secret**, minted with the grant and
carried in the share link after the token (`#<token>.<secret>`). It deliberately
survives `share rotate`, so receipts issued under an old token stay checkable. A
peer added by hand takes it with `--receipt-secret`; without one, charges are
listed but nothing is verified, and the CLI says so.

A receipt proves authorship only to the holder of the key — it settles a dispute
between the two parties to it and is worth nothing to a third. That is the cost
of an HMAC, and it is the same trade leases make.

## Reciprocal netting

Two nodes that lend to each other otherwise run two one-way debts that never
meet. Netting forgives the overlap:

```bash
neurolink proxy peer net --name alice
```

If Bob has consumed 300 coins of Alice's and Alice has consumed 500 of Bob's,
300 cancels on both sides. Positions are stated as **cumulative totals**, never
as a delta, so running it twice forgives nothing the second time rather than
paying out again. When the two sides' records of what has already been forgiven
disagree, the larger wins — forgiving less is the direction that cannot hand out
coins twice.

Netting needs a grant in each direction. `peer net` looks for a grant you issued
labelled with the peer's own name; point it elsewhere with `--reciprocal <label>`.

## Transferable coin notes

A grant's coins are bound to the pair that agreed them. A note is not: it is a
bearer credit against the issuing node, redeemable once by whoever holds it.

```bash
neurolink proxy share note --coins 200 --ttl 30d      # A mints
neurolink proxy share notes                            # A lists what it minted
neurolink proxy peer redeem --name alice --coin-note <note> --check   # C asks
neurolink proxy peer redeem --name alice --coin-note <note>           # C spends
```

That is `A`-issued, `B`-held, `C`-redeemed: the note travels out of band, and
whoever ends up with it redeems against A, into a grant A issued them. Marking
spent and crediting happen under one lock, so two holders racing the same note
produce exactly one credit and one `spent`.

A holder cannot verify a note offline — it is signed with a secret only the
issuer has — so `--check` asks the issuer instead. That step has to exist
regardless of the signature scheme, because a valid signature says nothing about
whether the note has already been spent.

## The share listener

A proxy that lends anything runs **two** listeners:

| Port                   | Who it is for           | Untokened request |
| ---------------------- | ----------------------- | ----------------- |
| Main (`--port`)        | Your own client         | Served, as always |
| Share (`--share-port`) | Peers, through a tunnel | Refused           |

It appears on its own the moment you issue the first grant and goes away when
the last one is revoked — no restart on either edge — and `share create` tells
you the port. Expose that one.

The split exists because the gate refuses untokened requests and your own client
sends none. An address check could not stand in for it: cloudflared and every
reverse proxy connect from `127.0.0.1`, so tunnelled traffic is
indistinguishable from local traffic by origin. The listener a connection was
accepted on is not something a client can influence, which is why the decision
is made there.

```bash
neurolink proxy start --port 3000            # share listener lands on 3001
neurolink proxy start --share-port 8443      # or put it where you like
NEUROLINK_PROXY_SHARE_LISTENER=0 neurolink proxy start   # or not at all
```

`NEUROLINK_PROXY_REQUIRE_GRANT=1` still exists and now means something narrower:
gate the **main** port as well. Reach for it only when you bind `0.0.0.0` with
nothing in front of it — it refuses your own client too, which is what made it
awkward in the first place.

## Exposure

Any address a borrower can reach works — a domain you already own behind nginx or
Caddy, a permanent named tunnel, a VPN hostname, a plain DNS record. Nothing in
the sharing path knows or cares how you got one.

Record it once and every link is minted against it:

```bash
neurolink proxy share url https://proxy.mycompany.com
neurolink proxy share url            # show the current one
neurolink proxy share url get        # bare value, exits non-zero if unset
neurolink proxy share url --clear    # forget it
```

Point that address at the **share port**, not the main one.

`share url` also probes that address and warns if it answers a request carrying
no share token — the check matters more when you front the proxy yourself, since
nothing else in your stack knows the gate is supposed to be on.

`neurolink proxy expose` is a convenience for people who have no address yet: it
wraps `cloudflared`, picks the share listener automatically, and refuses to open
a tunnel to a port that serves untokened requests. If you already have a domain,
skip it entirely.

## Exposure with cloudflared

`neurolink proxy expose` wraps `cloudflared`, and refuses to open a tunnel to a
proxy that serves untokened requests — it checks by asking the proxy, not by
reading configuration. `--force` overrides that, and should only be used when
something in front of the tunnel already authenticates every request.

Quick tunnels get a new URL on every restart, which rots every peer's
configuration. Use a named tunnel (`--named <tunnel>`) for a peer you expect to
keep.

## What an exposed proxy still reveals

On the share listener — or on the main port with
`NEUROLINK_PROXY_REQUIRE_GRANT=1` — `/v1/messages` and the Codex and
OpenAI-compatible routes all require a share token. Two endpoints stay open on
purpose, because a tunnel and a peer both need a liveness probe:

- **`/health`** — status, readiness, version, uptime. No account data.
- **`/status`** — counters, health and routing state, with **account identity
  redacted**: labels become `account-1`, `account-2`, and the primary-account
  block is blanked. A caller holding the update-control token sees the real
  values.

A loopback allowlist would not have worked here: `cloudflared` runs on the same
machine and connects to `127.0.0.1`, so tunnelled traffic arrives from loopback
exactly like the operator's own CLI does. Separating the two by **listener** is
what makes the distinction real.

## Files

| Path                                         | Owner    | Contents                                                     |
| -------------------------------------------- | -------- | ------------------------------------------------------------ |
| `~/.neurolink/proxy-grants.json`             | lender   | Grants, hashed tokens, policy, state, this node's public URL |
| `~/.neurolink/proxy-share-ledger.json`       | lender   | Coin spend and per-window buckets                            |
| `~/.neurolink/proxy-share-audit.json`        | lender   | Drift observations, streak, auto-pause marker                |
| `~/.neurolink/proxy-share-provisioning.json` | lender   | Outstanding split-PKCE challenges and single-use codes       |
| `~/.neurolink/proxy-peers.json`              | borrower | Peers, tokens, priorities, cooldowns, pending verifier       |
| `~/.neurolink/proxy-resident-grants.json`    | borrower | Leases governing credentials a lender provisioned here       |
| `~/.neurolink/proxy-share-receipts.json`     | lender   | Signed receipts per grant, and the cumulative netted total   |
| `~/.neurolink/proxy-share-notes.json`        | issuer   | Every coin note minted, and which have been redeemed         |

All eight are `0o600` and written by atomic rename. Field-level detail is in the
[config reference](/docs/features/claude-proxy-config-reference).

Tokens are stored **hashed** on the lender's side. The raw token exists once, in
the output of `share create` — which is why `share link` cannot reprint one and
tells you to rotate instead.

## Scope

The gate covers every inbound proxy route, including the Codex and
OpenAI-compatible surfaces. Account-level gates (reserve floor, window slice) and
coin settlement are implemented for the Anthropic engine; a borrowed request on
another engine is admitted or refused by the grant's request-level gates only.
