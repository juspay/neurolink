[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleSTT

# Class: GoogleSTT

Google Cloud Speech-to-Text Handler

Supports transcription with speaker diarization, word timestamps, and punctuation.

## See

https://cloud.google.com/speech-to-text/docs

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new GoogleSTT**(`apiKey?`, `credentialsPath?`): `GoogleSTT`

#### Parameters

##### apiKey?

`string`

##### credentialsPath?

`string`

#### Returns

`GoogleSTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `60` = `60`

Maximum audio duration in seconds for the synchronous recognize endpoint.
For longer audio, use the async longrunningrecognize endpoint (not yet implemented).

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

True streaming requires gRPC (not yet implemented).
transcribeStream() uses a chunk-and-batch workaround.

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

Streaming transcription (placeholder - requires WebSocket/gRPC)

#### Parameters

##### audioStream

`AsyncIterable`\<`Buffer`\<`ArrayBufferLike`\>\>

##### options

[`STTOptions`](../type-aliases/STTOptions.md)

#### Returns

`AsyncIterable`\<[`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)\>

#### Implementation of

`STTHandler.transcribeStream`
