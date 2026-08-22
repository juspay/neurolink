[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsTTS

# Class: ElevenLabsTTS

Defined in: [voice/providers/ElevenLabsTTS.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/ElevenLabsTTS.ts#L29)

ElevenLabs Text-to-Speech Handler

Supports high-quality multilingual TTS with voice cloning.

## See

https://elevenlabs.io/docs/api-reference

## Implements

- [`TTSHandler`](../type-aliases/TTSHandler.md)

## Constructors

### Constructor

> **new ElevenLabsTTS**(`apiKey?`): `ElevenLabsTTS`

Defined in: [voice/providers/ElevenLabsTTS.ts:40](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/ElevenLabsTTS.ts#L40)

#### Parameters

##### apiKey?

`string`

#### Returns

`ElevenLabsTTS`

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `5000` = `5000`

Defined in: [voice/providers/ElevenLabsTTS.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/ElevenLabsTTS.ts#L38)

Maximum text length (5000 characters)

#### Implementation of

`TTSHandler.maxTextLength`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [voice/providers/ElevenLabsTTS.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/ElevenLabsTTS.ts#L45)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS

#### Implementation of

`TTSHandler.isConfigured`

---

### getVoices()

> **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](../type-aliases/TTSVoice.md)[]\>

Defined in: [voice/providers/ElevenLabsTTS.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/ElevenLabsTTS.ts#L49)

Get available voices for the provider

#### Parameters

##### languageCode?

`string`

Optional language filter (e.g., "en-US")

#### Returns

`Promise`\<[`TTSVoice`](../type-aliases/TTSVoice.md)[]\>

List of available voices

#### Implementation of

`TTSHandler.getVoices`

---

### synthesize()

> **synthesize**(`text`, `options?`): `Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Defined in: [voice/providers/ElevenLabsTTS.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/voice/providers/ElevenLabsTTS.ts#L165)

Generate audio from text using provider-specific TTS API

**IMPORTANT: Timeout Responsibility**
Implementations MUST enforce their own timeouts (recommended: 30 seconds).
Use the `withTimeout()` utility or provider-specific timeout mechanisms.

#### Parameters

##### text

`string`

Text to convert to speech (pre-validated, non-empty, within length limits)

##### options?

[`TTSOptions`](../type-aliases/TTSOptions.md) = `{}`

TTS configuration options (voice, format, speed, etc.)

#### Returns

`Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Audio buffer with metadata

#### Throws

On synthesis failure, timeout, or configuration issues

#### Implementation of

`TTSHandler.synthesize`
