[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAnalysisFinalRequestRecord

# Type Alias: ProxyAnalysisFinalRequestRecord

> **ProxyAnalysisFinalRequestRecord** = `object`

Defined in: [types/proxy.ts:2706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2706)

Final request fields retained while joining offline proxy log records.

## Properties

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:2707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2707)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:2708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2708)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:2709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2709)

---

### firstUsefulOutputMs

> **firstUsefulOutputMs**: `number` \| `null`

Defined in: [types/proxy.ts:2710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2710)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:2711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2711)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:2712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2712)

---

### durationMs

> **durationMs**: `number` \| `null`

Defined in: [types/proxy.ts:2713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2713)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:2714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2714)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:2715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2715)

---

### model

> **model**: `string` \| `null`

Defined in: [types/proxy.ts:2716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2716)

---

### provider

> **provider**: `string` \| `null`

Defined in: [types/proxy.ts:2717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2717)

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:2718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2718)

---

### inputTokens

> **inputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2719)

---

### outputTokens

> **outputTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2720)

---

### cacheReadTokens

> **cacheReadTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2721)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number` \| `null`

Defined in: [types/proxy.ts:2722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2722)

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2728)

False when the provider reported no cache breakdown. Such a turn is not a
cache miss, so it is excluded from the hit-rate denominator rather than
counted as a zero.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

---

### errorType

> **errorType**: `string` \| `null`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

---

### errorCode

> **errorCode**: `string` \| `null`

Defined in: [types/proxy.ts:2731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2731)

---

### routingDecision

> **routingDecision**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md) \| `null`

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)
