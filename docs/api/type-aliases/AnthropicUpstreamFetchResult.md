[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1253)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1254)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1255)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1256)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1257)

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1260)

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1262)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1264)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1266)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1270)

A terminal upstream rejection already captured and classified by the
fetch layer. The route must finalize it directly instead of feeding it
through the generic non-OK handler a second time.

#### status

> **status**: `number`

#### body

> **body**: `string`

#### headers

> **headers**: `Record`\<`string`, `string`\>

#### errorType

> **errorType**: `"construction_rejection"`

---

### response?

> `optional` **response?**: `Response`

Defined in: [types/proxy.ts:1276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1276)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1277)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1278)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1279)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1280)
