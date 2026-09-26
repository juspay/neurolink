[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientGenerateRequestOptions

# Type Alias: ClientGenerateRequestOptions

> **ClientGenerateRequestOptions** = `object`

Generate request options (client-side version)

## Properties

### input

> **input**: `object`

Input for generation

#### text

> **text**: `string`

#### images?

> `optional` **images?**: `string`[]

#### files?

> `optional` **files?**: `string`[]

---

### provider?

> `optional` **provider?**: `string`

Provider to use

---

### model?

> `optional` **model?**: `string`

Model to use

---

### temperature?

> `optional` **temperature?**: `number`

Temperature for generation

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens to generate

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

System prompt

---

### enableTools?

> `optional` **enableTools?**: `boolean`

Enable tool usage

---

### tools?

> `optional` **tools?**: `string`[]

Specific tools to enable

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

Context data
