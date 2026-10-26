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

---

### bytes

> **bytes**: `number`

Approximate bytes the call's segments take in memory; what `maxBytes` budgets.

---

### owner?

> `optional` **owner?**: `string`

The authenticated caller that created the call, when the server identified
one; the call is then listed and readable only by that caller. `undefined`
for a call made under no authentication or a shared key.
