[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTHandler

# Type Alias: STTHandler

> **STTHandler** = `object`

## Properties

### maxAudioDuration?

> `optional` **maxAudioDuration?**: `number`

---

### supportsStreaming?

> `optional` **supportsStreaming?**: `boolean`

## Methods

### transcribe()

> **transcribe**(`audio`, `options`): `Promise`\<[`STTResult`](STTResult.md)\>

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

#### Returns

`Promise`\<[`STTLanguage`](STTLanguage.md)[]\>

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](TTSAudioFormat.md)[]

#### Returns

[`TTSAudioFormat`](TTSAudioFormat.md)[]

---

### isConfigured()

> **isConfigured**(): `boolean`

#### Returns

`boolean`
