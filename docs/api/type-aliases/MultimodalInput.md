[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalInput

# Type Alias: MultimodalInput

> **MultimodalInput** = `object`

Defined in: [types/multimodal.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L437)

Multimodal input type for options that may contain images or content arrays
This is the primary interface for users to provide multimodal content

## Properties

### text

> **text**: `string`

Defined in: [types/multimodal.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L438)

---

### images?

> `optional` **images?**: (`Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md))[]

Defined in: [types/multimodal.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L456)

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

Defined in: [types/multimodal.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L457)

---

### csvFiles?

> `optional` **csvFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L458)

---

### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L459)

---

### files?

> `optional` **files?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:460](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L460)

---

### audioFiles?

> `optional` **audioFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L463)

Audio files for file-based audio processing (future)

---

### videoFiles?

> `optional` **videoFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/multimodal.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L466)

Video files for file-based video processing (future)

---

### segments?

> `optional` **segments?**: [`DirectorSegment`](DirectorSegment.md)[]

Defined in: [types/multimodal.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L482)

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
