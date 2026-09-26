[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProvider

# ~~Type Alias: TTSProvider~~

> **TTSProvider** = `object`

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

Maximum text length supported

## Methods

### ~~synthesize()~~

> **synthesize**(`text`, `options`): `Promise`\<[`TTSResult`](TTSResult.md)\>

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

Get available voices

#### Parameters

##### languageCode?

`string`

#### Returns

`Promise`\<[`TTSVoice`](TTSVoice.md)[]\>
