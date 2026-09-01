[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseExtractorConfig

# Type Alias: BaseExtractorConfig

> **BaseExtractorConfig** = `object`

Defined in: [types/rag.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1066)

Base configuration for metadata extractors

## Properties

### modelName?

> `optional` **modelName?**: `string`

Defined in: [types/rag.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1068)

Language model to use for extraction

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1070)

Provider for the model

---

### promptTemplate?

> `optional` **promptTemplate?**: `string`

Defined in: [types/rag.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1072)

Custom prompt template

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1074)

Maximum tokens for LLM response

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:1076](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1076)

Temperature for LLM generation
