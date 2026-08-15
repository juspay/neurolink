[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideGeneratorConfig

# Type Alias: SlideGeneratorConfig

> **SlideGeneratorConfig** = `object`

Defined in: [types/ppt.ts:1348](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1348)

Configuration for slide generation

## Properties

### theme

> **theme**: `string` \| [`PresentationTheme`](PresentationTheme.md)

Defined in: [types/ppt.ts:1350](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1350)

Theme name or custom theme

---

### generateAIImages

> **generateAIImages**: `boolean`

Defined in: [types/ppt.ts:1352](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1352)

Whether to generate AI images (user-provided images are always used)

---

### aspectRatio

> **aspectRatio**: [`AspectRatioOption`](AspectRatioOption.md)

Defined in: [types/ppt.ts:1354](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1354)

Aspect ratio for slides

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/ppt.ts:1356](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1356)

Provider for image generation

---

### imageModel?

> `optional` **imageModel?**: `string`

Defined in: [types/ppt.ts:1358](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1358)

Model for image generation

---

### logo?

> `optional` **logo?**: `Buffer` \| `string` \| [`LogoConfig`](LogoConfig.md)

Defined in: [types/ppt.ts:1360](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1360)

Logo configuration

---

### userImages?

> `optional` **userImages?**: (`Buffer` \| `string`)[]

Defined in: [types/ppt.ts:1362](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1362)

User-provided images for slides (takes priority over AI generation)

---

### neurolink?

> `optional` **neurolink?**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/ppt.ts:1364](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L1364)

NeuroLink instance for image generation
