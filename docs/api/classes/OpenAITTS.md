[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAITTS

# Class: OpenAITTS

## Implements

- [`TTSHandler`](../type-aliases/TTSHandler.md)

## Constructors

### Constructor

> **new OpenAITTS**(`apiKey?`): `OpenAITTS`

#### Parameters

##### apiKey?

`string`

#### Returns

`OpenAITTS`

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `4096` = `4096`

Maximum text length (4096 characters)

#### Implementation of

`TTSHandler.maxTextLength`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS

#### Implementation of

`TTSHandler.isConfigured`

---

### getVoices()

> **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](../type-aliases/TTSVoice.md)[]\>

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

---

### synthesizeStream()

> **synthesizeStream**(`text`, `options?`): `AsyncIterable`\<[`TTSChunk`](../type-aliases/TTSChunk.md), `any`, `any`\> \| `undefined`

Stream one segment's audio as the response body arrives.

Returns `undefined` for any format without direct wire proof of
incremental delivery, which selects the buffered `synthesize()` path.

Every non-empty body read is yielded as soon as it is available and
carries `isFinal: false`: assigning finality here would require a
one-read lookahead, delaying every fragment by a full body read, and
`TTSProcessor` recomputes finality globally anyway.

#### Parameters

##### text

`string`

##### options?

[`TTSOptions`](../type-aliases/TTSOptions.md) = `{}`

#### Returns

`AsyncIterable`\<[`TTSChunk`](../type-aliases/TTSChunk.md), `any`, `any`\> \| `undefined`

#### Implementation of

`TTSHandler.synthesizeStream`
