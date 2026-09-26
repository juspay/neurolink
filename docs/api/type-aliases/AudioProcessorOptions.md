[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L555)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L557)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L559)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L561)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L563)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:565](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L565)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L567)

Maximum file size in megabytes
