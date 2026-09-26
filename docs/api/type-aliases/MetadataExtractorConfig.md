[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractorConfig

# Type Alias: MetadataExtractorConfig

> **MetadataExtractorConfig** = `object`

Metadata extractor configuration

## Properties

### type

> **type**: [`MetadataExtractorType`](MetadataExtractorType.md)

Extractor type

---

### provider?

> `optional` **provider?**: `string`

Language model provider

---

### modelName?

> `optional` **modelName?**: `string`

Model name for LLM-based extraction

---

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Custom prompt template

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens for LLM response

---

### temperature?

> `optional` **temperature?**: `number`

Temperature for LLM generation
