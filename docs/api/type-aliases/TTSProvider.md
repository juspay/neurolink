[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProvider

# Type Alias: TTSProvider

> **TTSProvider** = `object`

Defined in: [types/voice.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L204)

TTS-capable voice provider type

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `number`

Defined in: [types/voice.ts:226](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L226)

Maximum text length supported

## Methods

### synthesize()

> **synthesize**(`text`, `options`): `Promise`\<[`TTSResult`](TTSResult.md)\>

Defined in: [types/voice.ts:208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L208)

Synthesize text to speech

#### Parameters

##### text

`string`

##### options

[`TTSOptions`](TTSOptions.md)

#### Returns

`Promise`\<[`TTSResult`](TTSResult.md)\>

---

### synthesizeStream()?

> `optional` **synthesizeStream**(`text`, `options`): `AsyncIterable`\<[`TTSStreamChunk`](TTSStreamChunk.md)\>

Defined in: [types/voice.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L213)

Stream synthesized audio chunks

#### Parameters

##### text

`string`

##### options

[`TTSOptions`](TTSOptions.md)

#### Returns

`AsyncIterable`\<[`TTSStreamChunk`](TTSStreamChunk.md)\>

---

### getVoices()

> **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](TTSVoice.md)[]\>

Defined in: [types/voice.ts:221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L221)

Get available voices

#### Parameters

##### languageCode?

`string`

#### Returns

`Promise`\<[`TTSVoice`](TTSVoice.md)[]\>
