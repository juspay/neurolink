[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProvider

# ~~Type Alias: TTSProvider~~

> **TTSProvider** = `object`

Defined in: [types/voice.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L212)

TTS-capable voice provider type

## Deprecated

Use the canonical `TTSHandler` contract instead. Nothing in
this package consumes `TTSProvider`; it is kept at its original shape so
existing external callers keep compiling. `TTSHandler` is not a drop-in
replacement — it requires `isConfigured()`, makes `getVoices` and
`maxTextLength` optional, and its `synthesizeStream` may return `undefined`
to select the buffered path — so this is a distinct legacy shape, not an
alias.

## Properties

### ~~maxTextLength~~

> `readonly` **maxTextLength**: `number`

Defined in: [types/voice.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L234)

Maximum text length supported

## Methods

### ~~synthesize()~~

> **synthesize**(`text`, `options`): `Promise`\<[`TTSResult`](TTSResult.md)\>

Defined in: [types/voice.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L216)

Synthesize text to speech

#### Parameters

##### text

`string`

##### options

[`TTSOptions`](TTSOptions.md)

#### Returns

`Promise`\<[`TTSResult`](TTSResult.md)\>

---

### ~~synthesizeStream()?~~

> `optional` **synthesizeStream**(`text`, `options`): `AsyncIterable`\<[`TTSStreamChunk`](TTSStreamChunk.md)\>

Defined in: [types/voice.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L221)

Stream synthesized audio chunks

#### Parameters

##### text

`string`

##### options

[`TTSOptions`](TTSOptions.md)

#### Returns

`AsyncIterable`\<[`TTSStreamChunk`](TTSStreamChunk.md)\>

---

### ~~getVoices()~~

> **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](TTSVoice.md)[]\>

Defined in: [types/voice.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L229)

Get available voices

#### Parameters

##### languageCode?

`string`

#### Returns

`Promise`\<[`TTSVoice`](TTSVoice.md)[]\>
