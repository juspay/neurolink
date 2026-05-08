[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolParams

# Type Alias: ImageGenToolParams

> **ImageGenToolParams** = `object`

Defined in: [types/imageGen.ts:234](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L234)

Tool parameters for AI model use

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/imageGen.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L238)

Detailed description of the image to generate

---

### negativePrompt?

> `optional` **negativePrompt?**: `string`

Defined in: [types/imageGen.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L243)

What to avoid in the generated image (optional)

---

### aspectRatio?

> `optional` **aspectRatio?**: [`AspectRatio`](AspectRatio.md) \| `string`

Defined in: [types/imageGen.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L248)

Aspect ratio like "16:9", "1:1", "4:3" (optional)

---

### style?

> `optional` **style?**: [`StylePreset`](StylePreset.md) \| `string`

Defined in: [types/imageGen.ts:253](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L253)

Style like "realistic", "artistic", "cartoon" (optional)
