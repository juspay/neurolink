[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexNativeRequest

# Type Alias: CodexNativeRequest

> **CodexNativeRequest** = `object`

A native Codex Responses request, as sent by the real Codex CLI.

No top-level `session_id`/`thread_id` — real traffic carries neither at
top level, only inside `client_metadata`, which the existing
`Record<string, unknown>` field already covers.

## Properties

### model

> **model**: `string`

---

### input

> **input**: [`CodexNativeInputItem`](CodexNativeInputItem.md)[]

---

### stream

> **stream**: `boolean`

---

### store

> **store**: `boolean`

---

### tool_choice?

> `optional` **tool_choice?**: [`CodexNativeToolChoice`](CodexNativeToolChoice.md)

---

### parallel_tool_calls?

> `optional` **parallel_tool_calls?**: `boolean`

---

### reasoning?

> `optional` **reasoning?**: `object`

#### effort

> **effort**: [`CodexReasoningEffort`](CodexReasoningEffort.md)

#### context?

> `optional` **context?**: `string`

---

### include?

> `optional` **include?**: `string`[]

---

### text?

> `optional` **text?**: `object`

#### verbosity?

> `optional` **verbosity?**: `string`

---

### prompt_cache_key?

> `optional` **prompt_cache_key?**: `string`

---

### client_metadata?

> `optional` **client_metadata?**: `Record`\<`string`, `unknown`\>
