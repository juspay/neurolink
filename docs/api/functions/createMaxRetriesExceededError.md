[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMaxRetriesExceededError

# Function: createMaxRetriesExceededError()

> **createMaxRetriesExceededError**(`attempts`, `lastScore`, `threshold`, `context?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L195)

Helper function to create a max retries exceeded error.

## Parameters

### attempts

`number`

The number of attempts made

### lastScore

`number`

The last evaluation score

### threshold

`number`

The passing threshold

### context?

[`EvaluationErrorContext`](../type-aliases/EvaluationErrorContext.md)

The evaluation context

## Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

A typed NeuroLinkFeatureError
