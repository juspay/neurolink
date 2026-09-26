[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AzureSTT

# Class: AzureSTT

Azure Cognitive Services Speech-to-Text Handler

Supports speech recognition with custom models and detailed output.

## See

https://docs.microsoft.com/azure/cognitive-services/speech-service/

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new AzureSTT**(`apiKey?`, `region?`): `AzureSTT`

#### Parameters

##### apiKey?

`string`

##### region?

`string`

#### Returns

`AzureSTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `60` = `60`

Maximum audio duration in seconds (60s — Azure's REST API for short audio
documented limit on `/speech/recognition/conversation/cognitiveservices/v1`).
For longer audio, use Azure Batch Transcription (not yet implemented) or
pre-segment the input.

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

Azure STT implementation buffers chunks via REST — not true streaming

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

Streaming transcription (placeholder - requires SDK)

#### Parameters

##### audioStream

`AsyncIterable`\<`Buffer`\<`ArrayBufferLike`\>\>

##### options

[`STTOptions`](../type-aliases/STTOptions.md)

#### Returns

`AsyncIterable`\<[`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)\>

#### Implementation of

`STTHandler.transcribeStream`
