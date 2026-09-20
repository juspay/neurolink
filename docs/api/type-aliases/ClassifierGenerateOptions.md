[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierGenerateOptions

# Type Alias: ClassifierGenerateOptions

> **ClassifierGenerateOptions** = `object`

Defined in: [types/classifierRouter.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L333)

Minimal options accepted by the injected LLM-classifier `generate` fn.

## Properties

### input

> **input**: `object`

Defined in: [types/classifierRouter.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L334)

#### text

> **text**: `string`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/classifierRouter.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L335)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/classifierRouter.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L336)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:337](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L337)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/classifierRouter.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L338)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/classifierRouter.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L339)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/classifierRouter.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L340)

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/classifierRouter.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L341)

---

### schema?

> `optional` **schema?**: [`ValidationSchema`](ValidationSchema.md)

Defined in: [types/classifierRouter.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L342)

---

### timeout?

> `optional` **timeout?**: `number` \| `string`

Defined in: [types/classifierRouter.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L343)

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Defined in: [types/classifierRouter.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L344)
