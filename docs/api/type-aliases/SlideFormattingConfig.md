[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SlideFormattingConfig

# Type Alias: SlideFormattingConfig

> **SlideFormattingConfig** = `object`

Slide-level formatting config (can be specified by AI or use defaults)
Applied to all bullets in the slide unless overridden at bullet level

## Properties

### baseFontSize?

> `optional` **baseFontSize?**: `number`

Base font size for bullets (default calculated based on bullet count)

---

### bulletStyle?

> `optional` **bulletStyle?**: [`BulletStyle`](BulletStyle.md)

Default bullet style for this slide

---

### lineSpacing?

> `optional` **lineSpacing?**: `number`

Line spacing multiplier (default 1.2)
