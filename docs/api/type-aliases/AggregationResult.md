[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationResult

# Type Alias: AggregationResult

> **AggregationResult** = `object`

Defined in: [types/evaluation.ts:527](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L527)

Comprehensive aggregation result.

## Properties

### count

> **count**: `number`

Defined in: [types/evaluation.ts:528](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L528)

---

### statistics

> **statistics**: [`ScoreStatistics`](ScoreStatistics.md)

Defined in: [types/evaluation.ts:529](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L529)

---

### distribution

> **distribution**: [`ScoreDistribution`](ScoreDistribution.md)

Defined in: [types/evaluation.ts:530](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L530)

---

### dimensions

> **dimensions**: [`DimensionAnalysis`](DimensionAnalysis.md)

Defined in: [types/evaluation.ts:531](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L531)

---

### sequenceTrend?

> `optional` **sequenceTrend?**: [`TrendAnalysis`](TrendAnalysis.md)

Defined in: [types/evaluation.ts:532](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L532)

---

### alerts

> **alerts**: [`AlertSummary`](AlertSummary.md)

Defined in: [types/evaluation.ts:533](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L533)

---

### passingRate

> **passingRate**: `number`

Defined in: [types/evaluation.ts:534](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L534)

---

### avgEvaluationTime

> **avgEvaluationTime**: `number`

Defined in: [types/evaluation.ts:535](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L535)

---

### metadata

> **metadata**: `object`

Defined in: [types/evaluation.ts:536](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L536)

#### aggregatedAt

> **aggregatedAt**: `string`

#### threshold

> **threshold**: `number`

#### evaluationModels

> **evaluationModels**: `string`[]
