[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideGeneratorConfig

# Type Alias: SlideGeneratorConfig

> **SlideGeneratorConfig** = `object`

Configuration for slide generation

## Properties

### theme

> **theme**: `string` \| [`PresentationTheme`](PresentationTheme.md)

Theme name or custom theme

---

### generateAIImages

> **generateAIImages**: `boolean`

Whether to generate AI images (user-provided images are always used)

---

### aspectRatio

> **aspectRatio**: [`AspectRatioOption`](AspectRatioOption.md)

Aspect ratio for slides

---

### provider?

> `optional` **provider?**: `string`

Provider for image generation

---

### imageModel?

> `optional` **imageModel?**: `string`

Model for image generation

---

### logo?

> `optional` **logo?**: `Buffer` \| `string` \| [`LogoConfig`](LogoConfig.md)

Logo configuration

---

### userImages?

> `optional` **userImages?**: (`Buffer` \| `string`)[]

User-provided images for slides (takes priority over AI generation)

---

### neurolink?

> `optional` **neurolink?**: [`NeuroLink`](../classes/NeuroLink.md)

NeuroLink instance for image generation
