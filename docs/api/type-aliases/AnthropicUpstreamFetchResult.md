[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUpstreamFetchResult

# Type Alias: AnthropicUpstreamFetchResult

> **AnthropicUpstreamFetchResult** = `object`

## Properties

### continueLoop

> **continueLoop**: `boolean`

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

---

### transportScope?

> `optional` **transportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

---

### errorCode?

> `optional` **errorCode?**: `string`

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

The transport failure happened while connecting, before any request
byte was sent, so retrying it cannot duplicate provider work.

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

When set, the caller should wait this many ms before retrying (from upstream retry-after).

---

### cooldownPlan?

> `optional` **cooldownPlan?**: [`AccountCooldownPlan`](AccountCooldownPlan.md)

Set on a genuine 429: how long / why to cool this account before rotating.

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Quota snapshot parsed from the response headers (429 or success), if present.

---

### terminalError?

> `optional` **terminalError?**: `object`

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

---

### lastError

> **lastError**: `unknown`

---

### sawRateLimit

> **sawRateLimit**: `boolean`

---

### sawNetworkError

> **sawNetworkError**: `boolean`

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`
