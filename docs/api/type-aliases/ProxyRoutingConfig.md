[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRoutingConfig

# Type Alias: ProxyRoutingConfig

> **ProxyRoutingConfig** = `object`

Full proxy routing config

## Properties

### strategy

> **strategy**: `"round-robin"` \| `"fill-first"`

---

### modelMappings

> **modelMappings**: [`ModelMapping`](ModelMapping.md)[]

---

### fallbackChain

> **fallbackChain**: [`FallbackEntry`](FallbackEntry.md)[]

---

### autoFallback?

> `optional` **autoFallback?**: `boolean`

Permit a last-resort provider chosen by the translation layer. Disabled by default.

---

### maxInflightPerAccount?

> `optional` **maxInflightPerAccount?**: `number`

Optional in-flight upstream request cap per OAuth account.

Unlimited admission is the result of omitting it AND of any value outside
the accepted range — a non-integer, or anything below 1 or above 20 — since
`normalizeMaxInflightPerAccount()` discards those rather than clamping.

---

### passthroughModels?

> `optional` **passthroughModels?**: `string`[]

---

### quotaRouting?

> `optional` **quotaRouting?**: `boolean`

Enable quota-aware fill-first account ordering. Defaults to true.

---

### useOverage?

> `optional` **useOverage?**: `"auto"` \| `"always"` \| `"never"`

Whether an account may keep serving on paid extra usage once its
subscription window is spent.

- `auto` (default): follow whatever Anthropic reports for the account.
- `never`: park the account at the subscription limit even when extra usage
  is enabled, so the pool can never spend credits.
- `always`: keep serving whenever the provider permits extra usage.

Only `never` can override the provider — nothing here can enable extra usage
that Anthropic has disabled (e.g. `org_level_disabled`).

---

### sessionSoftLimit?

> `optional` **sessionSoftLimit?**: `number`

Session utilization threshold used to proactively demote an account.

---

### sessionResetToleranceMs?

> `optional` **sessionResetToleranceMs?**: `number`

Reset-time bucket width used when ordering quota windows.

---

### primaryAccount?

> `optional` **primaryAccount?**: `string`

Email/label of the Anthropic account used as "home". Under quota
routing it is the ranking's final tiebreaker unless prefer-primary is
set; it is tried first only when quota routing is disabled. When
absent, falls back to insertion-order index 0. Resolved per-request to
a stable key (anthropic:<email>); does not encode an index.

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Anthropic account emails/labels that may be loaded by the proxy. When
present, every token-store, legacy, and environment credential outside
this set is excluded before refresh or routing. An empty list denies all
stored credentials.

---

### accountRanking?

> `optional` **accountRanking?**: [`ProxyAccountRankingPolicy`](ProxyAccountRankingPolicy.md)

Ordering rule for usable accounts. Defaults to "expiry-first" (today's behaviour).

---

### preferPrimary?

> `optional` **preferPrimary?**: `boolean`

If the configured primary is usable and not session-saturated, try it first.

---

### sessionAffinity?

> `optional` **sessionAffinity?**: `boolean`

Keep a Claude Code session on its bound account while it stays usable and not session-saturated.

---

### sessionAffinityIdleTtlMs?

> `optional` **sessionAffinityIdleTtlMs?**: `number`

Idle TTL, in ms, before a session-affinity binding is dropped. 60000-86400000.

---

### spillInflight?

> `optional` **spillInflight?**: `number`

For a request without a binding: spill off an account already at N in-flight. 0-100, 0 = off.
