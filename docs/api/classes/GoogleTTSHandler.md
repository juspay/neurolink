[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleTTSHandler

# Class: GoogleTTSHandler

Defined in: [adapters/tts/googleTTSHandler.ts:33](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/tts/googleTTSHandler.ts#L33)

## Implements

- [`TTSHandler`](../type-aliases/TTSHandler.md)

## Constructors

### Constructor

> **new GoogleTTSHandler**(`credentialsPath?`): `GoogleTTSHandler`

Defined in: [adapters/tts/googleTTSHandler.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/tts/googleTTSHandler.ts#L65)

#### Parameters

##### credentialsPath?

`string`

#### Returns

`GoogleTTSHandler`

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `number` = `GoogleTTSHandler.DEFAULT_MAX_TEXT_LENGTH`

Defined in: [adapters/tts/googleTTSHandler.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/tts/googleTTSHandler.ts#L60)

Maximum text length supported by Google Cloud TTS (in bytes).

NOTE:
Validation against this limit is performed by the shared TTS processor
before invoking provider handlers, not inside this class.

#### Implementation of

`TTSHandler.maxTextLength`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/tts/googleTTSHandler.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/tts/googleTTSHandler.ts#L75)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS

#### Implementation of

`TTSHandler.isConfigured`

---

### getVoices()

> **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](../type-aliases/TTSVoice.md)[]\>

Defined in: [adapters/tts/googleTTSHandler.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/tts/googleTTSHandler.ts#L107)

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

Defined in: [adapters/tts/googleTTSHandler.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/tts/googleTTSHandler.ts#L225)

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

---

### synthesizeStream()

> **synthesizeStream**(`text`, `options?`): `AsyncIterable`\<[`TTSChunk`](../type-aliases/TTSChunk.md), `any`, `any`\> \| `undefined`

Defined in: [adapters/tts/googleTTSHandler.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/tts/googleTTSHandler.ts#L467)

Stream one pre-validated segment's audio as Google produces it.

Returns `undefined` — the contract's "not incrementally deliverable"
signal — unless the voice and the format are both ones the streaming
endpoint was measured to accept, and the text is not SSML.
`StreamingSynthesisInput` has no `ssml` field at all, so markup that
`synthesize()` would honour has to stay on the buffered path rather than
be sent as literal text.

Every non-empty response is yielded as it arrives and carries `isFinal:
false`. `TTSProcessor` recomputes indexes, cumulative sizes and finality
globally across segments and discards whatever a handler reports, so
labelling the last response here would buy nothing and would cost a
one-response lookahead.

#### Parameters

##### text

`string`

##### options?

[`TTSOptions`](../type-aliases/TTSOptions.md) = `{}`

#### Returns

`AsyncIterable`\<[`TTSChunk`](../type-aliases/TTSChunk.md), `any`, `any`\> \| `undefined`

#### Implementation of

`TTSHandler.synthesizeStream`
