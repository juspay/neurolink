[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioProviderConfig

# Type Alias: AudioProviderConfig

> **AudioProviderConfig** = `object`

Defined in: [types/file.ts:266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L266)

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

Defined in: [types/file.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L268)

Maximum audio file size in megabytes

---

### maxDurationSeconds

> **maxDurationSeconds**: `number`

Defined in: [types/file.ts:270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L270)

Maximum audio duration in seconds

---

### supportedFormats

> **supportedFormats**: `string`[]

Defined in: [types/file.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L272)

Supported audio formats (e.g., 'mp3', 'wav', 'm4a', 'flac', 'ogg')

---

### supportsLanguageDetection

> **supportsLanguageDetection**: `boolean`

Defined in: [types/file.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L274)

Whether the provider supports automatic language detection

---

### requiresApiKey

> **requiresApiKey**: `boolean`

Defined in: [types/file.ts:276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L276)

Whether the provider requires an API key for authentication

---

### costPer60s?

> `optional` **costPer60s?**: `number`

Defined in: [types/file.ts:278](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L278)

Optional: Cost per 60 seconds of audio in USD

---

### costPer15s?

> `optional` **costPer15s?**: `number`

Defined in: [types/file.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L280)

Optional: Cost per 15 seconds of audio in USD
