[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoContent

# Type Alias: VideoContent

> **VideoContent** = `object`

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

---

### data

> **data**: `Buffer` \| `string`

---

### mediaType?

> `optional` **mediaType?**: `"video/mp4"` \| `"video/webm"` \| `"video/ogg"` \| `"video/quicktime"` \| `"video/x-msvideo"` \| `"video/x-matroska"`

---

### metadata?

> `optional` **metadata?**: `object`

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
