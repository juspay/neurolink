[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBatchEvaluationError

# Function: createBatchEvaluationError()

> **createBatchEvaluationError**(`failedCount`, `totalCount`, `errors`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:224](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/errors/EvaluationError.ts#L224)

Helper function to create a batch evaluation error.

## Parameters

### failedCount

`number`

Number of evaluations that failed

### totalCount

`number`

Total number of evaluations attempted

### errors

`object`[]

Array of individual errors

## Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

A typed NeuroLinkFeatureError
