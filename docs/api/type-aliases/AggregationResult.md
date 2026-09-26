[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationResult

# Type Alias: AggregationResult

> **AggregationResult** = `object`

Comprehensive aggregation result.

## Properties

### count

> **count**: `number`

---

### statistics

> **statistics**: [`ScoreStatistics`](ScoreStatistics.md)

---

### distribution

> **distribution**: [`ScoreDistribution`](ScoreDistribution.md)

---

### dimensions

> **dimensions**: [`DimensionAnalysis`](DimensionAnalysis.md)

---

### sequenceTrend?

> `optional` **sequenceTrend?**: [`TrendAnalysis`](TrendAnalysis.md)

---

### alerts

> **alerts**: [`AlertSummary`](AlertSummary.md)

---

### passingRate

> **passingRate**: `number`

---

### avgEvaluationTime

> **avgEvaluationTime**: `number`

---

### metadata

> **metadata**: `object`

#### aggregatedAt

> **aggregatedAt**: `string`

#### threshold

> **threshold**: `number`

#### evaluationModels

> **evaluationModels**: `string`[]
