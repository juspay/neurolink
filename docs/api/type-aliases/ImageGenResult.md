[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenResult

# Type Alias: ImageGenResult

> **ImageGenResult** = `object`

Defined in: [types/imageGen.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L118)

Result of an image generation request

## Properties

### success

> **success**: `boolean`

Defined in: [types/imageGen.ts:122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L122)

Whether generation was successful

---

### imageBuffer?

> `optional` **imageBuffer?**: `Buffer`

Defined in: [types/imageGen.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L127)

Generated image as Buffer (if successful)

---

### base64?

> `optional` **base64?**: `string`

Defined in: [types/imageGen.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L132)

Generated image as base64 string (if successful)

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/imageGen.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L138)

MIME type of the generated image
e.g., "image/png", "image/jpeg"

---

### model?

> `optional` **model?**: `string`

Defined in: [types/imageGen.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L143)

Model used for generation

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/imageGen.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L148)

Provider used for generation

---

### error?

> `optional` **error?**: `string`

Defined in: [types/imageGen.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L153)

Error message if generation failed

---

### generationTimeMs?

> `optional` **generationTimeMs?**: `number`

Defined in: [types/imageGen.ts:158](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L158)

Time taken for generation in milliseconds

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/imageGen.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L163)

Additional metadata from the provider
