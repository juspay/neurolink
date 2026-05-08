[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoContent

# Type Alias: VideoContent

> **VideoContent** = `object`

Defined in: [types/multimodal.ts:306](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L306)

Video content type for multimodal messages

NOTE: This is for FILE-BASED video input.
For streaming video, this type may be extended in future.

## Example

```typescript
const videoContent: VideoContent = {
  type: "video",
  data: videoBuffer,
  mediaType: "video/mp4",
  metadata: {
    filename: "demo.mp4",
    duration: 300,
    dimensions: { width: 1920, height: 1080 },
  },
};
```

## Properties

### type

> **type**: `"video"`

Defined in: [types/multimodal.ts:307](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L307)

---

### data

> **data**: `Buffer` \| `string`

Defined in: [types/multimodal.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L308)

---

### mediaType?

> `optional` **mediaType?**: `"video/mp4"` \| `"video/webm"` \| `"video/ogg"` \| `"video/quicktime"` \| `"video/x-msvideo"` \| `"video/x-matroska"`

Defined in: [types/multimodal.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L309)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/multimodal.ts:316](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L316)

#### filename?

> `optional` **filename?**: `string`

#### duration?

> `optional` **duration?**: `number`

#### dimensions?

> `optional` **dimensions?**: `object`

##### dimensions.width

> **width**: `number`

##### dimensions.height

> **height**: `number`

#### frameRate?

> `optional` **frameRate?**: `number`

#### codec?

> `optional` **codec?**: `string`

#### extractedFrames?

> `optional` **extractedFrames?**: `string`[]

#### transcription?

> `optional` **transcription?**: `string`
