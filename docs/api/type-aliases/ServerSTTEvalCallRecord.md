[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalCallRecord

# Type Alias: ServerSTTEvalCallRecord

> **ServerSTTEvalCallRecord** = `object`

A call as the evaluation store holds it in memory.

## Properties

### callId

> **callId**: `string`

---

### room

> **room**: `string` \| `null`

---

### models

> **models**: `object`

#### primary

> **primary**: `string`

#### shadow

> **shadow**: `string`

---

### final

> **final**: `boolean`

---

### batches

> **batches**: `Set`\<`number`\>

---

### segments

> **segments**: `Map`\<`string`, [`ServerSTTEvalSegment`](ServerSTTEvalSegment.md)\>

---

### updatedAt

> **updatedAt**: `number`
