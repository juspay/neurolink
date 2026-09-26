[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLimitSnapshot

# Type Alias: ClaudeLimitSnapshot

> **ClaudeLimitSnapshot** = `object`

Per-request limit snapshot as observed by the Anthropic provider.

Assembled from response headers on every request — whether the provider is
talking directly to Anthropic (both auth methods) or through the NeuroLink
Claude proxy. The `account`/`pool`/`servedBy` fields are populated only by
the proxy, which is the only party that knows them.

## Properties

### rateLimit

> **rateLimit**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Rate-limit figures parsed from `anthropic-ratelimit-*` headers.

---

### quotaSource?

> `optional` **quotaSource?**: `"live"` \| `"snapshot"` \| `"none"`

Provenance of the quota numbers. "snapshot" means the proxy reported a
previously captured reading rather than one from this response; "none"
means no Anthropic account served the request (e.g. a fallback provider).
Absent when talking directly to Anthropic, where any figures are live.

---

### account?

> `optional` **account?**: `string`

Proxy account label that served the request.

---

### accountType?

> `optional` **accountType?**: `string`

"oauth" | "api_key" | "passthrough".

---

### servedBy?

> `optional` **servedBy?**: `string`

Upstream that produced the response — "anthropic" or a fallback provider.

---

### accountCoolingUntil?

> `optional` **accountCoolingUntil?**: `number`

Epoch ms until which the serving account is cooling.

---

### accountCoolingReason?

> `optional` **accountCoolingReason?**: `string`

---

### pool?

> `optional` **pool?**: `object`

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

Anthropic request id, for correlating with provider-side logs.

---

### status?

> `optional` **status?**: `number`

HTTP status of the response the snapshot came from.

---

### capturedAt

> **capturedAt**: `number`

Epoch ms when this snapshot was captured.
