[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1262)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1263)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1264)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1265)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1266)

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1269)

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1271)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1273)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1275)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1279)

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

Defined in: [types/proxy.ts:1285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1285)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1286)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1287)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1288)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1289)
