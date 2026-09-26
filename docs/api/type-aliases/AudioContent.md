[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioContent

# Type Alias: AudioContent

> **AudioContent** = `object`

Audio content type for multimodal messages

NOTE: This is for FILE-BASED audio input (not streaming).
For streaming audio (live transcription), use AudioInputSpec from streamTypes.ts

## Example

```typescript
const audioContent: AudioContent = {
  type: "audio",
  data: audioBuffer,
  mediaType: "audio/mpeg",
  metadata: {
    filename: "recording.mp3",
    duration: 120.5,
    transcription: "Hello world",
  },
};
```

## Properties

### type

> **type**: `"audio"`

---

### data

> **data**: `Buffer` \| `string`

---

### mediaType?

> `optional` **mediaType?**: `"audio/mpeg"` \| `"audio/wav"` \| `"audio/ogg"` \| `"audio/webm"` \| `"audio/aac"` \| `"audio/flac"` \| `"audio/mp4"`

---

### metadata?

> `optional` **metadata?**: `object`

#### filename?

> `optional` **filename?**: `string`

#### duration?

> `optional` **duration?**: `number`

#### sampleRate?

> `optional` **sampleRate?**: `number`

#### channels?

> `optional` **channels?**: `number`

#### transcription?

> `optional` **transcription?**: `string`

#### language?

> `optional` **language?**: `string`
