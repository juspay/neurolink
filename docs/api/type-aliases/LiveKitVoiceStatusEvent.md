[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceStatusEvent

# Type Alias: LiveKitVoiceStatusEvent

> **LiveKitVoiceStatusEvent** = `object`

Defined in: [types/livekit.ts:283](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L283)

Coarse agent state, useful for UI indicators (e.g. "thinking…").

## Properties

### type

> **type**: `"status"`

Defined in: [types/livekit.ts:284](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L284)

---

### data

> **data**: `object`

Defined in: [types/livekit.ts:285](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L285)

#### state

> **state**: `"thinking"` \| `"speaking"` \| `"listening"` \| `"error"`

#### detail?

> `optional` **detail?**: `string`
