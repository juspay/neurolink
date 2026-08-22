[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationItemResult

# Type Alias: BatchEvaluationItemResult

> **BatchEvaluationItemResult** = `object`

Defined in: [types/evaluation.ts:408](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L408)

Result of a single item in BatchEvaluator.

## Properties

### id

> **id**: `string`

Defined in: [types/evaluation.ts:409](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L409)

---

### success

> **success**: `boolean`

Defined in: [types/evaluation.ts:410](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L410)

---

### data?

> `optional` **data?**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/evaluation.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L411)

---

### error?

> `optional` **error?**: `object`

Defined in: [types/evaluation.ts:412](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L412)

#### message

> **message**: `string`

#### code?

> `optional` **code?**: `string`

#### retryable?

> `optional` **retryable?**: `boolean`

---

### duration

> **duration**: `number`

Defined in: [types/evaluation.ts:417](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L417)

---

### retryCount

> **retryCount**: `number`

Defined in: [types/evaluation.ts:418](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L418)
