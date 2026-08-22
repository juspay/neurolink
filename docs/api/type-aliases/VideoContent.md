[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoContent

# Type Alias: VideoContent

> **VideoContent** = `object`

Defined in: [types/multimodal.ts:370](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L370)

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

Defined in: [types/multimodal.ts:371](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L371)

---

### data

> **data**: `Buffer` \| `string`

Defined in: [types/multimodal.ts:372](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L372)

---

### mediaType?

> `optional` **mediaType?**: `"video/mp4"` \| `"video/webm"` \| `"video/ogg"` \| `"video/quicktime"` \| `"video/x-msvideo"` \| `"video/x-matroska"`

Defined in: [types/multimodal.ts:373](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L373)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/multimodal.ts:380](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L380)

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
