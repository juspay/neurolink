[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDateIssue

# Type Alias: ToolDateIssue

> **ToolDateIssue** = `object`

The part of a Zod issue that date revival in `validateToolInput` reads.

## Properties

### code?

> `optional` **code?**: `unknown`

---

### expected?

> `optional` **expected?**: `unknown`

---

### path?

> `optional` **path?**: `unknown`

---

### errors?

> `optional` **errors?**: `unknown`

Zod 4: the issues of each branch of a union, with paths relative to it.

---

### unionErrors?

> `optional` **unionErrors?**: `unknown`

Zod 3: one entry per union branch, its issues carrying absolute paths.
