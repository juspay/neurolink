[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideFormattingConfig

# Type Alias: SlideFormattingConfig

> **SlideFormattingConfig** = `object`

Defined in: [types/ppt.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L291)

Slide-level formatting config (can be specified by AI or use defaults)
Applied to all bullets in the slide unless overridden at bullet level

## Properties

### baseFontSize?

> `optional` **baseFontSize?**: `number`

Defined in: [types/ppt.ts:293](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L293)

Base font size for bullets (default calculated based on bullet count)

---

### bulletStyle?

> `optional` **bulletStyle?**: [`BulletStyle`](BulletStyle.md)

Defined in: [types/ppt.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L295)

Default bullet style for this slide

---

### lineSpacing?

> `optional` **lineSpacing?**: `number`

Defined in: [types/ppt.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L297)

Line spacing multiplier (default 1.2)
