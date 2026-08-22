[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createParseError

# Function: createParseError()

> **createParseError**(`rawResponse`, `cause?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:121](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/errors/EvaluationError.ts#L121)

Helper function to create a parse error with raw response.

## Parameters

### rawResponse

`string`

The raw response that failed to parse

### cause?

`Error`

The underlying parse error

## Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

A typed NeuroLinkFeatureError
