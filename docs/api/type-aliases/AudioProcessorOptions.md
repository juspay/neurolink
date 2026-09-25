[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:448](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L448)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L450)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:452](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L452)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:454](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L454)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L456)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L458)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:460](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L460)

Maximum file size in megabytes
