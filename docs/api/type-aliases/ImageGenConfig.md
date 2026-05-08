[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenConfig

# Type Alias: ImageGenConfig

> **ImageGenConfig** = `object`

Defined in: [types/imageGen.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L169)

Configuration for the ImageGenService

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/imageGen.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L173)

Whether image generation is enabled

---

### defaultModel

> **defaultModel**: `string`

Defined in: [types/imageGen.ts:178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L178)

Default model to use for generation

---

### defaultProvider

> **defaultProvider**: [`ImageGenProvider`](ImageGenProvider.md) \| `string`

Defined in: [types/imageGen.ts:183](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L183)

Default provider for image generation

---

### defaultRegion?

> `optional` **defaultRegion?**: `string`

Defined in: [types/imageGen.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L188)

Default region for the provider (if applicable)

---

### timeout

> **timeout**: `number`

Defined in: [types/imageGen.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L193)

Timeout for generation requests in milliseconds

---

### defaultTemperature?

> `optional` **defaultTemperature?**: `number`

Defined in: [types/imageGen.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L198)

Default temperature for generation

---

### maxImages?

> `optional` **maxImages?**: `number`

Defined in: [types/imageGen.ts:203](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L203)

Maximum number of images per request

---

### maxReferenceImages?

> `optional` **maxReferenceImages?**: `number`

Defined in: [types/imageGen.ts:208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L208)

Maximum number of reference images allowed

---

### maxReferencePdfs?

> `optional` **maxReferencePdfs?**: `number`

Defined in: [types/imageGen.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/imageGen.ts#L213)

Maximum number of reference PDFs allowed
