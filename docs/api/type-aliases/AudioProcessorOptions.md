[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:428](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L428)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L430)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L432)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L434)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L436)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L438)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L440)

Maximum file size in megabytes
