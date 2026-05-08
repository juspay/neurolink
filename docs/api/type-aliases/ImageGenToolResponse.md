[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolResponse

# Type Alias: ImageGenToolResponse

> **ImageGenToolResponse** = `object`

Defined in: [types/imageGen.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L259)

Response from the image generation tool

## Properties

### success

> **success**: `boolean`

Defined in: [types/imageGen.ts:263](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L263)

Whether the tool execution was successful

---

### image?

> `optional` **image?**: `string`

Defined in: [types/imageGen.ts:269](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L269)

Data URI of the generated image (if successful)
Format: data:image/png;base64,...

---

### message?

> `optional` **message?**: `string`

Defined in: [types/imageGen.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L274)

Human-readable message about the result

---

### error?

> `optional` **error?**: `string`

Defined in: [types/imageGen.ts:279](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L279)

Error message if execution failed
