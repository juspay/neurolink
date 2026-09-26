[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiMessage

# Type Alias: GeminiMessage

> **GeminiMessage** = `object`

## Properties

### setup?

> `optional` **setup?**: `object`

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

#### mediaChunks

> **mediaChunks**: `object`[]

---

### clientContent?

> `optional` **clientContent?**: `object`

#### turns

> **turns**: `object`[]

#### turnComplete

> **turnComplete**: `boolean`
