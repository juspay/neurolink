[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMaxRetriesExceededError

# Function: createMaxRetriesExceededError()

> **createMaxRetriesExceededError**(`attempts`, `lastScore`, `threshold`, `context?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

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
