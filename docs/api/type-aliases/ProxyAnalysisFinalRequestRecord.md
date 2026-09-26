[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2679)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2680)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2681)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2682)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2683)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2684)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2685)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2686)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2687)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2688)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2689)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2690)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2691)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2692)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2693)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2694)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2695)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2696)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2697)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2698)
