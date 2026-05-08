[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createParseError

# Function: createParseError()

> **createParseError**(`rawResponse`, `cause?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L121)

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
