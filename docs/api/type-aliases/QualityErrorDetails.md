[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / QualityErrorDetails

# Type Alias: QualityErrorDetails

> **QualityErrorDetails** = `object`

Defined in: [types/evaluation.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L274)

Provides detailed information when a response fails quality assurance checks.

## Properties

### evaluationHistory

> **evaluationHistory**: [`EvaluationResult`](EvaluationResult.md)[]

Defined in: [types/evaluation.ts:276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L276)

The history of all evaluation attempts for this response.

---

### finalScore

> **finalScore**: `number`

Defined in: [types/evaluation.ts:278](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L278)

The final score of the last attempt.

---

### attempts

> **attempts**: `number`

Defined in: [types/evaluation.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L280)

The total number of evaluation attempts made.

---

### message

> **message**: `string`

Defined in: [types/evaluation.ts:282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L282)

A summary message of the failure.
