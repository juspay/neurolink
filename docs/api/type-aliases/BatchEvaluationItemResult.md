[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationItemResult

# Type Alias: BatchEvaluationItemResult

> **BatchEvaluationItemResult** = `object`

Defined in: [types/evaluation.ts:413](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L413)

Result of a single item in BatchEvaluator.

## Properties

### id

> **id**: `string`

Defined in: [types/evaluation.ts:414](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L414)

---

### success

> **success**: `boolean`

Defined in: [types/evaluation.ts:415](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L415)

---

### data?

> `optional` **data?**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/evaluation.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L416)

---

### error?

> `optional` **error?**: `object`

Defined in: [types/evaluation.ts:417](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L417)

#### message

> **message**: `string`

#### code?

> `optional` **code?**: `string`

#### retryable?

> `optional` **retryable?**: `boolean`

---

### duration

> **duration**: `number`

Defined in: [types/evaluation.ts:422](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L422)

---

### retryCount

> **retryCount**: `number`

Defined in: [types/evaluation.ts:423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L423)
