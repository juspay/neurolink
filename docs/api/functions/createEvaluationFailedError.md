[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createEvaluationFailedError

# Function: createEvaluationFailedError()

> **createEvaluationFailedError**(`message`, `context?`, `cause?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Helper function to create an evaluation failed error with context.

## Parameters

### message

`string`

The error message

### context?

[`EvaluationErrorContext`](../type-aliases/EvaluationErrorContext.md)

The evaluation context

### cause?

`Error`

The underlying cause error

## Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

A typed NeuroLinkFeatureError
