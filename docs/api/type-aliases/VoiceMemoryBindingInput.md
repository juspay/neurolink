[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceMemoryBindingInput

# Type Alias: VoiceMemoryBindingInput

> **VoiceMemoryBindingInput** = `object`

Input to `signVoiceMemoryBinding`.

## Properties

### room

> **room**: `string`

The LiveKit room name the binding is for.

---

### userId

> **userId**: `string`

---

### sessionId

> **sessionId**: `string`

---

### secret

> **secret**: `string`

---

### ttlSeconds?

> `optional` **ttlSeconds?**: `number`

Lifetime in seconds (default 7200, at most 86400).

---

### now?

> `optional` **now?**: `number`

Current time, Unix seconds (default: now).
