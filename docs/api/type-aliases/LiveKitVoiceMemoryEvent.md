[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceMemoryEvent

# Type Alias: LiveKitVoiceMemoryEvent

> **LiveKitVoiceMemoryEvent** = `object`

Something about how the call is being remembered. `not-saved` means a turn
could not be stored after retries; the call carries on, and a client may
show a quiet note on that turn.

## Properties

### type

> **type**: `"memory"`

---

### data

> **data**: `object`

#### state

> **state**: `"not-saved"`

#### turnId

> **turnId**: `string`
