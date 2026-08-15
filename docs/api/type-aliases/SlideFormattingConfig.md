[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideFormattingConfig

# Type Alias: SlideFormattingConfig

> **SlideFormattingConfig** = `object`

Defined in: [types/ppt.ts:291](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L291)

Slide-level formatting config (can be specified by AI or use defaults)
Applied to all bullets in the slide unless overridden at bullet level

## Properties

### baseFontSize?

> `optional` **baseFontSize?**: `number`

Defined in: [types/ppt.ts:293](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L293)

Base font size for bullets (default calculated based on bullet count)

---

### bulletStyle?

> `optional` **bulletStyle?**: [`BulletStyle`](BulletStyle.md)

Defined in: [types/ppt.ts:295](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L295)

Default bullet style for this slide

---

### lineSpacing?

> `optional` **lineSpacing?**: `number`

Defined in: [types/ppt.ts:297](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/ppt.ts#L297)

Line spacing multiplier (default 1.2)
