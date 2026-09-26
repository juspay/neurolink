[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

---

### timestamp

> **timestamp**: `string`

---

### status

> **status**: `number`

---

### durationMs

> **durationMs**: `number` \| `null`

---

### account

> **account**: `string`

---

### accountType

> **accountType**: `string`

---

### model

> **model**: `string` \| `null`

---

### provider

> **provider**: `string` \| `null`

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

---

### inputTokens

> **inputTokens**: `number` \| `null`

---

### outputTokens

> **outputTokens**: `number` \| `null`

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

False when the provider reported no cache breakdown. Such a turn is not a
cache miss, so it is excluded from the hit-rate denominator rather than
counted as a zero.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

---

### errorType

> **errorType**: `string` \| `null`

---

### errorCode

> **errorCode**: `string` \| `null`

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`
