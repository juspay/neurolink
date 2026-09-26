[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createBatchEvaluationError

# Function: createBatchEvaluationError()

> **createBatchEvaluationError**(`failedCount`, `totalCount`, `errors`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

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
