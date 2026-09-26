[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedMetrics

# Type Alias: AggregatedMetrics

> **AggregatedMetrics** = `object`

Aggregated metrics across pipelines and scorers.

## Properties

### totalEvaluations

> **totalEvaluations**: `number`

---

### overallPassRate

> **overallPassRate**: `number`

---

### averageScore

> **averageScore**: `number`

---

### averageDuration

> **averageDuration**: `number`

---

### scoreDistribution

> **scoreDistribution**: `object`

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

---

### scorerMetrics

> **scorerMetrics**: `Map`\<`string`, [`ScorerMetrics`](ScorerMetrics.md)\>

---

### collectionStartTime

> **collectionStartTime**: `number`

---

### lastUpdateTime

> **lastUpdateTime**: `number`
