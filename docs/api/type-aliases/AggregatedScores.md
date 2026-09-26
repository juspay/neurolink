[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedScores

# Type Alias: AggregatedScores

> **AggregatedScores** = `object`

Aggregated scores from multiple scorers

## Properties

### scores

> **scores**: [`ScoreResult`](ScoreResult.md)[]

Individual score results

---

### overallScore

> **overallScore**: `number`

Overall aggregated score

---

### aggregationMethod

> **aggregationMethod**: [`AggregationMethod`](AggregationMethod.md)

Aggregation method used

---

### passed

> **passed**: `boolean`

Whether overall evaluation passed

---

### totalComputeTime

> **totalComputeTime**: `number`

Total computation time (ms)

---

### timestamp

> **timestamp**: `number`

Timestamp of evaluation

---

### correlationId?

> `optional` **correlationId?**: `string`

Session/request ID for correlation
