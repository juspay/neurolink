[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PresentationGenerationOptions

# Type Alias: PresentationGenerationOptions

> **PresentationGenerationOptions** = `object`

Options for presentation generation

## Properties

### context

> **context**: [`PPTGenerationContext`](PPTGenerationContext.md)

PPT generation context (validated)

---

### provider

> **provider**: [`AIProvider`](AIProvider.md)

AI provider for content planning

---

### providerName

> **providerName**: `string`

Provider name (for result reporting)

---

### modelName

> **modelName**: `string`

Model name (for result reporting)

---

### neurolink?

> `optional` **neurolink?**: [`NeuroLink`](../classes/NeuroLink.md)

NeuroLink instance for image generation

---

### imageProvider?

> `optional` **imageProvider?**: `string`

Provider name for image generation

---

### imageModel?

> `optional` **imageModel?**: `string`

Model for image generation
