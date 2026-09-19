[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeResponse

# Type Alias: ClaudeResponse

> **ClaudeResponse** = `object`

Defined in: [types/proxy.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L159)

Non-streaming response matching the Claude Messages API.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L160)

---

### type

> **type**: `"message"`

Defined in: [types/proxy.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L161)

---

### role

> **role**: `"assistant"`

Defined in: [types/proxy.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L162)

---

### content

> **content**: [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

Defined in: [types/proxy.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L163)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L164)

---

### stop_reason

> **stop_reason**: `string` \| `null`

Defined in: [types/proxy.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L165)

---

### stop_sequence

> **stop_sequence**: `string` \| `null`

Defined in: [types/proxy.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L166)

---

### usage

> **usage**: [`ClaudeUsage`](ClaudeUsage.md)

Defined in: [types/proxy.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L167)
