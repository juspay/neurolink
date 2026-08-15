[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedMetrics

# Type Alias: AggregatedMetrics

> **AggregatedMetrics** = `object`

Defined in: [types/evaluation.ts:754](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L754)

Aggregated metrics across pipelines and scorers.

## Properties

### totalEvaluations

> **totalEvaluations**: `number`

Defined in: [types/evaluation.ts:755](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L755)

---

### overallPassRate

> **overallPassRate**: `number`

Defined in: [types/evaluation.ts:756](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L756)

---

### averageScore

> **averageScore**: `number`

Defined in: [types/evaluation.ts:757](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L757)

---

### averageDuration

> **averageDuration**: `number`

Defined in: [types/evaluation.ts:758](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L758)

---

### scoreDistribution

> **scoreDistribution**: `object`

Defined in: [types/evaluation.ts:759](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L759)

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

Defined in: [types/evaluation.ts:766](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L766)

---

### scorerMetrics

> **scorerMetrics**: `Map`\<`string`, [`ScorerMetrics`](ScorerMetrics.md)\>

Defined in: [types/evaluation.ts:767](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L767)

---

### collectionStartTime

> **collectionStartTime**: `number`

Defined in: [types/evaluation.ts:768](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L768)

---

### lastUpdateTime

> **lastUpdateTime**: `number`

Defined in: [types/evaluation.ts:769](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L769)
