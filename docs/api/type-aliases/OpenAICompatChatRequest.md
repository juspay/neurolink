[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatChatRequest

# Type Alias: OpenAICompatChatRequest

> **OpenAICompatChatRequest** = `object`

## Properties

### model

> **model**: `string`

---

### messages

> **messages**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

---

### stream?

> `optional` **stream?**: `boolean`

---

### stream_options?

> `optional` **stream_options?**: `object`

#### include_usage?

> `optional` **include_usage?**: `boolean`

---

### max_tokens?

> `optional` **max_tokens?**: `number`

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

---

### temperature?

> `optional` **temperature?**: `number`

---

### top_p?

> `optional` **top_p?**: `number`

---

### presence_penalty?

> `optional` **presence_penalty?**: `number`

---

### frequency_penalty?

> `optional` **frequency_penalty?**: `number`

---

### seed?

> `optional` **seed?**: `number`

---

### stop?

> `optional` **stop?**: `string`[]

---

### tools?

> `optional` **tools?**: [`OpenAICompatChatTool`](OpenAICompatChatTool.md)[]

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md)

---

### response_format?

> `optional` **response_format?**: [`OpenAICompatResponseFormat`](OpenAICompatResponseFormat.md)

---

### parallel_tool_calls?

> `optional` **parallel_tool_calls?**: `boolean`

---

### user?

> `optional` **user?**: `string`
