[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2589)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2590)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2591)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2592)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2593)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2594)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2595)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2596)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2597)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2598)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2599)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2600)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2601)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2602)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2603)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2604)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2605)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2606)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2607)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2608)
