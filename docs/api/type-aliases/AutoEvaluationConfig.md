[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AutoEvaluationConfig

# Type Alias: AutoEvaluationConfig

> **AutoEvaluationConfig** = `object`

Defined in: [types/middleware.ts:176](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L176)

Configuration for the Auto-Evaluation Middleware.

## Properties

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/middleware.ts:178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L178)

The minimum score (1-10) for a response to be considered passing.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/middleware.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L180)

The maximum number of retry attempts before failing.

---

### evaluationModel?

> `optional` **evaluationModel?**: `string`

Defined in: [types/middleware.ts:182](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L182)

The model to use for the LLM-as-judge evaluation.

---

### blocking?

> `optional` **blocking?**: `boolean`

Defined in: [types/middleware.ts:187](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L187)

If true, the middleware will wait for the evaluation to complete before returning.
If the evaluation fails, it will throw an error. Defaults to true.

---

### onEvaluationComplete?

> `optional` **onEvaluationComplete?**: (`evaluation`) => `void` \| `Promise`\<`void`\>

Defined in: [types/middleware.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L189)

A callback function to be invoked with the evaluation result.

#### Parameters

##### evaluation

[`EvaluationData`](EvaluationData.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### offTopicThreshold?

> `optional` **offTopicThreshold?**: `number`

Defined in: [types/middleware.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L191)

The score below which a response is considered off-topic.

---

### highSeverityThreshold?

> `optional` **highSeverityThreshold?**: `number`

Defined in: [types/middleware.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L193)

The score below which a failing response is considered a high severity alert.

---

### promptGenerator?

> `optional` **promptGenerator?**: [`GetPromptFunction`](GetPromptFunction.md)

Defined in: [types/middleware.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L195)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/middleware.ts:197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L197)
