[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeResponse

# Type Alias: ClaudeResponse

> **ClaudeResponse** = `object`

Defined in: [types/proxy.ts:153](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L153)

Non-streaming response matching the Claude Messages API.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:154](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L154)

---

### type

> **type**: `"message"`

Defined in: [types/proxy.ts:155](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L155)

---

### role

> **role**: `"assistant"`

Defined in: [types/proxy.ts:156](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L156)

---

### content

> **content**: [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

Defined in: [types/proxy.ts:157](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L157)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:158](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L158)

---

### stop_reason

> **stop_reason**: `string` \| `null`

Defined in: [types/proxy.ts:159](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L159)

---

### stop_sequence

> **stop_sequence**: `string` \| `null`

Defined in: [types/proxy.ts:160](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L160)

---

### usage

> **usage**: [`ClaudeUsage`](ClaudeUsage.md)

Defined in: [types/proxy.ts:161](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L161)
