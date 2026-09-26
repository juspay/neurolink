[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideSchema

# Type Alias: SlideSchema

> **SlideSchema** = `object`

Schema for a single slide in the content plan

## Properties

### slideNumber

> **slideNumber**: `number`

Slide number (1-based)

---

### type

> **type**: [`SlideType`](SlideType.md)

Type of slide (determines purpose)

---

### layout

> **layout**: [`SlideLayout`](SlideLayout.md)

Layout template to use

---

### title

> **title**: `string`

Slide title

---

### content

> **content**: [`SlideContent`](SlideContent.md)

Slide content based on type

---

### imagePrompt

> **imagePrompt**: `string` \| `null`

AI image generation prompt (null = no image for this slide)
Should describe a professional, relevant image WITHOUT text in the image

---

### speakerNotes

> **speakerNotes**: `string`

Speaker notes for the presenter
