[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenOptions

# Type Alias: ImageGenOptions

> **ImageGenOptions** = `object`

Defined in: [types/imageGen.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L47)

Options for image generation requests

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/imageGen.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L52)

Text prompt describing the image to generate
Should be detailed and specific for best results

---

### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

Defined in: [types/imageGen.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L59)

Reference images for style/content guidance (optional)
Can be Buffer (raw data) or string (base64 encoded)
Max 5 images recommended

---

### pdfFiles?

> `optional` **pdfFiles?**: `Buffer`[]

Defined in: [types/imageGen.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L66)

Reference PDF files for context (optional)
Used for generating images based on document content
Max 1 PDF recommended

---

### model?

> `optional` **model?**: `string`

Defined in: [types/imageGen.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L72)

Override default model
e.g., "imagen-3.0-generate-001", "dall-e-3"

---

### provider?

> `optional` **provider?**: [`ImageGenProvider`](ImageGenProvider.md) \| `string`

Defined in: [types/imageGen.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L78)

Override default provider
e.g., "vertex", "openai"

---

### region?

> `optional` **region?**: `string`

Defined in: [types/imageGen.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L83)

Region for provider (e.g., for Vertex AI)

---

### negativePrompt?

> `optional` **negativePrompt?**: `string`

Defined in: [types/imageGen.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L89)

What to avoid in the generated image (optional)
e.g., "blurry, low quality, text overlays"

---

### aspectRatio?

> `optional` **aspectRatio?**: [`AspectRatio`](AspectRatio.md) \| `string`

Defined in: [types/imageGen.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L95)

Aspect ratio for the generated image
e.g., "16:9", "1:1", "4:3", "9:16"

---

### style?

> `optional` **style?**: [`StylePreset`](StylePreset.md) \| `string`

Defined in: [types/imageGen.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L101)

Style preset for the image
e.g., "realistic", "artistic", "cartoon", "watercolor", "photorealistic"

---

### numberOfImages?

> `optional` **numberOfImages?**: `number`

Defined in: [types/imageGen.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L106)

Number of images to generate (default: 1)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/imageGen.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L112)

Sampling temperature for generation (0-1)
Higher values = more creative/random
