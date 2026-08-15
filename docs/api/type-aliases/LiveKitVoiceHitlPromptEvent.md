[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceHitlPromptEvent

# Type Alias: LiveKitVoiceHitlPromptEvent

> **LiveKitVoiceHitlPromptEvent** = `object`

Defined in: [types/livekit.ts:292](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L292)

A human-in-the-loop confirmation the user must approve or reject.

## Properties

### type

> **type**: `"hitl-prompt"`

Defined in: [types/livekit.ts:293](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L293)

---

### data

> **data**: `object`

Defined in: [types/livekit.ts:294](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L294)

#### confirmationId

> **confirmationId**: `string`

#### toolName

> **toolName**: `string`

#### actionType?

> `optional` **actionType?**: `string`

#### arguments?

> `optional` **arguments?**: `unknown`

#### timeoutMs?

> `optional` **timeoutMs?**: `number`

#### allowModification?

> `optional` **allowModification?**: `boolean`
