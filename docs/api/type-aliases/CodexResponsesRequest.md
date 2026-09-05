[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponsesRequest

# Type Alias: CodexResponsesRequest

> **CodexResponsesRequest** = `object`

Defined in: [types/codex.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L166)

Request shape used to bridge Anthropic Messages traffic to Codex Responses.

## Properties

### model

> **model**: `string`

Defined in: [types/codex.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L167)

---

### input

> **input**: [`CodexResponsesInputItem`](CodexResponsesInputItem.md)[]

Defined in: [types/codex.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L168)

---

### stream

> **stream**: `true`

Defined in: [types/codex.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L169)

---

### store

> **store**: `false`

Defined in: [types/codex.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L170)

---

### reasoning?

> `optional` **reasoning?**: `object`

Defined in: [types/codex.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L171)

#### effort

> **effort**: [`CodexReasoningEffort`](CodexReasoningEffort.md)

---

### instructions?

> `optional` **instructions?**: `string`

Defined in: [types/codex.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L172)

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/codex.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L173)

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

Defined in: [types/codex.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L179)
