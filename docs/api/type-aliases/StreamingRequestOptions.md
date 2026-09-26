[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingRequestOptions

# Type Alias: StreamingRequestOptions

> **StreamingRequestOptions** = `object`

Streaming request options

## Properties

### input

> **input**: `object` & [`UnknownRecord`](UnknownRecord.md)

Input text or data

#### Type Declaration

##### text

> **text**: `string`

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

Temperature

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

System prompt

---

### enableTools?

> `optional` **enableTools?**: `boolean`

Enable tools

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

Context data
