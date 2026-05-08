[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedMetrics

# Type Alias: AggregatedMetrics

> **AggregatedMetrics** = `object`

Defined in: [types/evaluation.ts:759](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L759)

Aggregated metrics across pipelines and scorers.

## Properties

### totalEvaluations

> **totalEvaluations**: `number`

Defined in: [types/evaluation.ts:760](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L760)

---

### overallPassRate

> **overallPassRate**: `number`

Defined in: [types/evaluation.ts:761](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L761)

---

### averageScore

> **averageScore**: `number`

Defined in: [types/evaluation.ts:762](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L762)

---

### averageDuration

> **averageDuration**: `number`

Defined in: [types/evaluation.ts:763](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L763)

---

### scoreDistribution

> **scoreDistribution**: `object`

Defined in: [types/evaluation.ts:764](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L764)

#### excellent

> **excellent**: `number`

#### good

> **good**: `number`

#### fair

> **fair**: `number`

#### poor

> **poor**: `number`

#### failing

> **failing**: `number`

---

### pipelineMetrics

> **pipelineMetrics**: `Map`\<`string`, [`PipelineMetrics`](PipelineMetrics.md)\>

Defined in: [types/evaluation.ts:771](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L771)

---

### scorerMetrics

> **scorerMetrics**: `Map`\<`string`, [`ScorerMetrics`](ScorerMetrics.md)\>

Defined in: [types/evaluation.ts:772](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L772)

---

### collectionStartTime

> **collectionStartTime**: `number`

Defined in: [types/evaluation.ts:773](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L773)

---

### lastUpdateTime

> **lastUpdateTime**: `number`

Defined in: [types/evaluation.ts:774](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L774)
