[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationResult

# Type Alias: EvaluationResult

> **EvaluationResult** = `object`

Represents the result of a single evaluation attempt, based on RAGAS principles.

## Properties

### finalScore

> **finalScore**: `number`

The final, overall score for the response, typically from 1 to 10.

---

### relevanceScore

> **relevanceScore**: `number`

How well the response addresses the user's query.

---

### accuracyScore

> **accuracyScore**: `number`

The factual accuracy of the information in the response.

---

### completenessScore

> **completenessScore**: `number`

How completely the response answers the user's query.

---

### isPassing

> **isPassing**: `boolean`

Whether the final score meets the passing threshold.

---

### reasoning

> **reasoning**: `string`

Constructive response from the judge LLM on how to improve the response.

---

### suggestedImprovements

> **suggestedImprovements**: `string`

Specific suggestions for improving the response.

---

### rawEvaluationResponse

> **rawEvaluationResponse**: `string`

The raw, unparsed response from the judge LLM.

---

### evaluationModel

> **evaluationModel**: `string`

The model used to perform the evaluation.

---

### evaluationTime

> **evaluationTime**: `number`

The time taken for the evaluation in milliseconds.

---

### attemptNumber

> **attemptNumber**: `number`

The attempt number for this evaluation.
