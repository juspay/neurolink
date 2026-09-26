[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationConfig

# Type Alias: EvaluationConfig

> **EvaluationConfig** = `object`

Configuration for the main `Evaluator` class.

## Properties

### threshold?

> `optional` **threshold?**: `number`

The minimum score (1-10) for a response to be considered passing.

---

### evaluationStrategy?

> `optional` **evaluationStrategy?**: `"ragas"` \| `"custom"`

The evaluation strategy to use. Currently only 'ragas' is supported.

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

The model to use for the LLM-as-judge evaluation.

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

The maximum number of evaluation attempts before failing.

---

### provider?

> `optional` **provider?**: `string`

The provider to use for the evaluation model.

---

### customEvaluator?

> `optional` **customEvaluator?**: (`options`, `result`) => `Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

A custom evaluator function to override the default behavior.

#### Parameters

##### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

##### result

[`GenerateResult`](GenerateResult.md)

#### Returns

`Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

---

### offTopicThreshold?

> `optional` **offTopicThreshold?**: `number`

The score below which a response is considered off-topic.

---

### highSeverityThreshold?

> `optional` **highSeverityThreshold?**: `number`

The score below which a failing response is considered a high severity alert.

---

### promptGenerator?

> `optional` **promptGenerator?**: [`GetPromptFunction`](GetPromptFunction.md)

An optional function to generate custom evaluation prompts.
