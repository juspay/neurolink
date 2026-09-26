[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createProviderError

# Function: createProviderError()

> **createProviderError**(`message`, `provider`, `cause?`, `options?`): [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

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
