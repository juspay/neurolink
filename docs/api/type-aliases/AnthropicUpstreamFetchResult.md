[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1066)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1067)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1068)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1069)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1070)

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1073)

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1075)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1077)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1079)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1083)

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

Defined in: [types/proxy.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1089)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1090)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1091)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1092)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1093)
