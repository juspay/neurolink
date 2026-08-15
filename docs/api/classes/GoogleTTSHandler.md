[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleTTSHandler

# Class: GoogleTTSHandler

Defined in: [adapters/tts/googleTTSHandler.ts:29](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/adapters/tts/googleTTSHandler.ts#L29)

## Implements

- [`TTSHandler`](../type-aliases/TTSHandler.md)

## Constructors

### Constructor

> **new GoogleTTSHandler**(`credentialsPath?`): `GoogleTTSHandler`

Defined in: [adapters/tts/googleTTSHandler.ts:61](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/adapters/tts/googleTTSHandler.ts#L61)

#### Parameters

##### credentialsPath?

`string`

#### Returns

`GoogleTTSHandler`

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `number` = `GoogleTTSHandler.DEFAULT_MAX_TEXT_LENGTH`

Defined in: [adapters/tts/googleTTSHandler.ts:56](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/adapters/tts/googleTTSHandler.ts#L56)

Maximum text length supported by Google Cloud TTS (in bytes).

NOTE:
Validation against this limit is performed by the shared TTS processor
before invoking provider handlers, not inside this class.

#### Implementation of

`TTSHandler.maxTextLength`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/tts/googleTTSHandler.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/adapters/tts/googleTTSHandler.ts#L71)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS

#### Implementation of

`TTSHandler.isConfigured`

---

### getVoices()

> **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](../type-aliases/TTSVoice.md)[]\>

Defined in: [adapters/tts/googleTTSHandler.ts:103](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/adapters/tts/googleTTSHandler.ts#L103)

Get available voices for the provider

Note: This method is optional in the TTSHandler interface, but Google Cloud TTS
fully implements it to provide comprehensive voice discovery capabilities.

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

> **synthesize**(`text`, `options`): `Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Defined in: [adapters/tts/googleTTSHandler.ts:221](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/adapters/tts/googleTTSHandler.ts#L221)

Generate audio from text using provider-specific TTS API

#### Parameters

##### text

`string`

Text or SSML to convert to speech

##### options

[`TTSOptions`](../type-aliases/TTSOptions.md)

TTS configuration options

#### Returns

`Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Audio buffer with metadata

#### Implementation of

`TTSHandler.synthesize`
