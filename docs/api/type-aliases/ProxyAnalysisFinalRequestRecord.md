[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2538](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2538)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2539](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2539)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2540](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2540)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2541)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2542)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2543)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2544)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2545)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2546)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2547)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2548)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2549)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2550)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2551)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2552)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2553)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2554)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2555)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2556)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2557)
