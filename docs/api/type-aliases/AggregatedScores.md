[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedScores

# Type Alias: AggregatedScores

> **AggregatedScores** = `object`

Defined in: [types/scorer.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L71)

Aggregated scores from multiple scorers

## Properties

### scores

> **scores**: [`ScoreResult`](ScoreResult.md)[]

Defined in: [types/scorer.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L73)

Individual score results

---

### overallScore

> **overallScore**: `number`

Defined in: [types/scorer.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L75)

Overall aggregated score

---

### aggregationMethod

> **aggregationMethod**: [`AggregationMethod`](AggregationMethod.md)

Defined in: [types/scorer.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L77)

Aggregation method used

---

### passed

> **passed**: `boolean`

Defined in: [types/scorer.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L79)

Whether overall evaluation passed

---

### totalComputeTime

> **totalComputeTime**: `number`

Defined in: [types/scorer.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L81)

Total computation time (ms)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/scorer.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L83)

Timestamp of evaluation

---

### correlationId?

> `optional` **correlationId?**: `string`

Defined in: [types/scorer.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L85)

Session/request ID for correlation
