[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractionResult

# Type Alias: ExtractionResult

> **ExtractionResult** = `object`

Defined in: [types/rag.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1171)

Extraction result for a single chunk

## Properties

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:1173](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1173)

Extracted title

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1175)

Extracted summary

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1177)

Extracted keywords

---

### questions?

> `optional` **questions?**: `object`[]

Defined in: [types/rag.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1179)

Generated Q&A pairs

#### question

> **question**: `string`

#### answer?

> `optional` **answer?**: `string`

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1181)

Custom schema extraction result
