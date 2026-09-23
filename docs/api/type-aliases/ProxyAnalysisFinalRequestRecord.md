[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2609)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2610)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2611)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2612)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2613)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2614)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2615)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2616)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2617)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2618)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2619)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2620)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2621)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2622)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2623)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2624)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2625)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2626)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2627)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2628)
