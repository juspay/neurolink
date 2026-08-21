# `GET /accounts` — one row per account

## What it is for

Answering "which of my accounts can still take work?" used to need two calls
whose schemas do not line up:

- **`/status`** returns six rows here — three real logins plus `proxy/internal`
  and two `translation` pseudo-accounts — with request and error counters, and
  no quota.
- **`/limits`** returns three rows, only the real logins, with quota and no
  counters.

Every consumer therefore reimplemented the same merge, discarded the plumbing
rows by hand, and drifted whenever the proxy's internals moved. `/accounts`
does the join once, server-side, and adds the thing neither endpoint had:
per-account token totals and cost.

## Response

```jsonc
{
  "generatedAt": 1787258002241,
  "usageDate": "2026-08-20", // UTC day the usage totals cover
  "quotaFromSnapshot": true,
  "quotaError": null, // set if the quota snapshot could not be loaded
  "usageError": null, // set if the request log was unreadable
  "costBasis": "api-equivalent",
  "accounts": [
    {
      "label": "someone@example.com",
      "key": "anthropic:someone@example.com",
      "kind": "account", // "account" | "internal" | "translation"
      "type": "oauth",
      "status": "active", // "active" | "cooling" | "exhausted" | "unrouted"
      //   "unrouted": a real account the quota snapshot does not mention
      "cooling": false,
      "allowed": null, // see the note below
      "expired": null,
      "isPrimary": false,
      "requests": 88514,
      "errors": 964,
      "rateLimits": 232,
      "quotaRateLimits": 4,
      "quota": {
        "sessionUsed": 0.31,
        "weeklyUsed": 0.24,
        "weeklyResetAt": 1787360399, // unix SECONDS, as upstream sends it
        "weeklyResetAtMs": 1787360399000, // normalised, added by this endpoint
        "lastUpdated": 1787253037063, // already ms, passed through untouched
        "sessionHealth": "ok", // ok | degraded | unknown
        "weeklyHealth": "ok",
        "windows": [
          /* each with severity, isActive and resetsAtMs */
        ],
      },
      "usage": {
        "requests": 5053,
        "inputTokens": 367688,
        "outputTokens": 4290265,
        "cacheReadTokens": 1253653209,
        "cacheCreationTokens": 0,
        "costUsd": 897.78,
        "unpricedRequests": 0,
        "unpricedModels": [],
      },
    },
  ],
}
```

### `costBasis: "api-equivalent"` is not a bill

Pooled OAuth accounts bill by **subscription**. `costUsd` is what the recorded
tokens _would_ have cost at published per-token rates — useful for judging
whether a subscription is earning its keep, and for spotting a runaway account.
It is not an invoice, and a consumer that renders it as one is wrong. On this
machine it reads roughly $900/day, which is alarming without that framing.

`unpricedModels` names any model with no pricing row, so a $0 contribution is
visible rather than silent.

## Query parameters

| Param     | Default | Meaning                                                      |
| --------- | ------- | ------------------------------------------------------------ |
| `refresh` | `false` | `true` forces a live quota fetch from Anthropic's usage API. |

**The default is deliberate.** A live refresh spends the user's own OAuth
credentials upstream. This endpoint is built to be polled, so it reads the
stored snapshot unless asked otherwise; a dashboard on a short interval must
not hammer Anthropic.

## Notes on individual fields

- **`allowed` and `expired` are always `null`.** Deriving them needs the token
  store, which `/status` reaches behind its own timeouts. `cooling` is the field
  an operator acts on and one small file read answers it, so that one is real.
  Use `/status` when you need the other two.
- **`status` is derived**, not passed through. `/limits` returns
  `status: "snapshot"`, which describes how the quota was obtained rather than
  the account's health, and must not leak into a field consumers read as health.
