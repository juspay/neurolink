[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceMemoryBinding

# Type Alias: VoiceMemoryBinding

> **VoiceMemoryBinding** = `object`

A signed memory binding as it appears in room metadata under `memory`.

## Properties

### userId

> **userId**: `string`

---

### sessionId

> **sessionId**: `string`

---

### exp

> **exp**: `number`

Expiry, Unix seconds.

---

### sig

> **sig**: `string`

base64url(HMAC-SHA256) over the room name, userId, sessionId and exp.
