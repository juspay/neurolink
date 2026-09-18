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

### reasoning?

> `optional` **reasoning?**: `object`

Defined in: [types/codex.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L182)

#### effort

> **effort**: [`CodexReasoningEffort`](CodexReasoningEffort.md)

---

### instructions?

> `optional` **instructions?**: `string`

Defined in: [types/codex.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L183)

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/codex.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L184)

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

Defined in: [types/codex.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L190)
