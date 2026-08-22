[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L992)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L993)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L994)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L995)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L996)

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L998)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1000)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1002)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1006)

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

Defined in: [types/proxy.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1012)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1013)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1014)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1015)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1016)
