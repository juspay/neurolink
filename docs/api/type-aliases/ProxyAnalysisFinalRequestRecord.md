[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2612)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2613)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2614)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2615)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2616)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2617)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2618)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2619)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2620)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2621)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2622)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2623)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2624)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2625)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2626)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2627)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2628)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2629)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2630)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2631)
