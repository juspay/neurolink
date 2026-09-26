[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

---

### stream?

> `optional` **stream?**: `boolean`

---

### temperature?

> `optional` **temperature?**: `number`

---

### top_p?

> `optional` **top_p?**: `number`

---

### max_tokens?

> `optional` **max_tokens?**: `number`

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

---

### n?

> `optional` **n?**: `number`

---

### response_format?

> `optional` **response_format?**: `object`

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

#### include_usage?

> `optional` **include_usage?**: `boolean`
