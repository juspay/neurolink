[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProviderConfig

# Type Alias: AudioProviderConfig

> **AudioProviderConfig** = `object`

Defined in: [types/file.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L436)

Audio provider configuration for transcription services

Describes the capabilities and limitations of each audio transcription provider
(e.g., OpenAI Whisper, Google Speech-to-Text, Azure Speech Services).

## Examples

```typescript
const openaiConfig: AudioProviderConfig = {
  maxSizeMB: 25,
  maxDurationSeconds: 600,
  supportedFormats: ["mp3", "mp4", "m4a", "wav", "webm"],
  supportsLanguageDetection: true,
  requiresApiKey: true,
  costPer60s: 0.006, // $0.006 per minute
};
```

```typescript
const googleConfig: AudioProviderConfig = {
  maxSizeMB: 10,
  maxDurationSeconds: 480,
  supportedFormats: ["flac", "wav", "mp3", "ogg"],
  supportsLanguageDetection: true,
  requiresApiKey: true,
  costPer15s: 0.004, // $0.016 per minute ($0.004 per 15 seconds)
};
```

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L438)

Maximum audio file size in megabytes

---

### maxDurationSeconds

> **maxDurationSeconds**: `number`

Defined in: [types/file.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L440)

Maximum audio duration in seconds

---

### supportedFormats

> **supportedFormats**: `string`[]

Defined in: [types/file.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L442)

Supported audio formats (e.g., 'mp3', 'wav', 'm4a', 'flac', 'ogg')

---

### supportsLanguageDetection

> **supportsLanguageDetection**: `boolean`

Defined in: [types/file.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L444)

Whether the provider supports automatic language detection

---

### requiresApiKey

> **requiresApiKey**: `boolean`

Defined in: [types/file.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L446)

Whether the provider requires an API key for authentication

---

### costPer60s?

> `optional` **costPer60s?**: `number`

Defined in: [types/file.ts:448](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L448)

Optional: Cost per 60 seconds of audio in USD

---

### costPer15s?

> `optional` **costPer15s?**: `number`

Defined in: [types/file.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L450)

Optional: Cost per 15 seconds of audio in USD
