[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalInput

# Type Alias: MultimodalInput

> **MultimodalInput** = `object`

Defined in: [types/multimodal.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L373)

Multimodal input type for options that may contain images or content arrays
This is the primary interface for users to provide multimodal content

## Properties

### text

> **text**: `string`

Defined in: [types/multimodal.ts:374](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L374)

---

### images?

> `optional` **images?**: (`Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md))[]

Defined in: [types/multimodal.ts:392](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L392)

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

Defined in: [types/multimodal.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L393)

---

### csvFiles?

> `optional` **csvFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L394)

---

### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:395](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L395)

---

### files?

> `optional` **files?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L396)

---

### audioFiles?

> `optional` **audioFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:399](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L399)

Audio files for file-based audio processing (future)

---

### videoFiles?

> `optional` **videoFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L402)

Video files for file-based video processing (future)

---

### segments?

> `optional` **segments?**: [`DirectorSegment`](DirectorSegment.md)[]

Defined in: [types/multimodal.ts:418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L418)

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
