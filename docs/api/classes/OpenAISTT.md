[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAISTT

# Class: OpenAISTT

Defined in: [voice/providers/OpenAISTT.ts:28](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L28)

OpenAI Whisper Speech-to-Text Handler

Supports transcription and translation using OpenAI's Whisper model.

## See

https://platform.openai.com/docs/api-reference/audio

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new OpenAISTT**(`apiKey?`): `OpenAISTT`

Defined in: [voice/providers/OpenAISTT.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L42)

#### Parameters

##### apiKey?

`string`

#### Returns

`OpenAISTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `number`

Defined in: [voice/providers/OpenAISTT.ts:35](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L35)

Maximum audio duration in seconds (25 minutes)

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

Defined in: [voice/providers/OpenAISTT.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L40)

Whisper does not support streaming

#### Implementation of

`STTHandler.supportsStreaming`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [voice/providers/OpenAISTT.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L47)

#### Returns

`boolean`

#### Implementation of

`STTHandler.isConfigured`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/providers/OpenAISTT.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L51)

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`STTHandler.getSupportedFormats`

---

### getSupportedLanguages()

> **getSupportedLanguages**(): `Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

Defined in: [voice/providers/OpenAISTT.ts:69](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L69)

#### Returns

`Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Implementation of

`STTHandler.getSupportedLanguages`

---

### transcribe()

> **transcribe**(`audio`, `options?`): `Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

Defined in: [voice/providers/OpenAISTT.ts:148](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/OpenAISTT.ts#L148)

#### Parameters

##### audio

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

##### options?

[`STTOptions`](../type-aliases/STTOptions.md) = `{}`

#### Returns

`Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

#### Implementation of

`STTHandler.transcribe`
