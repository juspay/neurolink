[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AzureSTT

# Class: AzureSTT

Defined in: [voice/providers/AzureSTT.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L29)

Azure Cognitive Services Speech-to-Text Handler

Supports speech recognition with custom models and detailed output.

## See

https://docs.microsoft.com/azure/cognitive-services/speech-service/

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new AzureSTT**(`apiKey?`, `region?`): `AzureSTT`

Defined in: [voice/providers/AzureSTT.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L46)

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

Defined in: [voice/providers/AzureSTT.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L39)

Maximum audio duration in seconds (60s — Azure's REST API for short audio
documented limit on `/speech/recognition/conversation/cognitiveservices/v1`).
For longer audio, use Azure Batch Transcription (not yet implemented) or
pre-segment the input.

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

Defined in: [voice/providers/AzureSTT.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L44)

Azure STT implementation buffers chunks via REST — not true streaming

#### Implementation of

`STTHandler.supportsStreaming`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [voice/providers/AzureSTT.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L57)

#### Returns

`boolean`

#### Implementation of

`STTHandler.isConfigured`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/providers/AzureSTT.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L61)

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`STTHandler.getSupportedFormats`

---

### getSupportedLanguages()

> **getSupportedLanguages**(): `Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

Defined in: [voice/providers/AzureSTT.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L69)

#### Returns

`Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Implementation of

`STTHandler.getSupportedLanguages`

---

### transcribe()

> **transcribe**(`audio`, `options?`): `Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

Defined in: [voice/providers/AzureSTT.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L159)

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

Defined in: [voice/providers/AzureSTT.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/AzureSTT.ts#L312)

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
