[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetricsCollector

# Class: MetricsCollector

Metrics collector for evaluation data

## Constructors

### Constructor

> **new MetricsCollector**(): `MetricsCollector`

#### Returns

`MetricsCollector`

## Methods

### recordScorer()

> **recordScorer**(`scorerId`, `scorerName`, `result`): `void`

Record a scorer execution

#### Parameters

##### scorerId

`string`

##### scorerName

`string`

##### result

[`ScoreResult`](../type-aliases/ScoreResult.md)

#### Returns

`void`

---

### recordPipeline()

> **recordPipeline**(`result`): `void`

Record a pipeline execution

#### Parameters

##### result

[`PipelineResult`](../type-aliases/PipelineResult.md)

#### Returns

`void`

---

### getMetrics()

> **getMetrics**(): [`AggregatedMetrics`](../type-aliases/AggregatedMetrics.md)

Get aggregated metrics

#### Returns

[`AggregatedMetrics`](../type-aliases/AggregatedMetrics.md)

---

### getScorerMetrics()

> **getScorerMetrics**(`scorerId`): [`ScorerMetrics`](../type-aliases/ScorerMetrics.md) \| `undefined`

Get metrics for a specific scorer

#### Parameters

##### scorerId

`string`

#### Returns

[`ScorerMetrics`](../type-aliases/ScorerMetrics.md) \| `undefined`

---

### getPipelineMetrics()

> **getPipelineMetrics**(`pipelineName`): [`PipelineMetrics`](../type-aliases/PipelineMetrics.md) \| `undefined`

Get metrics for a specific pipeline

#### Parameters

##### pipelineName

`string`

#### Returns

[`PipelineMetrics`](../type-aliases/PipelineMetrics.md) \| `undefined`

---

### getSummary()

> **getSummary**(): `object`

Get summary statistics

#### Returns

`object`

##### totalEvaluations

> **totalEvaluations**: `number`

##### passRate

> **passRate**: `number`

##### averageScore

> **averageScore**: `number`

##### topScorers

> **topScorers**: `object`[]

##### bottomScorers

> **bottomScorers**: `object`[]

---

### exportJson()

> **exportJson**(): `string`

Export metrics as JSON

#### Returns

`string`

---

### reset()

> **reset**(): `void`

Reset all metrics

#### Returns

`void`
