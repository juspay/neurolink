[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLimitSnapshot

# Type Alias: ClaudeLimitSnapshot

> **ClaudeLimitSnapshot** = `object`

Defined in: [types/subscription.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L169)

Per-request limit snapshot as observed by the Anthropic provider.

Assembled from response headers on every request — whether the provider is
talking directly to Anthropic (both auth methods) or through the NeuroLink
Claude proxy. The `account`/`pool`/`servedBy` fields are populated only by
the proxy, which is the only party that knows them.

## Properties

### rateLimit

> **rateLimit**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L171)

Rate-limit figures parsed from `anthropic-ratelimit-*` headers.

---

### quotaSource?

> `optional` **quotaSource?**: `"live"` \| `"snapshot"` \| `"none"`

Defined in: [types/subscription.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L178)

Provenance of the quota numbers. "snapshot" means the proxy reported a
previously captured reading rather than one from this response; "none"
means no Anthropic account served the request (e.g. a fallback provider).
Absent when talking directly to Anthropic, where any figures are live.

---

### account?

> `optional` **account?**: `string`

Defined in: [types/subscription.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L180)

Proxy account label that served the request.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/subscription.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L182)

"oauth" | "api_key" | "passthrough".

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/subscription.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L184)

Upstream that produced the response — "anthropic" or a fallback provider.

---

### accountCoolingUntil?

> `optional` **accountCoolingUntil?**: `number`

Defined in: [types/subscription.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L186)

Epoch ms until which the serving account is cooling.

---

### accountCoolingReason?

> `optional` **accountCoolingReason?**: `string`

Defined in: [types/subscription.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L187)

---

### pool?

> `optional` **pool?**: `object`

Defined in: [types/subscription.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L189)

Proxy account-pool headroom at response time.

#### available?

> `optional` **available?**: `number`

#### cooling?

> `optional` **cooling?**: `number`

#### bestSessionLeftPct?

> `optional` **bestSessionLeftPct?**: `number`

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/subscription.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L195)

Anthropic request id, for correlating with provider-side logs.

---

### status?

> `optional` **status?**: `number`

Defined in: [types/subscription.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L197)

HTTP status of the response the snapshot came from.

---

### capturedAt

> **capturedAt**: `number`

Defined in: [types/subscription.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L199)

Epoch ms when this snapshot was captured.
