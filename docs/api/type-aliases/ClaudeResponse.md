[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeResponse

# Type Alias: ClaudeResponse

> **ClaudeResponse** = `object`

Defined in: [types/proxy.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L165)

Non-streaming response matching the Claude Messages API.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L166)

---

### type

> **type**: `"message"`

Defined in: [types/proxy.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L167)

---

### role

> **role**: `"assistant"`

Defined in: [types/proxy.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L168)

---

### content

> **content**: [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

Defined in: [types/proxy.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L169)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L170)

---

### stop_reason

> **stop_reason**: `string` \| `null`

Defined in: [types/proxy.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L171)

---

### stop_sequence

> **stop_sequence**: `string` \| `null`

Defined in: [types/proxy.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L172)

---

### usage

> **usage**: [`ClaudeUsage`](ClaudeUsage.md)

Defined in: [types/proxy.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L173)
