[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalInput

# Type Alias: MultimodalInput

> **MultimodalInput** = `object`

Multimodal input type for options that may contain images or content arrays
This is the primary interface for users to provide multimodal content

## Properties

### text

> **text**: `string`

---

### images?

> `optional` **images?**: (`Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md))[]

Images to include in the request.
Can be simple image data (Buffer, string) or objects with alt text for accessibility.

#### Examples

```typescript
images: [imageBuffer, "https://example.com/image.jpg"];
```

```typescript
images: [
  { data: imageBuffer, altText: "Product screenshot showing main dashboard" },
  { data: "https://example.com/chart.png", altText: "Sales chart for Q3 2024" },
];
```

---

### content?

> `optional` **content?**: [`Content`](Content.md)[]

---

### csvFiles?

> `optional` **csvFiles?**: (`Buffer` \| `string`)[]

---

### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

---

### files?

> `optional` **files?**: (`Buffer` \| `string`)[]

---

### audioFiles?

> `optional` **audioFiles?**: (`Buffer` \| `string`)[]

Audio files for file-based audio processing (future)

---

### videoFiles?

> `optional` **videoFiles?**: (`Buffer` \| `string`)[]

Video files for file-based video processing (future)

---

### segments?

> `optional` **segments?**: [`DirectorSegment`](DirectorSegment.md)[]

Director Mode segments for multi-clip video generation.
Each segment contains a prompt and image for generating one video clip.
Automatically enables Director Mode when provided.

#### Example

```typescript
segments: [
  { prompt: "Product reveal", image: imageBuffer1 },
  { prompt: "Feature showcase", image: "./image2.jpg" },
  { prompt: "Call to action", image: { data: imageBuffer3, altText: "CTA" } },
];
```
