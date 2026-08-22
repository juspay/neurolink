[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierGenerateOptions

# Type Alias: ClassifierGenerateOptions

> **ClassifierGenerateOptions** = `object`

Defined in: [types/classifierRouter.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L179)

Minimal options accepted by the injected LLM-classifier `generate` fn.

## Properties

### input

> **input**: `object`

Defined in: [types/classifierRouter.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L180)

#### text

> **text**: `string`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/classifierRouter.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L181)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/classifierRouter.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L182)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L183)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/classifierRouter.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L184)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/classifierRouter.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L185)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/classifierRouter.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L186)

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/classifierRouter.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L187)

---

### schema?

> `optional` **schema?**: [`ValidationSchema`](ValidationSchema.md)

Defined in: [types/classifierRouter.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L188)

---

### timeout?

> `optional` **timeout?**: `number` \| `string`

Defined in: [types/classifierRouter.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L189)

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Defined in: [types/classifierRouter.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L190)
