[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PPTGenerationContext

# Type Alias: PPTGenerationContext

> **PPTGenerationContext** = `object`

Defined in: [types/ppt.ts:780](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L780)

Context extracted from GenerateOptions for PPT generation

## Properties

### topic

> **topic**: `string`

Defined in: [types/ppt.ts:782](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L782)

Original topic/prompt from user

---

### pages

> **pages**: `number`

Defined in: [types/ppt.ts:784](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L784)

Number of slides requested (required)

---

### theme

> **theme**: `string`

Defined in: [types/ppt.ts:786](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L786)

Selected theme name ("AI will decide" means AI chooses)

---

### audience

> **audience**: `string`

Defined in: [types/ppt.ts:788](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L788)

Target audience ("AI will decide" means AI chooses)

---

### tone

> **tone**: `string`

Defined in: [types/ppt.ts:790](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L790)

Presentation tone ("AI will decide" means AI chooses)

---

### generateAIImages

> **generateAIImages**: `boolean`

Defined in: [types/ppt.ts:792](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L792)

Whether to generate AI images (user-provided images via input.images are always used)

---

### aspectRatio

> **aspectRatio**: [`AspectRatioOption`](AspectRatioOption.md)

Defined in: [types/ppt.ts:794](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L794)

Aspect ratio

---

### outputPath?

> `optional` **outputPath?**: `string`

Defined in: [types/ppt.ts:796](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L796)

Custom output path

---

### logo?

> `optional` **logo?**: `Buffer` \| `string`

Defined in: [types/ppt.ts:798](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L798)

Logo data or path if provided

---

### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

Defined in: [types/ppt.ts:800](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L800)

User-provided images for slides (from input.images)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/ppt.ts:802](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L802)

Provider name (for logging)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/ppt.ts:804](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L804)

Model name (for logging)
