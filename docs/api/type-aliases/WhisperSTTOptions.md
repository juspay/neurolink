[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhisperSTTOptions

# Type Alias: WhisperSTTOptions

> **WhisperSTTOptions** = [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/stt.ts:382](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L382)

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
