[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineConfig

# Type Alias: PipelineConfig

> **PipelineConfig** = `object`

Pipeline configuration for multi-scorer evaluation

## Properties

### name?

> `optional` **name?**: `string`

Pipeline name

---

### description?

> `optional` **description?**: `string`

Pipeline description

---

### scorers

> **scorers**: `object`[]

Scorers to run in the pipeline

#### id

> **id**: `string`

#### config?

> `optional` **config?**: [`ScorerConfig`](ScorerConfig.md)

---

### aggregation?

> `optional` **aggregation?**: [`AggregationConfig`](AggregationConfig.md)

Aggregation configuration

---

### passThreshold?

> `optional` **passThreshold?**: `number`

Overall pass threshold

---

### executionMode?

> `optional` **executionMode?**: `"parallel"` \| `"sequential"`

Execution mode

---

### stopOnFailure?

> `optional` **stopOnFailure?**: `boolean`

Stop on first failure

---

### timeout?

> `optional` **timeout?**: `number`

Timeout for entire pipeline (ms)

---

### requiredScorers?

> `optional` **requiredScorers?**: `string`[]

Required scorers that must pass
