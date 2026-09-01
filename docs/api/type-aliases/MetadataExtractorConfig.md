[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractorConfig

# Type Alias: MetadataExtractorConfig

> **MetadataExtractorConfig** = `object`

Defined in: [types/rag.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L119)

Metadata extractor configuration

## Properties

### type

> **type**: [`MetadataExtractorType`](MetadataExtractorType.md)

Defined in: [types/rag.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L121)

Extractor type

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L123)

Language model provider

---

### modelName?

> `optional` **modelName?**: `string`

Defined in: [types/rag.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L125)

Model name for LLM-based extraction

---

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Defined in: [types/rag.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L127)

Custom prompt template

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L129)

Maximum tokens for LLM response

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L131)

Temperature for LLM generation
