[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PresentationGenerationOptions

# Type Alias: PresentationGenerationOptions

> **PresentationGenerationOptions** = `object`

Defined in: [types/ppt.ts:1380](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1380)

Options for presentation generation

## Properties

### context

> **context**: [`PPTGenerationContext`](PPTGenerationContext.md)

Defined in: [types/ppt.ts:1382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1382)

PPT generation context (validated)

---

### provider

> **provider**: [`AIProvider`](AIProvider.md)

Defined in: [types/ppt.ts:1384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1384)

AI provider for content planning

---

### providerName

> **providerName**: `string`

Defined in: [types/ppt.ts:1386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1386)

Provider name (for result reporting)

---

### modelName

> **modelName**: `string`

Defined in: [types/ppt.ts:1388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1388)

Model name (for result reporting)

---

### neurolink?

> `optional` **neurolink?**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/ppt.ts:1390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1390)

NeuroLink instance for image generation

---

### imageProvider?

> `optional` **imageProvider?**: `string`

Defined in: [types/ppt.ts:1392](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1392)

Provider name for image generation

---

### imageModel?

> `optional` **imageModel?**: `string`

Defined in: [types/ppt.ts:1394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1394)

Model for image generation
