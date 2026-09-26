[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationEvents

# Type Alias: EvaluationEvents

> **EvaluationEvents** = `object`

Events emitted by the evaluation pipeline.

## Properties

### scorer:start

> **scorer:start**: `object`

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

#### pipelineName

> **pipelineName**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `number`

#### traceContext?

> `optional` **traceContext?**: [`EvaluationTraceContext`](EvaluationTraceContext.md)
