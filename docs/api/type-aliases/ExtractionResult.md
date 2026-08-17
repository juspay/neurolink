[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractionResult

# Type Alias: ExtractionResult

> **ExtractionResult** = `object`

Defined in: [types/rag.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1152)

Extraction result for a single chunk

## Properties

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1154)

Extracted title

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:1156](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1156)

Extracted summary

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1158)

Extracted keywords

---

### questions?

> `optional` **questions?**: `object`[]

Defined in: [types/rag.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1160)

Generated Q&A pairs

#### question

> **question**: `string`

#### answer?

> `optional` **answer?**: `string`

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1162)

Custom schema extraction result
