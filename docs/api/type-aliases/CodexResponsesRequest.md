[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponsesRequest

# Type Alias: CodexResponsesRequest

> **CodexResponsesRequest** = `object`

Defined in: [types/codex.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L156)

Request shape used to bridge Anthropic Messages traffic to Codex Responses.

## Properties

### model

> **model**: `string`

Defined in: [types/codex.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L157)

---

### input

> **input**: [`CodexResponsesInputItem`](CodexResponsesInputItem.md)[]

Defined in: [types/codex.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L158)

---

### stream

> **stream**: `true`

Defined in: [types/codex.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L159)

---

### store

> **store**: `false`

Defined in: [types/codex.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L160)

---

### instructions?

> `optional` **instructions?**: `string`

Defined in: [types/codex.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L161)

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/codex.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L162)

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

Defined in: [types/codex.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L168)
