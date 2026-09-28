[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryToolResultRecord

# Type Alias: MemoryToolResultRecord

> **MemoryToolResultRecord** = `object`

One tool result as handed to conversation-memory storage after a loop step.

## Properties

### toolCallId?

> `optional` **toolCallId?**: `string`

---

### toolName?

> `optional` **toolName?**: `string`

---

### output?

> `optional` **output?**: `unknown`

---

### result?

> `optional` **result?**: `unknown`

Legacy alias of `output`; stores read whichever is present.

---

### error?

> `optional` **error?**: `string`

Set when the execution failed; persisted as `result.error` and `success: false`.

---

### stepIndex?

> `optional` **stepIndex?**: `number`

---

### timestamp?

> `optional` **timestamp?**: `Date`
