[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PPTOutputOptions

# Type Alias: PPTOutputOptions

> **PPTOutputOptions** = `object`

PPT output configuration options

## Example

```typescript
const options: PPTOutputOptions = {
  pages: 10,
  theme: "modern",
  audience: "business",
  tone: "professional",
  generateAIImages: true,
};
```

## Properties

### pages

> **pages**: `number`

Number of slides to generate (required, range: 5-50)

---

### format?

> `optional` **format?**: [`OutputFormatOption`](OutputFormatOption.md)

Output format - only PPTX supported currently (default: "pptx")

---

### theme?

> `optional` **theme?**: [`ThemeOption`](ThemeOption.md)

Presentation theme/style (default: "AI will decide" - AI chooses based on topic)

---

### audience?

> `optional` **audience?**: [`AudienceOption`](AudienceOption.md)

Target audience for content customization (default: "AI will decide" - AI chooses based on topic)

---

### tone?

> `optional` **tone?**: [`ToneOption`](ToneOption.md)

Presentation tone/style (default: "AI will decide" - AI chooses based on topic)

---

### generateAIImages?

> `optional` **generateAIImages?**: `boolean`

Whether to generate AI images for slides (user-provided images via input.images are always used)

---

### outputPath?

> `optional` **outputPath?**: `string`

Custom output file path (default: auto-generated in ./output/)

---

### aspectRatio?

> `optional` **aspectRatio?**: [`AspectRatioOption`](AspectRatioOption.md)

Aspect ratio for slides (default: "16:9")

---

### logoPath?

> `optional` **logoPath?**: `Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md)

Path to logo image to include in slides
