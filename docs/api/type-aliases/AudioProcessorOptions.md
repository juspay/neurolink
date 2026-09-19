[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:526](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L526)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L528)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L530)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:532](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L532)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L534)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L536)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L538)

Maximum file size in megabytes
