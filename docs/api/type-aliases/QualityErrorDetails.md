[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QualityErrorDetails

# Type Alias: QualityErrorDetails

> **QualityErrorDetails** = `object`

Provides detailed information when a response fails quality assurance checks.

## Properties

### evaluationHistory

> **evaluationHistory**: [`EvaluationResult`](EvaluationResult.md)[]

The history of all evaluation attempts for this response.

---

### finalScore

> **finalScore**: `number`

The final score of the last attempt.

---

### attempts

> **attempts**: `number`

The total number of evaluation attempts made.

---

### message

> **message**: `string`

A summary message of the failure.
