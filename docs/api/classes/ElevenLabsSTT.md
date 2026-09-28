[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsSTT

# Class: ElevenLabsSTT

ElevenLabs Scribe Speech-to-Text Handler

Batch-only (no `transcribeStream`). Word timings and speaker labels come
back on every response when the audio has them; `diarize` asks Scribe to
attribute words to speakers.

## See

https://elevenlabs.io/docs/api-reference/speech-to-text/convert

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new ElevenLabsSTT**(`apiKey?`): `ElevenLabsSTT`

#### Parameters

##### apiKey?

`string`

#### Returns

`ElevenLabsSTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `7200` = `7200`

Scribe accepts files up to 1 GB / ~4.5 hours; 2 hours is a conservative cap.

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

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
