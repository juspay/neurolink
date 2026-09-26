[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeResponse

# Type Alias: ClaudeResponse

> **ClaudeResponse** = `object`

Non-streaming response matching the Claude Messages API.

## Properties

### id

> **id**: `string`

---

### type

> **type**: `"message"`

---

### role

> **role**: `"assistant"`

---

### content

> **content**: [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

---

### model

> **model**: `string`

---

### stop_reason

> **stop_reason**: `string` \| `null`

---

### stop_sequence

> **stop_sequence**: `string` \| `null`

---

### usage

> **usage**: [`ClaudeUsage`](ClaudeUsage.md)
