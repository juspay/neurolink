[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatChatStreamChunk

# Type Alias: OpenAICompatChatStreamChunk

> **OpenAICompatChatStreamChunk** = `object`

## Properties

### id?

> `optional` **id?**: `string`

---

### object?

> `optional` **object?**: `string`

---

### created?

> `optional` **created?**: `number`

---

### model?

> `optional` **model?**: `string`

---

### choices

> **choices**: [`OpenAICompatStreamChunkChoice`](OpenAICompatStreamChunkChoice.md)[]

---

### error?

> `optional` **error?**: `object`

#### message?

> `optional` **message?**: `string`

#### type?

> `optional` **type?**: `string`

#### code?

> `optional` **code?**: `string` \| `number`

---

### usage?

> `optional` **usage?**: [`OpenAICompatUsage`](OpenAICompatUsage.md)
