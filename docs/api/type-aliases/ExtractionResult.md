[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractionResult

# Type Alias: ExtractionResult

> **ExtractionResult** = `object`

Defined in: [types/rag.ts:1133](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1133)

Extraction result for a single chunk

## Properties

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:1135](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1135)

Extracted title

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:1137](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1137)

Extracted summary

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:1139](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1139)

Extracted keywords

---

### questions?

> `optional` **questions?**: `object`[]

Defined in: [types/rag.ts:1141](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1141)

Generated Q&A pairs

#### question

> **question**: `string`

#### answer?

> `optional` **answer?**: `string`

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1143](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1143)

Custom schema extraction result
