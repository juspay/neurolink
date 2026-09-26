[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SearchPlanResult

# Type Alias: SearchPlanResult

> **SearchPlanResult** = `object`

A suggested retrieval plan for one query. Every field is optional and means
"use this unless the caller passed an explicit option".

## Properties

### topK?

> `optional` **topK?**: `number`

---

### hybrid?

> `optional` **hybrid?**: `boolean`

---

### graph?

> `optional` **graph?**: `boolean`

---

### rerank?

> `optional` **rerank?**: `boolean`

---

### breadthLevel?

> `optional` **breadthLevel?**: `number`

Index into the breadth rubric the topK was derived from.

---

### model

> **model**: `string`

Resolved decision model id, for telemetry.

---

### latencyMs

> **latencyMs**: `number`

Round trip in milliseconds.
