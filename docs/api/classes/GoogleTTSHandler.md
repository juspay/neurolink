[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleTTSHandler

# Class: GoogleTTSHandler

Defined in: [adapters/tts/googleTTSHandler.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/adapters/tts/googleTTSHandler.ts#L29)

## Implements

- [`TTSHandler`](../type-aliases/TTSHandler.md)

## Constructors

### Constructor

> **new GoogleTTSHandler**(`credentialsPath?`): `GoogleTTSHandler`

Defined in: [adapters/tts/googleTTSHandler.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/adapters/tts/googleTTSHandler.ts#L59)

#### Parameters

##### credentialsPath?

`string`

#### Returns

`GoogleTTSHandler`

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `number` = `GoogleTTSHandler.DEFAULT_MAX_TEXT_LENGTH`

Defined in: [adapters/tts/googleTTSHandler.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/adapters/tts/googleTTSHandler.ts#L56)

Maximum text length supported by Google Cloud TTS (in bytes).

NOTE:
Validation against this limit is performed by the shared TTS processor
before invoking provider handlers, not inside this class.

#### Implementation of

`TTSHandler.maxTextLength`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/tts/googleTTSHandler.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/adapters/tts/googleTTSHandler.ts#L72)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS

#### Implementation of

`TTSHandler.isConfigured`

---

### getVoices()

> **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](../type-aliases/TTSVoice.md)[]\>

Defined in: [adapters/tts/googleTTSHandler.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/adapters/tts/googleTTSHandler.ts#L85)

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

Defined in: [adapters/tts/googleTTSHandler.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/adapters/tts/googleTTSHandler.ts#L202)

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
