[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetricsCollector

# Class: MetricsCollector

Defined in: [evaluation/reporting/metricsCollector.ts:17](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L17)

Metrics collector for evaluation data

## Constructors

### Constructor

> **new MetricsCollector**(): `MetricsCollector`

#### Returns

`MetricsCollector`

## Methods

### recordScorer()

> **recordScorer**(`scorerId`, `scorerName`, `result`): `void`

Defined in: [evaluation/reporting/metricsCollector.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L34)

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

Defined in: [evaluation/reporting/metricsCollector.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L53)

Record a pipeline execution

#### Parameters

##### result

[`PipelineResult`](../type-aliases/PipelineResult.md)

#### Returns

`void`

---

### getMetrics()

> **getMetrics**(): [`AggregatedMetrics`](../type-aliases/AggregatedMetrics.md)

Defined in: [evaluation/reporting/metricsCollector.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L72)

Get aggregated metrics

#### Returns

[`AggregatedMetrics`](../type-aliases/AggregatedMetrics.md)

---

### getScorerMetrics()

> **getScorerMetrics**(`scorerId`): [`ScorerMetrics`](../type-aliases/ScorerMetrics.md) \| `undefined`

Defined in: [evaluation/reporting/metricsCollector.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L102)

Get metrics for a specific scorer

#### Parameters

##### scorerId

`string`

#### Returns

[`ScorerMetrics`](../type-aliases/ScorerMetrics.md) \| `undefined`

---

### getPipelineMetrics()

> **getPipelineMetrics**(`pipelineName`): [`PipelineMetrics`](../type-aliases/PipelineMetrics.md) \| `undefined`

Defined in: [evaluation/reporting/metricsCollector.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L109)

Get metrics for a specific pipeline

#### Parameters

##### pipelineName

`string`

#### Returns

[`PipelineMetrics`](../type-aliases/PipelineMetrics.md) \| `undefined`

---

### getSummary()

> **getSummary**(): `object`

Defined in: [evaluation/reporting/metricsCollector.ts:116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L116)

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

Defined in: [evaluation/reporting/metricsCollector.ts:150](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L150)

Export metrics as JSON

#### Returns

`string`

---

### reset()

> **reset**(): `void`

Defined in: [evaluation/reporting/metricsCollector.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/reporting/metricsCollector.ts#L192)

Reset all metrics

#### Returns

`void`
