[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenOptions

# Type Alias: ImageGenOptions

> **ImageGenOptions** = `object`

Options for image generation requests

## Properties

### prompt

> **prompt**: `string`

Text prompt describing the image to generate
Should be detailed and specific for best results

---

### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

Reference images for style/content guidance (optional)
Can be Buffer (raw data) or string (base64 encoded)
Max 5 images recommended

---

### pdfFiles?

> `optional` **pdfFiles?**: `Buffer`[]

Reference PDF files for context (optional)
Used for generating images based on document content
Max 1 PDF recommended

---

### model?

> `optional` **model?**: `string`

Override default model
e.g., "imagen-3.0-generate-001", "dall-e-3"

---

### provider?

> `optional` **provider?**: [`ImageGenProvider`](ImageGenProvider.md) \| `string`

Override default provider
e.g., "vertex", "openai"

---

### region?

> `optional` **region?**: `string`

Region for provider (e.g., for Vertex AI)

---

### negativePrompt?

> `optional` **negativePrompt?**: `string`

What to avoid in the generated image (optional)
e.g., "blurry, low quality, text overlays"

---

### aspectRatio?

> `optional` **aspectRatio?**: [`AspectRatio`](AspectRatio.md) \| `string`

Aspect ratio for the generated image
e.g., "16:9", "1:1", "4:3", "9:16"

---

### style?

> `optional` **style?**: [`StylePreset`](StylePreset.md) \| `string`

Style preset for the image
e.g., "realistic", "artistic", "cartoon", "watercolor", "photorealistic"

---

### numberOfImages?

> `optional` **numberOfImages?**: `number`

Number of images to generate (default: 1)

---

### temperature?

> `optional` **temperature?**: `number`

Sampling temperature for generation (0-1)
Higher values = more creative/random
