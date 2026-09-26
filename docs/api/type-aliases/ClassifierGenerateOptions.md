[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierGenerateOptions

# Type Alias: ClassifierGenerateOptions

> **ClassifierGenerateOptions** = `object`

Minimal options accepted by the injected LLM-classifier `generate` fn.

## Properties

### input

> **input**: `object`

#### text

> **text**: `string`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### region?

> `optional` **region?**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### disableTools?

> `optional` **disableTools?**: `boolean`

---

### schema?

> `optional` **schema?**: [`ValidationSchema`](ValidationSchema.md)

---

### timeout?

> `optional` **timeout?**: `number` \| `string`

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>
