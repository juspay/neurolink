[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationItemResult

# Type Alias: BatchEvaluationItemResult

> **BatchEvaluationItemResult** = `object`

Result of a single item in BatchEvaluator.

## Properties

### id

> **id**: `string`

---

### success

> **success**: `boolean`

---

### data?

> `optional` **data?**: [`EvaluationData`](EvaluationData.md)

---

### error?

> `optional` **error?**: `object`

#### message

> **message**: `string`

#### code?

> `optional` **code?**: `string`

#### retryable?

> `optional` **retryable?**: `boolean`

---

### duration

> **duration**: `number`

---

### retryCount

> **retryCount**: `number`
