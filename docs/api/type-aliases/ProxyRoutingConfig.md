[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRoutingConfig

# Type Alias: ProxyRoutingConfig

> **ProxyRoutingConfig** = `object`

Defined in: [types/subscription.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1201)

Full proxy routing config

## Properties

### strategy

> **strategy**: `"round-robin"` \| `"fill-first"`

Defined in: [types/subscription.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1202)

---

### modelMappings

> **modelMappings**: [`ModelMapping`](ModelMapping.md)[]

Defined in: [types/subscription.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1203)

---

### fallbackChain

> **fallbackChain**: [`FallbackEntry`](FallbackEntry.md)[]

Defined in: [types/subscription.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1204)

---

### autoFallback?

> `optional` **autoFallback?**: `boolean`

Defined in: [types/subscription.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1206)

Permit a last-resort provider chosen by the translation layer. Disabled by default.

---

### maxInflightPerAccount?

> `optional` **maxInflightPerAccount?**: `number`

Defined in: [types/subscription.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1214)

Optional in-flight upstream request cap per OAuth account.

Unlimited admission is the result of omitting it AND of any value outside
the accepted range — a non-integer, or anything below 1 or above 20 — since
`normalizeMaxInflightPerAccount()` discards those rather than clamping.

---

### passthroughModels?

> `optional` **passthroughModels?**: `string`[]

Defined in: [types/subscription.ts:1215](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1215)

---

### quotaRouting?

> `optional` **quotaRouting?**: `boolean`

Defined in: [types/subscription.ts:1217](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1217)

Enable quota-aware fill-first account ordering. Defaults to true.

---

### useOverage?

> `optional` **useOverage?**: `"auto"` \| `"always"` \| `"never"`

Defined in: [types/subscription.ts:1230](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1230)

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

Defined in: [types/subscription.ts:1232](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1232)

Session utilization threshold used to proactively demote an account.

---

### sessionResetToleranceMs?

> `optional` **sessionResetToleranceMs?**: `number`

Defined in: [types/subscription.ts:1234](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1234)

Reset-time bucket width used when ordering quota windows.

---

### primaryAccount?

> `optional` **primaryAccount?**: `string`

Defined in: [types/subscription.ts:1240](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1240)

Email/label of the Anthropic account used as "home". Under quota
routing it is the ranking's final tiebreaker unless prefer-primary is
set; it is tried first only when quota routing is disabled. When
absent, falls back to insertion-order index 0. Resolved per-request to
a stable key (anthropic:<email>); does not encode an index.

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Defined in: [types/subscription.ts:1245](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1245)

Anthropic account emails/labels that may be loaded by the proxy. When
present, every token-store, legacy, and environment credential outside
this set is excluded before refresh or routing. An empty list denies all
stored credentials.

---

### accountRanking?

> `optional` **accountRanking?**: [`ProxyAccountRankingPolicy`](ProxyAccountRankingPolicy.md)

Defined in: [types/subscription.ts:1247](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1247)

Ordering rule for usable accounts. Defaults to "expiry-first" (today's behaviour).

---

### preferPrimary?

> `optional` **preferPrimary?**: `boolean`

Defined in: [types/subscription.ts:1249](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1249)

If the configured primary is usable and not session-saturated, try it first.

---

### sessionAffinity?

> `optional` **sessionAffinity?**: `boolean`

Defined in: [types/subscription.ts:1251](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1251)

Keep a Claude Code session on its bound account while it stays usable and not session-saturated.

---

### sessionAffinityIdleTtlMs?

> `optional` **sessionAffinityIdleTtlMs?**: `number`

Defined in: [types/subscription.ts:1253](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1253)

Idle TTL, in ms, before a session-affinity binding is dropped. 60000-86400000.

---

### spillInflight?

> `optional` **spillInflight?**: `number`

Defined in: [types/subscription.ts:1255](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1255)

For a request without a binding: spill off an account already at N in-flight. 0-100, 0 = off.
