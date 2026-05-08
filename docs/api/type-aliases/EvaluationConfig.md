[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationConfig

# Type Alias: EvaluationConfig

> **EvaluationConfig** = `object`

Defined in: [types/evaluation.ts:288](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L288)

Configuration for the main `Evaluator` class.

## Properties

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/evaluation.ts:290](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L290)

The minimum score (1-10) for a response to be considered passing.

---

### evaluationStrategy?

> `optional` **evaluationStrategy?**: `"ragas"` \| `"custom"`

Defined in: [types/evaluation.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L292)

The evaluation strategy to use. Currently only 'ragas' is supported.

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/evaluation.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L294)

The model to use for the LLM-as-judge evaluation.

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/evaluation.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L296)

The maximum number of evaluation attempts before failing.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/evaluation.ts:298](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L298)

The provider to use for the evaluation model.

---

### customEvaluator?

> `optional` **customEvaluator?**: (`options`, `result`) => `Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

Defined in: [types/evaluation.ts:300](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L300)

A custom evaluator function to override the default behavior.

#### Parameters

##### options

`LanguageModelV3CallOptions`

##### result

[`GenerateResult`](GenerateResult.md)

#### Returns

`Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

---

### offTopicThreshold?

> `optional` **offTopicThreshold?**: `number`

Defined in: [types/evaluation.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L308)

The score below which a response is considered off-topic.

---

### highSeverityThreshold?

> `optional` **highSeverityThreshold?**: `number`

Defined in: [types/evaluation.ts:310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L310)

The score below which a failing response is considered a high severity alert.

---

### promptGenerator?

> `optional` **promptGenerator?**: [`GetPromptFunction`](GetPromptFunction.md)

Defined in: [types/evaluation.ts:312](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L312)

An optional function to generate custom evaluation prompts.
