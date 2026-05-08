[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationEvents

# Type Alias: EvaluationEvents

> **EvaluationEvents** = `object`

Defined in: [types/evaluation.ts:664](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L664)

Events emitted by the evaluation pipeline.

## Properties

### scorer:start

> **scorer:start**: `object`

Defined in: [types/evaluation.ts:665](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L665)

#### scorerId

> **scorerId**: `string`

#### scorerName

> **scorerName**: `string`

#### timestamp

> **timestamp**: `number`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)

---

### scorer:end

> **scorer:end**: `object`

Defined in: [types/evaluation.ts:671](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L671)

#### scorerId

> **scorerId**: `string`

#### scorerName

> **scorerName**: `string`

#### result

> **result**: [`ScoreResult`](ScoreResult.md)

#### timestamp

> **timestamp**: `number`

#### duration

> **duration**: `number`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)

---

### scorer:error

> **scorer:error**: `object`

Defined in: [types/evaluation.ts:679](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L679)

#### scorerId

> **scorerId**: `string`

#### scorerName

> **scorerName**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `number`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)

---

### pipeline:start

> **pipeline:start**: `object`

Defined in: [types/evaluation.ts:686](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L686)

#### pipelineName

> **pipelineName**: `string`

#### scorerCount

> **scorerCount**: `number`

#### timestamp

> **timestamp**: `number`

#### correlationId

> **correlationId**: `string`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)

---

### pipeline:end

> **pipeline:end**: `object`

Defined in: [types/evaluation.ts:693](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L693)

#### pipelineName

> **pipelineName**: `string`

#### result

> **result**: [`PipelineResult`](PipelineResult.md)

#### timestamp

> **timestamp**: `number`

#### duration

> **duration**: `number`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)

---

### pipeline:error

> **pipeline:error**: `object`

Defined in: [types/evaluation.ts:700](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L700)

#### pipelineName

> **pipelineName**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `number`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)
