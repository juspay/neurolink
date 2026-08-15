[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideSchema

# Type Alias: SlideSchema

> **SlideSchema** = `object`

Defined in: [types/ppt.ts:690](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L690)

Schema for a single slide in the content plan

## Properties

### slideNumber

> **slideNumber**: `number`

Defined in: [types/ppt.ts:692](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L692)

Slide number (1-based)

---

### type

> **type**: [`SlideType`](SlideType.md)

Defined in: [types/ppt.ts:694](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L694)

Type of slide (determines purpose)

---

### layout

> **layout**: [`SlideLayout`](SlideLayout.md)

Defined in: [types/ppt.ts:696](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L696)

Layout template to use

---

### title

> **title**: `string`

Defined in: [types/ppt.ts:698](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L698)

Slide title

---

### content

> **content**: [`SlideContent`](SlideContent.md)

Defined in: [types/ppt.ts:700](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L700)

Slide content based on type

---

### imagePrompt

> **imagePrompt**: `string` \| `null`

Defined in: [types/ppt.ts:705](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L705)

AI image generation prompt (null = no image for this slide)
Should describe a professional, relevant image WITHOUT text in the image

---

### speakerNotes

> **speakerNotes**: `string`

Defined in: [types/ppt.ts:707](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L707)

Speaker notes for the presenter
