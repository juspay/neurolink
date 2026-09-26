[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1499)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1500)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1501)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1502)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1503)

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1506)

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1508)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1510)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1512)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1516)

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

Defined in: [types/proxy.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1522)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1523)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1524)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1525)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1526)
