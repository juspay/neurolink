[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioContent

# Type Alias: AudioContent

> **AudioContent** = `object`

Defined in: [types/multimodal.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L126)

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

Defined in: [types/multimodal.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L127)

---

### data

> **data**: `Buffer` \| `string`

Defined in: [types/multimodal.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L128)

---

### mediaType?

> `optional` **mediaType?**: `"audio/mpeg"` \| `"audio/wav"` \| `"audio/ogg"` \| `"audio/webm"` \| `"audio/aac"` \| `"audio/flac"` \| `"audio/mp4"`

Defined in: [types/multimodal.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L129)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/multimodal.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L137)

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
