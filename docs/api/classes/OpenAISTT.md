[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAISTT

# Class: OpenAISTT

OpenAI Whisper Speech-to-Text Handler

Supports transcription and translation using OpenAI's Whisper model.

## See

https://platform.openai.com/docs/api-reference/audio

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new OpenAISTT**(`apiKey?`): `OpenAISTT`

#### Parameters

##### apiKey?

`string`

#### Returns

`OpenAISTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `number`

Maximum audio duration in seconds (25 minutes)

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

Whisper does not support streaming

#### Implementation of

`STTHandler.supportsStreaming`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

#### Returns

`boolean`

#### Implementation of

`STTHandler.isConfigured`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`STTHandler.getSupportedFormats`

---

### getSupportedLanguages()

> **getSupportedLanguages**(): `Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Returns

`Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Implementation of

`STTHandler.getSupportedLanguages`

---

### transcribe()

> **transcribe**(`audio`, `options?`): `Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

#### Parameters

##### audio

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

##### options?

[`STTOptions`](../type-aliases/STTOptions.md) = `{}`

#### Returns

`Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

#### Implementation of

`STTHandler.transcribe`
