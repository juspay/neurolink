[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationConfig

# Type Alias: EvaluationConfig

> **EvaluationConfig** = `object`

Defined in: [types/evaluation.ts:283](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L283)

Configuration for the main `Evaluator` class.

## Properties

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/evaluation.ts:285](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L285)

The minimum score (1-10) for a response to be considered passing.

---

### evaluationStrategy?

> `optional` **evaluationStrategy?**: `"ragas"` \| `"custom"`

Defined in: [types/evaluation.ts:287](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L287)

The evaluation strategy to use. Currently only 'ragas' is supported.

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/evaluation.ts:289](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L289)

The model to use for the LLM-as-judge evaluation.

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/evaluation.ts:291](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L291)

The maximum number of evaluation attempts before failing.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/evaluation.ts:293](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L293)

The provider to use for the evaluation model.

---

### customEvaluator?

> `optional` **customEvaluator?**: (`options`, `result`) => `Promise`\<\{ `evaluationResult`: [`EvaluationResult`](EvaluationResult.md); `evalContext`: [`EnhancedEvaluationContext`](EnhancedEvaluationContext.md); \}\>

Defined in: [types/evaluation.ts:295](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L295)

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

Defined in: [types/evaluation.ts:303](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L303)

The score below which a response is considered off-topic.

---

### highSeverityThreshold?

> `optional` **highSeverityThreshold?**: `number`

Defined in: [types/evaluation.ts:305](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L305)

The score below which a failing response is considered a high severity alert.

---

### promptGenerator?

> `optional` **promptGenerator?**: [`GetPromptFunction`](GetPromptFunction.md)

Defined in: [types/evaluation.ts:307](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L307)

An optional function to generate custom evaluation prompts.
