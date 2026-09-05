[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRoutingConfig

# Type Alias: ProxyRoutingConfig

> **ProxyRoutingConfig** = `object`

Defined in: [types/subscription.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1200)

Full proxy routing config

## Properties

### strategy

> **strategy**: `"round-robin"` \| `"fill-first"`

Defined in: [types/subscription.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1201)

---

### modelMappings

> **modelMappings**: [`ModelMapping`](ModelMapping.md)[]

Defined in: [types/subscription.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1202)

---

### fallbackChain

> **fallbackChain**: [`FallbackEntry`](FallbackEntry.md)[]

Defined in: [types/subscription.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1203)

---

### autoFallback?

> `optional` **autoFallback?**: `boolean`

Defined in: [types/subscription.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1205)

Permit a last-resort provider chosen by the translation layer. Disabled by default.

---

### maxInflightPerAccount?

> `optional` **maxInflightPerAccount?**: `number`

Defined in: [types/subscription.ts:1213](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1213)

Optional in-flight upstream request cap per OAuth account.

Unlimited admission is the result of omitting it AND of any value outside
the accepted range — a non-integer, or anything below 1 or above 20 — since
`normalizeMaxInflightPerAccount()` discards those rather than clamping.

---

### passthroughModels?

> `optional` **passthroughModels?**: `string`[]

Defined in: [types/subscription.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1214)

---

### quotaRouting?

> `optional` **quotaRouting?**: `boolean`

Defined in: [types/subscription.ts:1216](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1216)

Enable quota-aware fill-first account ordering. Defaults to true.

---

### useOverage?

> `optional` **useOverage?**: `"auto"` \| `"always"` \| `"never"`

Defined in: [types/subscription.ts:1229](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1229)

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

Defined in: [types/subscription.ts:1231](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1231)

Session utilization threshold used to proactively demote an account.

---

### sessionResetToleranceMs?

> `optional` **sessionResetToleranceMs?**: `number`

Defined in: [types/subscription.ts:1233](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1233)

Reset-time bucket width used when ordering quota windows.

---

### primaryAccount?

> `optional` **primaryAccount?**: `string`

Defined in: [types/subscription.ts:1238](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1238)

Email/label of the Anthropic account that should be tried first
("home"). When absent, falls back to insertion-order index 0.
Resolved per-request to a stable key (anthropic:<email>); does not
encode an index.

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Defined in: [types/subscription.ts:1243](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1243)

Anthropic account emails/labels that may be loaded by the proxy. When
present, every token-store, legacy, and environment credential outside
this set is excluded before refresh or routing. An empty list denies all
stored credentials.
