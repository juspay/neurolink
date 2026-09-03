[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AutoEvaluationConfig

# Type Alias: AutoEvaluationConfig

> **AutoEvaluationConfig** = `object`

Defined in: [types/middleware.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L200)

Configuration for the Auto-Evaluation Middleware.

## Properties

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/middleware.ts:202](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L202)

The minimum score (1-10) for a response to be considered passing.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/middleware.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L204)

The maximum number of retry attempts before failing.

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/middleware.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L206)

The model to use for the LLM-as-judge evaluation.

---

### blocking?

> `optional` **blocking?**: `boolean`

Defined in: [types/middleware.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L211)

If true, the middleware will wait for the evaluation to complete before returning.
If the evaluation fails, it will throw an error. Defaults to true.

---

### onEvaluationComplete?

> `optional` **onEvaluationComplete?**: (`evaluation`) => `void` \| `Promise`\<`void`\>

Defined in: [types/middleware.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L213)

A callback function to be invoked with the evaluation result.

#### Parameters

##### evaluation

[`EvaluationData`](EvaluationData.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### offTopicThreshold?

> `optional` **offTopicThreshold?**: `number`

Defined in: [types/middleware.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L215)

The score below which a response is considered off-topic.

---

### highSeverityThreshold?

> `optional` **highSeverityThreshold?**: `number`

Defined in: [types/middleware.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L217)

The score below which a failing response is considered a high severity alert.

---

### promptGenerator?

> `optional` **promptGenerator?**: [`GetPromptFunction`](GetPromptFunction.md)

Defined in: [types/middleware.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L219)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/middleware.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L221)
