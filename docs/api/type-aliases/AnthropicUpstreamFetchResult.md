[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1049)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1050)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1051)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1052)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1053)

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1055)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1057)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1059)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1063)

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

Defined in: [types/proxy.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1069)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1070)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1071)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1072)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1073)
