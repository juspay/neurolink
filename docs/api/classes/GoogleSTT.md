[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleSTT

# Class: GoogleSTT

Defined in: [voice/providers/GoogleSTT.ts:33](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L33)

Google Cloud Speech-to-Text Handler

Supports transcription with speaker diarization, word timestamps, and punctuation.

## See

https://cloud.google.com/speech-to-text/docs

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new GoogleSTT**(`apiKey?`, `credentialsPath?`): `GoogleSTT`

Defined in: [voice/providers/GoogleSTT.ts:50](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L50)

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

Defined in: [voice/providers/GoogleSTT.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L42)

Maximum audio duration in seconds for the synchronous recognize endpoint.
For longer audio, use the async longrunningrecognize endpoint (not yet implemented).

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

Defined in: [voice/providers/GoogleSTT.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L48)

True streaming requires gRPC (not yet implemented).
transcribeStream() uses a chunk-and-batch workaround.

#### Implementation of

`STTHandler.supportsStreaming`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [voice/providers/GoogleSTT.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L70)

#### Returns

`boolean`

#### Implementation of

`STTHandler.isConfigured`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/providers/GoogleSTT.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L74)

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`STTHandler.getSupportedFormats`

---

### getSupportedLanguages()

> **getSupportedLanguages**(): `Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

Defined in: [voice/providers/GoogleSTT.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L78)

#### Returns

`Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Implementation of

`STTHandler.getSupportedLanguages`

---

### transcribe()

> **transcribe**(`audio`, `options?`): `Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

Defined in: [voice/providers/GoogleSTT.ts:174](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L174)

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

Defined in: [voice/providers/GoogleSTT.ts:382](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/GoogleSTT.ts#L382)

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
