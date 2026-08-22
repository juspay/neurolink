[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AutoEvaluationConfig

# Type Alias: AutoEvaluationConfig

> **AutoEvaluationConfig** = `object`

Defined in: [types/middleware.ts:206](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L206)

Configuration for the Auto-Evaluation Middleware.

## Properties

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/middleware.ts:208](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L208)

The minimum score (1-10) for a response to be considered passing.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/middleware.ts:210](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L210)

The maximum number of retry attempts before failing.

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/middleware.ts:212](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L212)

The model to use for the LLM-as-judge evaluation.

---

### blocking?

> `optional` **blocking?**: `boolean`

Defined in: [types/middleware.ts:217](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L217)

If true, the middleware will wait for the evaluation to complete before returning.
If the evaluation fails, it will throw an error. Defaults to true.

---

### onEvaluationComplete?

> `optional` **onEvaluationComplete?**: (`evaluation`) => `void` \| `Promise`\<`void`\>

Defined in: [types/middleware.ts:219](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L219)

A callback function to be invoked with the evaluation result.

#### Parameters

##### evaluation

[`EvaluationData`](EvaluationData.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### offTopicThreshold?

> `optional` **offTopicThreshold?**: `number`

Defined in: [types/middleware.ts:221](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L221)

The score below which a response is considered off-topic.

---

### highSeverityThreshold?

> `optional` **highSeverityThreshold?**: `number`

Defined in: [types/middleware.ts:223](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L223)

The score below which a failing response is considered a high severity alert.

---

### promptGenerator?

> `optional` **promptGenerator?**: [`GetPromptFunction`](GetPromptFunction.md)

Defined in: [types/middleware.ts:225](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L225)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/middleware.ts:227](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L227)
