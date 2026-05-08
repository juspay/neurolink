[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineConfig

# Type Alias: PipelineConfig

> **PipelineConfig** = `object`

Defined in: [types/scorer.ts:339](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L339)

Pipeline configuration for multi-scorer evaluation

## Properties

### name?

> `optional` **name?**: `string`

Defined in: [types/scorer.ts:341](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L341)

Pipeline name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/scorer.ts:343](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L343)

Pipeline description

---

### scorers

> **scorers**: `object`[]

Defined in: [types/scorer.ts:345](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L345)

Scorers to run in the pipeline

#### id

> **id**: `string`

#### config?

> `optional` **config?**: [`ScorerConfig`](ScorerConfig.md)

---

### aggregation?

> `optional` **aggregation?**: [`AggregationConfig`](AggregationConfig.md)

Defined in: [types/scorer.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L347)

Aggregation configuration

---

### passThreshold?

> `optional` **passThreshold?**: `number`

Defined in: [types/scorer.ts:349](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L349)

Overall pass threshold

---

### executionMode?

> `optional` **executionMode?**: `"parallel"` \| `"sequential"`

Defined in: [types/scorer.ts:351](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L351)

Execution mode

---

### stopOnFailure?

> `optional` **stopOnFailure?**: `boolean`

Defined in: [types/scorer.ts:353](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L353)

Stop on first failure

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/scorer.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L355)

Timeout for entire pipeline (ms)

---

### requiredScorers?

> `optional` **requiredScorers?**: `string`[]

Defined in: [types/scorer.ts:357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L357)

Required scorers that must pass
