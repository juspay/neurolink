[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowModelConfig

# Type Alias: WorkflowModelConfig

> **WorkflowModelConfig** = `object`

Defined in: [types/workflow.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L99)

Model configuration for ensemble
Named WorkflowModelConfig to avoid conflict with modelTypes.ModelConfig

## Properties

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/workflow.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L101)

---

### model

> **model**: `string`

Defined in: [types/workflow.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L102)

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/workflow.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L105)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/workflow.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L106)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/workflow.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L107)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/workflow.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L108)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/workflow.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L109)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/workflow.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L112)

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/workflow.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L113)

---

### presencePenalty?

> `optional` **presencePenalty?**: `number`

Defined in: [types/workflow.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L114)

---

### frequencyPenalty?

> `optional` **frequencyPenalty?**: `number`

Defined in: [types/workflow.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L115)

---

### label?

> `optional` **label?**: `string`

Defined in: [types/workflow.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L118)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L119)
