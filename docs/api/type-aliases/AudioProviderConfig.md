[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProviderConfig

# Type Alias: AudioProviderConfig

> **AudioProviderConfig** = `object`

Defined in: [types/file.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L506)

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

Defined in: [types/file.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L508)

Maximum audio file size in megabytes

---

### maxDurationSeconds

> **maxDurationSeconds**: `number`

Defined in: [types/file.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L510)

Maximum audio duration in seconds

---

### supportedFormats

> **supportedFormats**: `string`[]

Defined in: [types/file.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L512)

Supported audio formats (e.g., 'mp3', 'wav', 'm4a', 'flac', 'ogg')

---

### supportsLanguageDetection

> **supportsLanguageDetection**: `boolean`

Defined in: [types/file.ts:514](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L514)

Whether the provider supports automatic language detection

---

### requiresApiKey

> **requiresApiKey**: `boolean`

Defined in: [types/file.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L516)

Whether the provider requires an API key for authentication

---

### costPer60s?

> `optional` **costPer60s?**: `number`

Defined in: [types/file.ts:518](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L518)

Optional: Cost per 60 seconds of audio in USD

---

### costPer15s?

> `optional` **costPer15s?**: `number`

Defined in: [types/file.ts:520](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L520)

Optional: Cost per 15 seconds of audio in USD
