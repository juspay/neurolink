[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhisperSTTOptions

# Type Alias: WhisperSTTOptions

> **WhisperSTTOptions** = [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/stt.ts:382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L382)

## Type Declaration

### model?

> `optional` **model?**: [`WhisperModel`](WhisperModel.md)

### responseFormat?

> `optional` **responseFormat?**: `"json"` \| `"text"` \| `"srt"` \| `"verbose_json"` \| `"vtt"`

### temperature?

> `optional` **temperature?**: `number`

### prompt?

> `optional` **prompt?**: `string`

### translate?

> `optional` **translate?**: `boolean`

Translate audio to English instead of transcribing in original language
