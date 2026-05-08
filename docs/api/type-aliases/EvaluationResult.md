[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationResult

# Type Alias: EvaluationResult

> **EvaluationResult** = `object`

Defined in: [types/evaluation.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L243)

Represents the result of a single evaluation attempt, based on RAGAS principles.

## Properties

### finalScore

> **finalScore**: `number`

Defined in: [types/evaluation.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L245)

The final, overall score for the response, typically from 1 to 10.

---

### relevanceScore

> **relevanceScore**: `number`

Defined in: [types/evaluation.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L248)

How well the response addresses the user's query.

---

### accuracyScore

> **accuracyScore**: `number`

Defined in: [types/evaluation.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L250)

The factual accuracy of the information in the response.

---

### completenessScore

> **completenessScore**: `number`

Defined in: [types/evaluation.ts:252](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L252)

How completely the response answers the user's query.

---

### isPassing

> **isPassing**: `boolean`

Defined in: [types/evaluation.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L255)

Whether the final score meets the passing threshold.

---

### reasoning

> **reasoning**: `string`

Defined in: [types/evaluation.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L257)

Constructive response from the judge LLM on how to improve the response.

---

### suggestedImprovements

> **suggestedImprovements**: `string`

Defined in: [types/evaluation.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L259)

Specific suggestions for improving the response.

---

### rawEvaluationResponse

> **rawEvaluationResponse**: `string`

Defined in: [types/evaluation.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L261)

The raw, unparsed response from the judge LLM.

---

### evaluationModel

> **evaluationModel**: `string`

Defined in: [types/evaluation.ts:264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L264)

The model used to perform the evaluation.

---

### evaluationTime

> **evaluationTime**: `number`

Defined in: [types/evaluation.ts:266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L266)

The time taken for the evaluation in milliseconds.

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/evaluation.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L268)

The attempt number for this evaluation.
