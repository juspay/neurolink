[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1277)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1278)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1279)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1280)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1281)

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1284)

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1286)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1288)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1290)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1294)

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

Defined in: [types/proxy.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1300)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1301)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1302)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1303)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1304)
