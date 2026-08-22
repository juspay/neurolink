[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createEvaluationFailedError

# Function: createEvaluationFailedError()

> **createEvaluationFailedError**(`message`, `context?`, `cause?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:100](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/errors/EvaluationError.ts#L100)

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
