[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideGeneratorConfig

# Type Alias: SlideGeneratorConfig

> **SlideGeneratorConfig** = `object`

Defined in: [types/ppt.ts:1348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1348)

Configuration for slide generation

## Properties

### theme

> **theme**: `string` \| [`PresentationTheme`](PresentationTheme.md)

Defined in: [types/ppt.ts:1350](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1350)

Theme name or custom theme

---

### generateAIImages

> **generateAIImages**: `boolean`

Defined in: [types/ppt.ts:1352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1352)

Whether to generate AI images (user-provided images are always used)

---

### aspectRatio

> **aspectRatio**: [`AspectRatioOption`](AspectRatioOption.md)

Defined in: [types/ppt.ts:1354](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1354)

Aspect ratio for slides

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/ppt.ts:1356](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1356)

Provider for image generation

---

### imageModel?

> `optional` **imageModel?**: `string`

Defined in: [types/ppt.ts:1358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1358)

Model for image generation

---

### logo?

> `optional` **logo?**: `Buffer` \| `string` \| [`LogoConfig`](LogoConfig.md)

Defined in: [types/ppt.ts:1360](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1360)

Logo configuration

---

### userImages?

> `optional` **userImages?**: (`Buffer` \| `string`)[]

Defined in: [types/ppt.ts:1362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1362)

User-provided images for slides (takes priority over AI generation)

---

### neurolink?

> `optional` **neurolink?**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/ppt.ts:1364](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1364)

NeuroLink instance for image generation
