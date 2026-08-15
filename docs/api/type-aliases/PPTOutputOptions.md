[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PPTOutputOptions

# Type Alias: PPTOutputOptions

> **PPTOutputOptions** = `object`

Defined in: [types/ppt.ts:60](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L60)

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

Defined in: [types/ppt.ts:62](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L62)

Number of slides to generate (required, range: 5-50)

---

### format?

> `optional` **format?**: [`OutputFormatOption`](OutputFormatOption.md)

Defined in: [types/ppt.ts:64](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L64)

Output format - only PPTX supported currently (default: "pptx")

---

### theme?

> `optional` **theme?**: [`ThemeOption`](ThemeOption.md)

Defined in: [types/ppt.ts:66](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L66)

Presentation theme/style (default: "AI will decide" - AI chooses based on topic)

---

### audience?

> `optional` **audience?**: [`AudienceOption`](AudienceOption.md)

Defined in: [types/ppt.ts:68](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L68)

Target audience for content customization (default: "AI will decide" - AI chooses based on topic)

---

### tone?

> `optional` **tone?**: [`ToneOption`](ToneOption.md)

Defined in: [types/ppt.ts:70](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L70)

Presentation tone/style (default: "AI will decide" - AI chooses based on topic)

---

### generateAIImages?

> `optional` **generateAIImages?**: `boolean`

Defined in: [types/ppt.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L72)

Whether to generate AI images for slides (user-provided images via input.images are always used)

---

### outputPath?

> `optional` **outputPath?**: `string`

Defined in: [types/ppt.ts:74](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L74)

Custom output file path (default: auto-generated in ./output/)

---

### aspectRatio?

> `optional` **aspectRatio?**: [`AspectRatioOption`](AspectRatioOption.md)

Defined in: [types/ppt.ts:76](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L76)

Aspect ratio for slides (default: "16:9")

---

### logoPath?

> `optional` **logoPath?**: `Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md)

Defined in: [types/ppt.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L78)

Path to logo image to include in slides
