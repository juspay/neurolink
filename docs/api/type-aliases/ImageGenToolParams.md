[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolParams

# Type Alias: ImageGenToolParams

> **ImageGenToolParams** = `object`

Defined in: [types/imageGen.ts:234](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L234)

Tool parameters for AI model use

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/imageGen.ts:238](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L238)

Detailed description of the image to generate

---

### negativePrompt?

> `optional` **negativePrompt?**: `string`

Defined in: [types/imageGen.ts:243](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L243)

What to avoid in the generated image (optional)

---

### aspectRatio?

> `optional` **aspectRatio?**: [`AspectRatio`](AspectRatio.md) \| `string`

Defined in: [types/imageGen.ts:248](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L248)

Aspect ratio like "16:9", "1:1", "4:3" (optional)

---

### style?

> `optional` **style?**: [`StylePreset`](StylePreset.md) \| `string`

Defined in: [types/imageGen.ts:253](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L253)

Style like "realistic", "artistic", "cartoon" (optional)
