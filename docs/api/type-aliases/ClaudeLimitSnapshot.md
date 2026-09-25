[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLimitSnapshot

# Type Alias: ClaudeLimitSnapshot

> **ClaudeLimitSnapshot** = `object`

Defined in: [types/subscription.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L170)

Per-request limit snapshot as observed by the Anthropic provider.

Assembled from response headers on every request — whether the provider is
talking directly to Anthropic (both auth methods) or through the NeuroLink
Claude proxy. The `account`/`pool`/`servedBy` fields are populated only by
the proxy, which is the only party that knows them.

## Properties

### rateLimit

> **rateLimit**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L172)

Rate-limit figures parsed from `anthropic-ratelimit-*` headers.

---

### quotaSource?

> `optional` **quotaSource?**: `"live"` \| `"snapshot"` \| `"none"`

Defined in: [types/subscription.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L179)

Provenance of the quota numbers. "snapshot" means the proxy reported a
previously captured reading rather than one from this response; "none"
means no Anthropic account served the request (e.g. a fallback provider).
Absent when talking directly to Anthropic, where any figures are live.

---

### account?

> `optional` **account?**: `string`

Defined in: [types/subscription.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L181)

Proxy account label that served the request.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/subscription.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L183)

"oauth" | "api_key" | "passthrough".

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/subscription.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L185)

Upstream that produced the response — "anthropic" or a fallback provider.

---

### accountCoolingUntil?

> `optional` **accountCoolingUntil?**: `number`

Defined in: [types/subscription.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L187)

Epoch ms until which the serving account is cooling.

---

### accountCoolingReason?

> `optional` **accountCoolingReason?**: `string`

Defined in: [types/subscription.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L188)

---

### pool?

> `optional` **pool?**: `object`

Defined in: [types/subscription.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L190)

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

Defined in: [types/subscription.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L196)

Anthropic request id, for correlating with provider-side logs.

---

### status?

> `optional` **status?**: `number`

Defined in: [types/subscription.ts:198](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L198)

HTTP status of the response the snapshot came from.

---

### capturedAt

> **capturedAt**: `number`

Defined in: [types/subscription.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L200)

Epoch ms when this snapshot was captured.
