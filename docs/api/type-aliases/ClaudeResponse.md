[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeResponse

# Type Alias: ClaudeResponse

> **ClaudeResponse** = `object`

Defined in: [types/proxy.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L185)

Non-streaming response matching the Claude Messages API.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L186)

---

### type

> **type**: `"message"`

Defined in: [types/proxy.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L187)

---

### role

> **role**: `"assistant"`

Defined in: [types/proxy.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L188)

---

### content

> **content**: [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

Defined in: [types/proxy.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L189)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L190)

---

### stop_reason

> **stop_reason**: `string` \| `null`

Defined in: [types/proxy.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L191)

---

### stop_sequence

> **stop_sequence**: `string` \| `null`

Defined in: [types/proxy.ts:192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L192)

---

### usage

> **usage**: [`ClaudeUsage`](ClaudeUsage.md)

Defined in: [types/proxy.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L193)
