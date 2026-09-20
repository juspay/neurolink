[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseExtractorConfig

# Type Alias: BaseExtractorConfig

> **BaseExtractorConfig** = `object`

Defined in: [types/rag.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1085)

Base configuration for metadata extractors

## Properties

### modelName?

> `optional` **modelName?**: `string`

Defined in: [types/rag.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1087)

Language model to use for extraction

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1089)

Provider for the model

---

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Defined in: [types/rag.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1091)

Custom prompt template

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1093)

Maximum tokens for LLM response

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1095)

Temperature for LLM generation
