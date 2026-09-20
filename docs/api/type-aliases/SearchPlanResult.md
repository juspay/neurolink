[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SearchPlanResult

# Type Alias: SearchPlanResult

> **SearchPlanResult** = `object`

Defined in: [types/rag.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1824)

A suggested retrieval plan for one query. Every field is optional and means
"use this unless the caller passed an explicit option".

## Properties

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1825)

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1826)

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1827)

---

### rerank?

> `optional` **rerank?**: `boolean`

Defined in: [types/rag.ts:1828](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1828)

---

### breadthLevel?

> `optional` **breadthLevel?**: `number`

Defined in: [types/rag.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1830)

Index into the breadth rubric the topK was derived from.

---

### model

> **model**: `string`

Defined in: [types/rag.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1832)

Resolved decision model id, for telemetry.

---

### latencyMs

> **latencyMs**: `number`

Defined in: [types/rag.ts:1834](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1834)

Round trip in milliseconds.
