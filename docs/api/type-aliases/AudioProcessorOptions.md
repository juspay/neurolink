[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:546](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L546)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:548](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L548)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:550](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L550)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:552](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L552)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:554](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L554)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:556](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L556)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L558)

Maximum file size in megabytes
