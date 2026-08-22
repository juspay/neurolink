[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationEvents

# Type Alias: EvaluationEvents

> **EvaluationEvents** = `object`

Defined in: [types/evaluation.ts:659](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L659)

Events emitted by the evaluation pipeline.

## Properties

### scorer:start

> **scorer:start**: `object`

Defined in: [types/evaluation.ts:660](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L660)

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

Defined in: [types/evaluation.ts:666](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L666)

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

Defined in: [types/evaluation.ts:674](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L674)

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

Defined in: [types/evaluation.ts:681](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L681)

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

Defined in: [types/evaluation.ts:688](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L688)

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

Defined in: [types/evaluation.ts:695](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L695)

#### pipelineName

> **pipelineName**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `number`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)
