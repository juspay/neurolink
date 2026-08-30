[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponsesRequest

# Type Alias: CodexResponsesRequest

> **CodexResponsesRequest** = `object`

Defined in: [types/codex.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L138)

Request shape used to bridge Anthropic Messages traffic to Codex Responses.

## Properties

### model

> **model**: `string`

Defined in: [types/codex.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L139)

---

### input

> **input**: [`CodexResponsesInputItem`](CodexResponsesInputItem.md)[]

Defined in: [types/codex.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L140)

---

### stream

> **stream**: `true`

Defined in: [types/codex.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L141)

---

### store

> **store**: `false`

Defined in: [types/codex.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L142)

---

### instructions?

> `optional` **instructions?**: `string`

Defined in: [types/codex.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L143)

---

### tools?

> `optional` **tools?**: `object`[]

Defined in: [types/codex.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L144)

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

Defined in: [types/codex.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L150)
