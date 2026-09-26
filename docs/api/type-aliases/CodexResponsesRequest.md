[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponsesRequest

# Type Alias: CodexResponsesRequest

> **CodexResponsesRequest** = `object`

Request shape used to bridge Anthropic Messages traffic to Codex Responses.

## Properties

### model

> **model**: `string`

---

### input

> **input**: [`CodexResponsesInputItem`](CodexResponsesInputItem.md)[]

---

### stream

> **stream**: `true`

---

### store

> **store**: `false`

---

### prompt_cache_key?

> `optional` **prompt_cache_key?**: `string`

Pins one conversation to the cache that already holds its prefix.

---

### reasoning?

> `optional` **reasoning?**: `object`

#### effort

> **effort**: [`CodexReasoningEffort`](CodexReasoningEffort.md)

---

### instructions?

> `optional` **instructions?**: `string`

---

### tools?

> `optional` **tools?**: `object`[]

#### type

> **type**: `"function"`

#### name

> **name**: `string`

#### description?

> `optional` **description?**: `string`

#### parameters

> **parameters**: `Record`\<`string`, `unknown`\>

---

### tool_choice?

> `optional` **tool_choice?**: `"auto"` \| `"required"` \| `"none"` \| \{ `type`: `"function"`; `name`: `string`; \}
