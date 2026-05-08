[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetricsSummary

# Type Alias: MetricsSummary

> **MetricsSummary** = `object`

Defined in: [types/observability.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L369)

Aggregated metrics summary

## Properties

### totalSpans

> **totalSpans**: `number`

Defined in: [types/observability.ts:371](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L371)

Total number of spans tracked

---

### successfulSpans

> **successfulSpans**: `number`

Defined in: [types/observability.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L373)

Number of successful spans

---

### failedSpans

> **failedSpans**: `number`

Defined in: [types/observability.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L375)

Number of failed spans

---

### successRate

> **successRate**: `number`

Defined in: [types/observability.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L377)

Overall success rate (0-1)

---

### latency

> **latency**: [`LatencyStats`](LatencyStats.md)

Defined in: [types/observability.ts:379](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L379)

Latency statistics

---

### tokens

> **tokens**: [`TokenUsageStats`](TokenUsageStats.md)

Defined in: [types/observability.ts:381](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L381)

Token usage statistics

---

### costByProvider

> **costByProvider**: [`ProviderCostStats`](ProviderCostStats.md)[]

Defined in: [types/observability.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L383)

Cost by provider

---

### costByModel

> **costByModel**: [`ModelCostStats`](ModelCostStats.md)[]

Defined in: [types/observability.ts:385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L385)

Cost by model

---

### totalCost

> **totalCost**: `number`

Defined in: [types/observability.ts:387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L387)

Total cost across all providers

---

### spansByType

> **spansByType**: `Record`\<`string`, `number`\>

Defined in: [types/observability.ts:389](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L389)

Span count by type

---

### firstSpanTime?

> `optional` **firstSpanTime?**: `Date`

Defined in: [types/observability.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L391)

Timestamp of first span

---

### lastSpanTime?

> `optional` **lastSpanTime?**: `Date`

Defined in: [types/observability.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L393)

Timestamp of last span

---

### trackingDurationMs?

> `optional` **trackingDurationMs?**: `number`

Defined in: [types/observability.ts:395](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L395)

Tracking duration in milliseconds
