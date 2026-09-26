[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L654)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:656](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L656)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L658)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:660](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L660)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:662](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L662)

OpenAI/Whisper-only context prompt to guide transcription accuracy; ignored by Google and Azure

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L664)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L666)

Maximum file size in megabytes
