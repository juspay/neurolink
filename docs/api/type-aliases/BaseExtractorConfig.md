[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseExtractorConfig

# Type Alias: BaseExtractorConfig

> **BaseExtractorConfig** = `object`

Defined in: [types/rag.ts:1003](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1003)

Base configuration for metadata extractors

## Properties

### modelName?

> `optional` **modelName?**: `string`

Defined in: [types/rag.ts:1005](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1005)

Language model to use for extraction

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:1007](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1007)

Provider for the model

---

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Defined in: [types/rag.ts:1009](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1009)

Custom prompt template

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:1011](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1011)

Maximum tokens for LLM response

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:1013](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1013)

Temperature for LLM generation
