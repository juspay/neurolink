[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AutoEvaluationConfig

# Type Alias: AutoEvaluationConfig

> **AutoEvaluationConfig** = `object`

Configuration for the Auto-Evaluation Middleware.

## Properties

### threshold?

> `optional` **threshold?**: `number`

The minimum score (1-10) for a response to be considered passing.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

The maximum number of retry attempts before failing.

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

The model to use for the LLM-as-judge evaluation.

---

### blocking?

> `optional` **blocking?**: `boolean`

If true, the middleware will wait for the evaluation to complete before returning.
If the evaluation fails, it will throw an error. Defaults to true.

---

### onEvaluationComplete?

> `optional` **onEvaluationComplete?**: (`evaluation`) => `void` \| `Promise`\<`void`\>

A callback function to be invoked with the evaluation result.

#### Parameters

##### evaluation

[`EvaluationData`](EvaluationData.md)

#### Returns

`void` \| `Promise`\<`void`\>

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

---

### provider?

> `optional` **provider?**: `string`
