[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createProviderError

# Function: createProviderError()

> **createProviderError**(`message`, `provider`, `cause?`, `options?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

Defined in: [evaluation/errors/EvaluationError.ts:170](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/errors/EvaluationError.ts#L170)

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
