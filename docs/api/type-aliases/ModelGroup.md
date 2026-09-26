[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelGroup

# Type Alias: ModelGroup

> **ModelGroup** = `object`

Model group for layer-based execution
Enables sequential vs parallel control at group level

## Properties

### id

> **id**: `string`

---

### name?

> `optional` **name?**: `string`

---

### description?

> `optional` **description?**: `string`

---

### models

> **models**: [`WorkflowModelConfig`](WorkflowModelConfig.md)[]

---

### executionStrategy

> **executionStrategy**: [`ExecutionStrategy`](ExecutionStrategy.md)

---

### continueOnFailure?

> `optional` **continueOnFailure?**: `boolean`

---

### minSuccessful?

> `optional` **minSuccessful?**: `number`

---

### parallelism?

> `optional` **parallelism?**: `number`

---

### timeout?

> `optional` **timeout?**: `number`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>
