[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TimeWindowStats

# Type Alias: TimeWindowStats

> **TimeWindowStats** = `object`

Aggregated metrics for a single time window.

## Properties

### windowStart

> **windowStart**: `Date`

---

### windowEnd

> **windowEnd**: `Date`

---

### windowDurationMs

> **windowDurationMs**: `number`

---

### requestCount

> **requestCount**: `number`

---

### errorCount

> **errorCount**: `number`

---

### successRate

> **successRate**: `number`

---

### throughput

> **throughput**: `number`

---

### latency

> **latency**: [`LatencyStats`](LatencyStats.md)

---

### tokens

> **tokens**: [`TokenUsageStats`](TokenUsageStats.md)

---

### costByProvider

> **costByProvider**: `Map`\<`string`, [`ProviderCostStats`](ProviderCostStats.md)\>

---

### costByModel

> **costByModel**: `Map`\<`string`, [`ModelCostStats`](ModelCostStats.md)\>
