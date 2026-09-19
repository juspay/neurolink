[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L494)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L496)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L498)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L500)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L502)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:504](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L504)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L506)

Maximum file size in megabytes
