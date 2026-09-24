[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

Defined in: [types/proxy.ts:1432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1432)

## Properties

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1433)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1434)

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1435)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1436)

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1439)

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/proxy.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1441)

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Defined in: [types/proxy.ts:1443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1443)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1445)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

Defined in: [types/proxy.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1449)

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

Defined in: [types/proxy.ts:1455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1455)

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1456)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1457)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1458)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1459)
