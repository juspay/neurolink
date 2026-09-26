[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionStep

# Type Alias: NetworkExecutionStep

> **NetworkExecutionStep** = `object`

Single execution step in the trace

## Properties

### index

> **index**: `number`

Step index

---

### primitive

> **primitive**: `object`

Primitive that was executed

#### type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

#### id

> **id**: `string`

#### name

> **name**: `string`

---

### input

> **input**: `unknown`

Input to the primitive

---

### output?

> `optional` **output?**: `unknown`

Output from the primitive

---

### error?

> `optional` **error?**: `string`

Error if step failed

---

### duration

> **duration**: `number`

Duration in milliseconds

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Token usage for this step

---

### timestamp

> **timestamp**: `number`

Timestamp
