[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationResult

# Type Alias: AggregationResult

> **AggregationResult** = `object`

Defined in: [types/evaluation.ts:532](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L532)

Comprehensive aggregation result.

## Properties

### count

> **count**: `number`

Defined in: [types/evaluation.ts:533](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L533)

---

### statistics

> **statistics**: [`ScoreStatistics`](ScoreStatistics.md)

Defined in: [types/evaluation.ts:534](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L534)

---

### distribution

> **distribution**: [`ScoreDistribution`](ScoreDistribution.md)

Defined in: [types/evaluation.ts:535](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L535)

---

### dimensions

> **dimensions**: [`DimensionAnalysis`](DimensionAnalysis.md)

Defined in: [types/evaluation.ts:536](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L536)

---

### sequenceTrend?

> `optional` **sequenceTrend?**: [`TrendAnalysis`](TrendAnalysis.md)

Defined in: [types/evaluation.ts:537](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L537)

---

### alerts

> **alerts**: [`AlertSummary`](AlertSummary.md)

Defined in: [types/evaluation.ts:538](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L538)

---

### passingRate

> **passingRate**: `number`

Defined in: [types/evaluation.ts:539](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L539)

---

### avgEvaluationTime

> **avgEvaluationTime**: `number`

Defined in: [types/evaluation.ts:540](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L540)

---

### metadata

> **metadata**: `object`

Defined in: [types/evaluation.ts:541](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L541)

#### aggregatedAt

> **aggregatedAt**: `string`

#### threshold

> **threshold**: `number`

#### evaluationModels

> **evaluationModels**: `string`[]
