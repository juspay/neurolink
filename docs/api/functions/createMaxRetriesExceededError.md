[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMaxRetriesExceededError

# Function: createMaxRetriesExceededError()

> **createMaxRetriesExceededError**(`attempts`, `lastScore`, `threshold`, `context?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:195](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/errors/EvaluationError.ts#L195)

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
