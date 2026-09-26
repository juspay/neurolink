[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2716)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2717)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2718)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2719)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2720)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2721)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2722)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2723)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2724)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2725)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2726)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2727)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2728)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2731)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2738)

False when the provider reported no cache breakdown. Such a turn is not a
cache miss, so it is excluded from the hit-rate denominator rather than
counted as a zero.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2739)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2740)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2741)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2742)
