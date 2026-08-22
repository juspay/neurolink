[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / QualityErrorDetails

# Type Alias: QualityErrorDetails

> **QualityErrorDetails** = `object`

Defined in: [types/evaluation.ts:269](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L269)

Provides detailed information when a response fails quality assurance checks.

## Properties

### evaluationHistory

> **evaluationHistory**: [`EvaluationResult`](EvaluationResult.md)[]

Defined in: [types/evaluation.ts:271](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L271)

The history of all evaluation attempts for this response.

---

### finalScore

> **finalScore**: `number`

Defined in: [types/evaluation.ts:273](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L273)

The final score of the last attempt.

---

### attempts

> **attempts**: `number`

Defined in: [types/evaluation.ts:275](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L275)

The total number of evaluation attempts made.

---

### message

> **message**: `string`

Defined in: [types/evaluation.ts:277](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L277)

A summary message of the failure.
