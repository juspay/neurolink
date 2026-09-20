[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponsesRequest

# Type Alias: CodexResponsesRequest

> **CodexResponsesRequest** = `object`

Defined in: [types/codex.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L177)

Request shape used to bridge Anthropic Messages traffic to Codex Responses.

## Properties

### model

> **model**: `string`

Defined in: [types/codex.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L178)

---

### input

> **input**: [`CodexResponsesInputItem`](CodexResponsesInputItem.md)[]

Defined in: [types/codex.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L179)

---

### stream

> **stream**: `true`

Defined in: [types/codex.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L180)

---

### store

> **store**: `false`

Defined in: [types/codex.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L181)

---

### prompt_cache_key?

> `optional` **prompt_cache_key?**: `string`

Defined in: [types/codex.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L183)

Pins one conversation to the cache that already holds its prefix.

---

### reasoning?

> `optional` **reasoning?**: `object`

Defined in: [types/codex.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L184)

#### effort

> **effort**: [`CodexReasoningEffort`](CodexReasoningEffort.md)

---

### instructions?

> `optional` **instructions?**: `string`

Defined in: [types/codex.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L185)

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/codex.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L186)

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

Defined in: [types/codex.ts:192](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L192)
