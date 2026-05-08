[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiMessage

# Type Alias: GeminiMessage

> **GeminiMessage** = `object`

Defined in: [types/stt.ts:724](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L724)

## Properties

### setup?

> `optional` **setup?**: `object`

Defined in: [types/stt.ts:725](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L725)

#### model

> **model**: `string`

#### generationConfig?

> `optional` **generationConfig?**: `object`

##### generationConfig.responseModalities?

> `optional` **responseModalities?**: `string`[]

##### generationConfig.speechConfig?

> `optional` **speechConfig?**: `object`

##### generationConfig.speechConfig.voiceConfig?

> `optional` **voiceConfig?**: `object`

##### generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig?

> `optional` **prebuiltVoiceConfig?**: `object`

##### generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName?

> `optional` **voiceName?**: `string`

#### systemInstruction?

> `optional` **systemInstruction?**: `object`

##### systemInstruction.parts

> **parts**: `object`[]

#### tools?

> `optional` **tools?**: `unknown`[]

---

### realtimeInput?

> `optional` **realtimeInput?**: `object`

Defined in: [types/stt.ts:742](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L742)

#### mediaChunks

> **mediaChunks**: `object`[]

---

### clientContent?

> `optional` **clientContent?**: `object`

Defined in: [types/stt.ts:748](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L748)

#### turns

> **turns**: `object`[]

#### turnComplete

> **turnComplete**: `boolean`
