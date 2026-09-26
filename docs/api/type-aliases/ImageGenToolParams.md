[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolParams

# Type Alias: ImageGenToolParams

> **ImageGenToolParams** = `object`

Tool parameters for AI model use

## Properties

### prompt

> **prompt**: `string`

Detailed description of the image to generate

---

### negativePrompt?

> `optional` **negativePrompt?**: `string`

What to avoid in the generated image (optional)

---

### aspectRatio?

> `optional` **aspectRatio?**: [`AspectRatio`](AspectRatio.md) \| `string`

Aspect ratio like "16:9", "1:1", "4:3" (optional)

---

### style?

> `optional` **style?**: [`StylePreset`](StylePreset.md) \| `string`

Style like "realistic", "artistic", "cartoon" (optional)
