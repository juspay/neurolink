[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProcessorOptions

# Type Alias: AudioProcessorOptions

> **AudioProcessorOptions** = `object`

Audio processor options

## Properties

### provider?

> `optional` **provider?**: `string`

AI provider to use for transcription (e.g., 'openai', 'google', 'azure')

---

### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Transcription model to use (e.g., 'whisper-1', 'chirp-3')

---

### language?

> `optional` **language?**: `string`

Language code for transcription (e.g., 'en', 'es', 'fr')

---

### prompt?

> `optional` **prompt?**: `string`

Context or prompt to guide transcription accuracy

---

### maxDurationSeconds?

> `optional` **maxDurationSeconds?**: `number`

Maximum audio duration in seconds (default: 600)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Maximum file size in megabytes
