[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L466)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:468](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L468)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:470](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L470)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:472](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L472)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:474](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L474)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L476)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L478)

Maximum file size in megabytes
