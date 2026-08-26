[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChecklistItem

# Type Alias: ChecklistItem

> **ChecklistItem** = `object`

Defined in: [types/tasks.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L18)

## Properties

### id

> **id**: `string`

Defined in: [types/tasks.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L20)

"t1", "t2", … — assigned by the engine, never by the model.

---

### title

> **title**: `string`

Defined in: [types/tasks.ts:21](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L21)

---

### status

> **status**: [`ChecklistItemStatus`](ChecklistItemStatus.md)

Defined in: [types/tasks.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L22)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/tasks.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L24)

Result note, or the REASON an item was closed unfinished.

---

### createdAt

> **createdAt**: `number`

Defined in: [types/tasks.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L25)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/tasks.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/tasks.ts#L26)
