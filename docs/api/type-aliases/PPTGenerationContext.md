[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PPTGenerationContext

# Type Alias: PPTGenerationContext

> **PPTGenerationContext** = `object`

Context extracted from GenerateOptions for PPT generation

## Properties

### topic

> **topic**: `string`

Original topic/prompt from user

---

### pages

> **pages**: `number`

Number of slides requested (required)

---

### theme

> **theme**: `string`

Selected theme name ("AI will decide" means AI chooses)

---

### audience

> **audience**: `string`

Target audience ("AI will decide" means AI chooses)

---

### tone

> **tone**: `string`

Presentation tone ("AI will decide" means AI chooses)

---

### generateAIImages

> **generateAIImages**: `boolean`

Whether to generate AI images (user-provided images via input.images are always used)

---

### aspectRatio

> **aspectRatio**: [`AspectRatioOption`](AspectRatioOption.md)

Aspect ratio

---

### outputPath?

> `optional` **outputPath?**: `string`

Custom output path

---

### logo?

> `optional` **logo?**: `Buffer` \| `string`

Logo data or path if provided

---

### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

User-provided images for slides (from input.images)

---

### provider?

> `optional` **provider?**: `string`

Provider name (for logging)

---

### model?

> `optional` **model?**: `string`

Model name (for logging)
