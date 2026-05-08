[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAISessionCreated

# Type Alias: OpenAISessionCreated

> **OpenAISessionCreated** = [`OpenAIRealtimeEvent`](OpenAIRealtimeEvent.md) & `object`

Defined in: [types/stt.ts:682](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L682)

## Type Declaration

### type

> **type**: `"session.created"`

### session

> **session**: `object`

#### session.id

> **id**: `string`

#### session.object

> **object**: `string`

#### session.model

> **model**: `string`

#### session.modalities

> **modalities**: `string`[]

#### session.voice

> **voice**: `string`

#### session.input_audio_format

> **input_audio_format**: `string`

#### session.output_audio_format

> **output_audio_format**: `string`

#### session.turn_detection

> **turn_detection**: `object`

#### session.turn_detection.type

> **type**: `string`

#### session.turn_detection.threshold?

> `optional` **threshold?**: `number`

#### session.turn_detection.prefix_padding_ms?

> `optional` **prefix_padding_ms?**: `number`

#### session.turn_detection.silence_duration_ms?

> `optional` **silence_duration_ms?**: `number`

#### session.tools

> **tools**: `unknown`[]

#### session.tool_choice

> **tool_choice**: `string`

#### session.temperature

> **temperature**: `number`

#### session.max_response_output_tokens

> **max_response_output_tokens**: `string` \| `number`
