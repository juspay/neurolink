[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationResult

# Type Alias: EvaluationResult

> **EvaluationResult** = `object`

Defined in: [types/evaluation.ts:238](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L238)

Represents the result of a single evaluation attempt, based on RAGAS principles.

## Properties

### finalScore

> **finalScore**: `number`

Defined in: [types/evaluation.ts:240](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L240)

The final, overall score for the response, typically from 1 to 10.

---

### relevanceScore

> **relevanceScore**: `number`

Defined in: [types/evaluation.ts:243](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L243)

How well the response addresses the user's query.

---

### accuracyScore

> **accuracyScore**: `number`

Defined in: [types/evaluation.ts:245](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L245)

The factual accuracy of the information in the response.

---

### completenessScore

> **completenessScore**: `number`

Defined in: [types/evaluation.ts:247](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L247)

How completely the response answers the user's query.

---

### isPassing

> **isPassing**: `boolean`

Defined in: [types/evaluation.ts:250](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L250)

Whether the final score meets the passing threshold.

---

### reasoning

> **reasoning**: `string`

Defined in: [types/evaluation.ts:252](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L252)

Constructive response from the judge LLM on how to improve the response.

---

### suggestedImprovements

> **suggestedImprovements**: `string`

Defined in: [types/evaluation.ts:254](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L254)

Specific suggestions for improving the response.

---

### rawEvaluationResponse

> **rawEvaluationResponse**: `string`

Defined in: [types/evaluation.ts:256](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L256)

The raw, unparsed response from the judge LLM.

---

### evaluationModel

> **evaluationModel**: `string`

Defined in: [types/evaluation.ts:259](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L259)

The model used to perform the evaluation.

---

### evaluationTime

> **evaluationTime**: `number`

Defined in: [types/evaluation.ts:261](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L261)

The time taken for the evaluation in milliseconds.

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/evaluation.ts:263](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L263)

The attempt number for this evaluation.
