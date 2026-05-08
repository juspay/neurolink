[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createProviderError

# Function: createProviderError()

> **createProviderError**(`message`, `provider`, `cause?`, `options?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L170)

Helper function to create a provider error.

## Parameters

### message

`string`

The error message

### provider

`string`

The provider that failed

### cause?

`Error`

The underlying cause error

### options?

#### retryable?

`boolean`

## Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

A typed NeuroLinkFeatureError
