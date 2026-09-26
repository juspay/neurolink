[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractionResult

# Type Alias: ExtractionResult

> **ExtractionResult** = `object`

Extraction result for a single chunk

## Properties

### title?

> `optional` **title?**: `string`

Extracted title

---

### summary?

> `optional` **summary?**: `string`

Extracted summary

---

### keywords?

> `optional` **keywords?**: `string`[]

Extracted keywords

---

### questions?

> `optional` **questions?**: `object`[]

Generated Q&A pairs

#### question

> **question**: `string`

#### answer?

> `optional` **answer?**: `string`

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Custom schema extraction result
