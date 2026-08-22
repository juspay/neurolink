[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceToolResultEvent

# Type Alias: LiveKitVoiceToolResultEvent

> **LiveKitVoiceToolResultEvent** = `object`

Defined in: [types/livekit.ts:271](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L271)

A tool invocation has finished. `result` carries the tool's structured
output (for example, a chart payload) for the client to render.

## Properties

### type

> **type**: `"tool-result"`

Defined in: [types/livekit.ts:272](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L272)

---

### data

> **data**: `object`

Defined in: [types/livekit.ts:273](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L273)

#### id?

> `optional` **id?**: `string`

#### name

> **name**: `string`

#### result?

> `optional` **result?**: `unknown`

#### success?

> `optional` **success?**: `boolean`

#### error?

> `optional` **error?**: `string`
