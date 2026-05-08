[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTHandler

# Type Alias: STTHandler

> **STTHandler** = `object`

Defined in: [types/stt.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L155)

## Properties

### maxAudioDuration?

> `optional` **maxAudioDuration?**: `number`

Defined in: [types/stt.ts:167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L167)

---

### supportsStreaming?

> `optional` **supportsStreaming?**: `boolean`

Defined in: [types/stt.ts:168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L168)

## Methods

### transcribe()

> **transcribe**(`audio`, `options`): `Promise`\<[`STTResult`](STTResult.md)\>

Defined in: [types/stt.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L156)

#### Parameters

##### audio

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

##### options

[`STTOptions`](STTOptions.md)

#### Returns

`Promise`\<[`STTResult`](STTResult.md)\>

---

### transcribeStream()?

> `optional` **transcribeStream**(`audioStream`, `options`): `AsyncIterable`\<[`TranscriptionSegment`](TranscriptionSegment.md)\>

Defined in: [types/stt.ts:160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L160)

#### Parameters

##### audioStream

`AsyncIterable`\<`Buffer`\<`ArrayBufferLike`\>\>

##### options

[`STTOptions`](STTOptions.md)

#### Returns

`AsyncIterable`\<[`TranscriptionSegment`](TranscriptionSegment.md)\>

---

### getSupportedLanguages()?

> `optional` **getSupportedLanguages**(): `Promise`\<[`STTLanguage`](STTLanguage.md)[]\>

Defined in: [types/stt.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L164)

#### Returns

`Promise`\<[`STTLanguage`](STTLanguage.md)[]\>

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](TTSAudioFormat.md)[]

Defined in: [types/stt.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L165)

#### Returns

[`TTSAudioFormat`](TTSAudioFormat.md)[]

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [types/stt.ts:166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L166)

#### Returns

`boolean`