- **Timestamps.** Upstream mixes units in one object: `sessionResetAt`,
  `weeklyResetAt` and `windows[].resetsAt` are unix **seconds**; `lastUpdated`,
  `windows[].updatedAt` and `coolingUntil` are **milliseconds**. Only the
  seconds fields get a `*Ms` companion; the rest pass through untouched.
  Blanket-multiplying the object would throw the millisecond fields tens of
  thousands of years forward.
- **`isPrimary`** marks the account the pool prefers, from the proxy's
  hot-reloaded routing config where one is set and the value it was constructed
  with otherwise. Keys compare normalised, so a bare label (`me@example.com`)
  and a full pool key (`anthropic:me@example.com`) match. It is `false` on
  `internal` and `translation` rows, which are not credentials and cannot be
  primary.
- **`severity` and `isActive`** are absent on header-sourced `overage` windows —
  a structural property of how those rows are parsed, not a transient gap. This
  endpoint fills them (`severity: "critical"` when the window is rejected,
  `isActive: false`) so no consumer needs the branch.

## How usage totals are computed

`src/lib/proxy/accountLedger.ts` reads `~/.neurolink/logs/proxy-<date>.jsonl`
incrementally: one cursor per file, advanced only to the last complete newline.
The directory runs to hundreds of megabytes, so a re-read per request is not an
option. Measured on a 930 MB directory: **40 ms cold, 1 ms warm.**

Four correctness rules the module exists to enforce:

1. **Only `proxy-<date>.jsonl`.** `proxy-attempts-*` carries one row per retry;
   folding it in multiplies a retried request's tokens by its retry count.
2. **Fold by `requestId`, conditionally.** A request is logged twice when a
   streamed body finishes and its token counts arrive late — the Codex engine
   does exactly this. Totals derive from a requestId-keyed map, never a sum of
   lines. The fold is NOT unconditional deduplication: two lines merge only
   when the earlier one carries no usage. `requestId` can come from a
   client-supplied `X-Request-ID` and nothing enforces uniqueness, so two
   genuinely distinct usage-bearing requests that share an id are counted
   separately. A consumer that dedupes on id alone will undercount — see the
   fuller explanation below.
3. **Filter by engine.** The log is shared with the Codex pool, and an operator
   can use the same email for both. Without the filter, ChatGPT tokens land on
   the Anthropic row and get priced at the wrong vendor's rates.
4. **Never build the row set from the log.** An account that served no traffic
   today would vanish — precisely when you most want to see it, because it is
   probably cooling or exhausted.

A deleted file (retention) freezes its totals rather than dropping them; a file
that shrank was deleted and recreated, so the cursor resets.

## Row kinds and what they mean

`kind` says what a row actually is, and consumers are expected to filter on it:

| `kind`        | Meaning                                              |
| ------------- | ---------------------------------------------------- |
| `account`     | A real credential. Render it.                        |
| `internal`    | Proxy plumbing (`proxy/internal`). Not a credential. |
| `translation` | A translation pseudo-account. Not a credential.      |

An account that is **currently unroutable** — disabled in the token store after a
permanent refresh failure, or excluded by the active allowlist — is still
`kind: "account"`, with `status: "unrouted"` and no `quota` block. It is absent
from the quota snapshot, so its row is built from usage stats alone.

This matters because it is the row an operator is looking for when they ask why
an account stopped serving traffic. Tagging it `internal` — as the endpoint
originally did for anything the quota snapshot did not return — hid it behind
exactly the filter this table tells consumers to apply.

## What `usage` counts as one request

Usage comes from the proxy's request log, where a single request can appear on
more than one line: the Codex engine writes once when the response headers are
known, carrying no tokens, and again when the SSE stream ends, carrying all of
them. Those two lines are folded together, so a streamed request counts once and
keeps its tokens.

Two lines are only folded when the earlier one carries no usage. `requestId` can
come straight from a client-supplied `X-Request-ID` header and nothing enforces
uniqueness, so a fixed correlation header or an idempotency wrapper produces
genuinely distinct requests that agree on id, account and model. Those each
carry their own usage, and are counted separately rather than collapsed into
one.
