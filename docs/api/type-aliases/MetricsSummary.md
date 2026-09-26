[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetricsSummary

# Type Alias: MetricsSummary

> **MetricsSummary** = `object`

Aggregated metrics summary

## Properties

### totalSpans

> **totalSpans**: `number`

Total number of spans tracked

---

### successfulSpans

> **successfulSpans**: `number`

Number of successful spans

---

### failedSpans

> **failedSpans**: `number`

Number of failed spans

---

### successRate

> **successRate**: `number`

Overall success rate (0-1)

---

### latency

> **latency**: [`LatencyStats`](LatencyStats.md)

Latency statistics

---

### tokens

> **tokens**: [`TokenUsageStats`](TokenUsageStats.md)

Token usage statistics

---

### costByProvider

> **costByProvider**: [`ProviderCostStats`](ProviderCostStats.md)[]

Cost by provider

---

### costByModel

> **costByModel**: [`ModelCostStats`](ModelCostStats.md)[]

Cost by model

---

### totalCost

> **totalCost**: `number`

Total cost across all providers

---

### spansByType

> **spansByType**: `Record`\<`string`, `number`\>

Span count by type

---

### firstSpanTime?

> `optional` **firstSpanTime?**: `Date`

Timestamp of first span

---

### lastSpanTime?

> `optional` **lastSpanTime?**: `Date`

Timestamp of last span

---

### trackingDurationMs?

> `optional` **trackingDurationMs?**: `number`

Tracking duration in milliseconds
