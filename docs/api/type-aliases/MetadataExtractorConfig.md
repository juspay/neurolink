[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataExtractorConfig

# Type Alias: MetadataExtractorConfig

> **MetadataExtractorConfig** = `object`

Defined in: [types/rag.ts:116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L116)

Metadata extractor configuration

## Properties

### type

> **type**: [`MetadataExtractorType`](MetadataExtractorType.md)

Defined in: [types/rag.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L118)

Extractor type

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L120)

Language model provider

---

### modelName?

> `optional` **modelName?**: `string`

Defined in: [types/rag.ts:122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L122)

Model name for LLM-based extraction

---

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Defined in: [types/rag.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L124)

Custom prompt template

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L126)

Maximum tokens for LLM response

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L128)

Temperature for LLM generation
