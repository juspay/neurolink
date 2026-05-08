[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractionResult

# Type Alias: ExtractionResult

> **ExtractionResult** = `object`

Defined in: [types/rag.ts:1089](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1089)

Extraction result for a single chunk

## Properties

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:1091](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1091)

Extracted title

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:1093](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1093)

Extracted summary

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:1095](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1095)

Extracted keywords

---

### questions?

> `optional` **questions?**: `object`[]

Defined in: [types/rag.ts:1097](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1097)

Generated Q&A pairs

#### question

> **question**: `string`

#### answer?

> `optional` **answer?**: `string`

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1099](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1099)

Custom schema extraction result
