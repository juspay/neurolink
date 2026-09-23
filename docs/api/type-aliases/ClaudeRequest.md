[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeRequest

# Type Alias: ClaudeRequest

> **ClaudeRequest** = `object`

Defined in: [types/proxy.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L154)

Inbound Claude Messages API request body.
Matches POST /v1/messages.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L155)

---

### messages

> **messages**: [`ClaudeMessage`](ClaudeMessage.md)[]

Defined in: [types/proxy.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L156)

---

### max_tokens

> **max_tokens**: `number`

Defined in: [types/proxy.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L157)

---

### system?

> `optional` **system?**: `string` \| [`ClaudeTextBlock`](ClaudeTextBlock.md)[]

Defined in: [types/proxy.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L158)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L159)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L160)

---

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/proxy.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L161)

---

### stop_sequences?

> `optional` **stop_sequences?**: `string`[]

Defined in: [types/proxy.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L162)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L163)

---

### tools?

> `optional` **tools?**: [`ClaudeTool`](ClaudeTool.md)[]

Defined in: [types/proxy.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L164)

---

### tool_choice?

> `optional` **tool_choice?**: \{ `type`: `"auto"` \| `"any"` \| `"none"`; \} \| \{ `type`: `"tool"`; `name`: `string`; \}

Defined in: [types/proxy.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L165)

---

### thinking?

> `optional` **thinking?**: `object`

Defined in: [types/proxy.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L168)

#### type

> **type**: `string`

#### budget_tokens?

> `optional` **budget_tokens?**: `number`

---

### metadata?

> `optional` **metadata?**: [`ClaudeMetadata`](ClaudeMetadata.md)

Defined in: [types/proxy.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L169)
