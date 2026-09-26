[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Defined in: [types/file.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L588)

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L590)

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Defined in: [types/file.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L592)

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Defined in: [types/file.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L594)

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/file.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L596)

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Defined in: [types/file.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L598)

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L600)

Maximum file size in megabytes
