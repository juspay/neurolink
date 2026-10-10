[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceMemoryBindingVerifyInput

# Type Alias: VoiceMemoryBindingVerifyInput

> **VoiceMemoryBindingVerifyInput** = `object`

Input to `verifyVoiceMemoryBinding`.

## Properties

### roomMetadata

> **roomMetadata**: `string` \| `undefined`

The room's base64(JSON) metadata string.

---

### roomName

> **roomName**: `string` \| `undefined`

The room name as LiveKit reports it for the joined room.

---

### secret

> **secret**: `string` \| `undefined`

---

### now?

> `optional` **now?**: `number`

Current time, Unix seconds (default: now).
