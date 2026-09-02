[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1055)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1056)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1057)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1058)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1059)

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1062)

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1064)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1066)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1068)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1072)

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

Defined in: [types/proxy.ts:1078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1078)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1079)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1080)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1081)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1082)
