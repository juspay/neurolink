[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceStatusEvent

# Type Alias: LiveKitVoiceStatusEvent

> **LiveKitVoiceStatusEvent** = `object`

Defined in: [types/livekit.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L283)

Coarse agent state, useful for UI indicators (e.g. "thinking…").

## Properties

### type

> **type**: `"status"`

Defined in: [types/livekit.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L284)

---

### data

> **data**: `object`

Defined in: [types/livekit.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L285)

#### state

> **state**: `"thinking"` \| `"speaking"` \| `"listening"` \| `"error"`

#### detail?

> `optional` **detail?**: `string`
