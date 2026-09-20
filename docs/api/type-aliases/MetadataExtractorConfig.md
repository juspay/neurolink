[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractorConfig

# Type Alias: MetadataExtractorConfig

> **MetadataExtractorConfig** = `object`

Defined in: [types/rag.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L120)

Metadata extractor configuration

## Properties

### type

> **type**: [`MetadataExtractorType`](MetadataExtractorType.md)

Defined in: [types/rag.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L122)

Extractor type

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L124)

Language model provider

---

### modelName?

> `optional` **modelName?**: `string`

Defined in: [types/rag.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L126)

Model name for LLM-based extraction

---

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Defined in: [types/rag.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L128)

Custom prompt template

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L130)

Maximum tokens for LLM response

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L132)

Temperature for LLM generation
