[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2677)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2678)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2679)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2680)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2681)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2682)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2683)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2684)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2685)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2686)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2687)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2688)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2689)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2690)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2691)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2692)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2693)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2694)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2695)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2696)
