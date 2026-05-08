[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TimeWindowStats

# Type Alias: TimeWindowStats

> **TimeWindowStats** = `object`

Defined in: [types/observability.ts:555](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L555)

Aggregated metrics for a single time window.

## Properties

### windowStart

> **windowStart**: `Date`

Defined in: [types/observability.ts:556](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L556)

---

### windowEnd

> **windowEnd**: `Date`

Defined in: [types/observability.ts:557](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L557)

---

### windowDurationMs

> **windowDurationMs**: `number`

Defined in: [types/observability.ts:558](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L558)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/observability.ts:559](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L559)

---

### errorCount

> **errorCount**: `number`

Defined in: [types/observability.ts:560](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L560)

---

### successRate

> **successRate**: `number`

Defined in: [types/observability.ts:561](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L561)

---

### throughput

> **throughput**: `number`

Defined in: [types/observability.ts:562](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L562)

---

### latency

> **latency**: [`LatencyStats`](LatencyStats.md)

Defined in: [types/observability.ts:563](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L563)

---

### tokens

> **tokens**: [`TokenUsageStats`](TokenUsageStats.md)

Defined in: [types/observability.ts:564](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L564)

---

### costByProvider

> **costByProvider**: `Map`\<`string`, [`ProviderCostStats`](ProviderCostStats.md)\>

Defined in: [types/observability.ts:565](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L565)

---

### costByModel

> **costByModel**: `Map`\<`string`, [`ModelCostStats`](ModelCostStats.md)\>

Defined in: [types/observability.ts:566](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L566)
