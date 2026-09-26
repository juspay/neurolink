[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeepgramSTT

# Class: DeepgramSTT

Deepgram Speech-to-Text Handler

Supports real-time streaming, speaker diarization, and smart formatting.

## See

https://developers.deepgram.com/docs

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new DeepgramSTT**(`apiKey?`): `DeepgramSTT`

#### Parameters

##### apiKey?

`string`

#### Returns

`DeepgramSTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `7200` = `7200`

Maximum audio duration in seconds (2 hours)

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `true` = `true`

Deepgram supports streaming

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

---

### transcribeStream()

> **transcribeStream**(`audioStream`, `options`): `AsyncIterable`\<[`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)\>

Streaming transcription using WebSocket

#### Parameters

##### audioStream

`AsyncIterable`\<`Buffer`\<`ArrayBufferLike`\>\>

##### options

[`STTOptions`](../type-aliases/STTOptions.md)

#### Returns

`AsyncIterable`\<[`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)\>

#### Implementation of

`STTHandler.transcribeStream`
