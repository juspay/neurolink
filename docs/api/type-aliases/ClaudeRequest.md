[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeRequest

# Type Alias: ClaudeRequest

> **ClaudeRequest** = `object`

Inbound Claude Messages API request body.
Matches POST /v1/messages.

## Properties

### model

> **model**: `string`

---

### messages

> **messages**: [`ClaudeMessage`](ClaudeMessage.md)[]

---

### max_tokens

> **max_tokens**: `number`

---

### system?

> `optional` **system?**: `string` \| [`ClaudeTextBlock`](ClaudeTextBlock.md)[]

---

### temperature?

> `optional` **temperature?**: `number`

---

### top_p?

> `optional` **top_p?**: `number`

---

### top_k?

> `optional` **top_k?**: `number`

---

### stop_sequences?

> `optional` **stop_sequences?**: `string`[]

---

### stream?

> `optional` **stream?**: `boolean`

---

### tools?

> `optional` **tools?**: [`ClaudeTool`](ClaudeTool.md)[]

---

### tool_choice?

> `optional` **tool_choice?**: \{ `type`: `"none"`; \} \| \{ `type`: `"auto"` \| `"any"`; `disable_parallel_tool_use?`: `boolean`; \} \| \{ `type`: `"tool"`; `name`: `string`; `disable_parallel_tool_use?`: `boolean`; \}

---

### thinking?

> `optional` **thinking?**: `object`

#### type

> **type**: `string`

#### budget_tokens?

> `optional` **budget_tokens?**: `number`

---

### metadata?

> `optional` **metadata?**: [`ClaudeMetadata`](ClaudeMetadata.md)
