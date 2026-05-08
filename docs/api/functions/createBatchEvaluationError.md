[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBatchEvaluationError

# Function: createBatchEvaluationError()

> **createBatchEvaluationError**(`failedCount`, `totalCount`, `errors`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L224)

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
