[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FishAudioTTS

# Class: FishAudioTTS

Defined in: [voice/providers/FishAudioTTS.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/FishAudioTTS.ts#L41)

Fish Audio Text-to-Speech Handler.

Auth: `Authorization: Bearer ${FISH_AUDIO_API_KEY}`.
Models: speech-1.5 (standard), speech-1.6, s1 (default; latest).

## Implements

- [`TTSHandler`](../type-aliases/TTSHandler.md)

## Constructors

### Constructor

> **new FishAudioTTS**(`apiKey?`): `FishAudioTTS`

Defined in: [voice/providers/FishAudioTTS.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/FishAudioTTS.ts#L47)

#### Parameters

##### apiKey?

`string`

#### Returns

`FishAudioTTS`

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `5000` = `5000`

Defined in: [voice/providers/FishAudioTTS.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/FishAudioTTS.ts#L42)

Maximum text length supported by this provider (in bytes)
Different providers have different limits

#### Default

```ts
3000 if not specified
```

#### Implementation of

`TTSHandler.maxTextLength`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [voice/providers/FishAudioTTS.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/FishAudioTTS.ts#L55)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS

#### Implementation of

`TTSHandler.isConfigured`

---

### synthesize()

> **synthesize**(`text`, `options?`): `Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Defined in: [voice/providers/FishAudioTTS.ts:59](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/voice/providers/FishAudioTTS.ts#L59)

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
