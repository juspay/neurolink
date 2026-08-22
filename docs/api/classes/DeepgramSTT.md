[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeepgramSTT

# Class: DeepgramSTT

Defined in: [voice/providers/DeepgramSTT.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L30)

Deepgram Speech-to-Text Handler

Supports real-time streaming, speaker diarization, and smart formatting.

## See

https://developers.deepgram.com/docs

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new DeepgramSTT**(`apiKey?`): `DeepgramSTT`

Defined in: [voice/providers/DeepgramSTT.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L44)

#### Parameters

##### apiKey?

`string`

#### Returns

`DeepgramSTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `7200` = `7200`

Defined in: [voice/providers/DeepgramSTT.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L37)

Maximum audio duration in seconds (2 hours)

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `true` = `true`

Defined in: [voice/providers/DeepgramSTT.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L42)

Deepgram supports streaming

#### Implementation of

`STTHandler.supportsStreaming`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [voice/providers/DeepgramSTT.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L52)

#### Returns

`boolean`

#### Implementation of

`STTHandler.isConfigured`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/providers/DeepgramSTT.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L56)

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`STTHandler.getSupportedFormats`

---

### getSupportedLanguages()

> **getSupportedLanguages**(): `Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

Defined in: [voice/providers/DeepgramSTT.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L60)

#### Returns

`Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Implementation of

`STTHandler.getSupportedLanguages`

---

### transcribe()

> **transcribe**(`audio`, `options?`): `Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

Defined in: [voice/providers/DeepgramSTT.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L150)

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

Defined in: [voice/providers/DeepgramSTT.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/DeepgramSTT.ts#L380)

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
