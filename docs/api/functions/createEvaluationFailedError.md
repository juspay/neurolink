[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createEvaluationFailedError

# Function: createEvaluationFailedError()

> **createEvaluationFailedError**(`message`, `context?`, `cause?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L100)

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
