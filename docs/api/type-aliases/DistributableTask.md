[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DistributableTask

# Type Alias: DistributableTask

> **DistributableTask** = `object`

Task definition for distribution

## Properties

### id

> **id**: `string`

Unique task ID

---

### input

> **input**: `string`

Task description/input

---

### priority

> **priority**: [`TaskPriority`](TaskPriority.md)

Task priority

---

### requiredSkills?

> `optional` **requiredSkills?**: `string`[]

Required skills/capabilities

---

### preferredAgent?

> `optional` **preferredAgent?**: `string`

Preferred agent (for affinity)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Task metadata

---

### deadline?

> `optional` **deadline?**: `number`

Deadline timestamp

---

### parentTaskId?

> `optional` **parentTaskId?**: `string`

Parent task ID (for subtasks)

---

### dependencies?

> `optional` **dependencies?**: `string`[]

Dependencies (task IDs)
