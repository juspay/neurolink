[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableEvaluationError

# Function: isRetryableEvaluationError()

> **isRetryableEvaluationError**(`error`): `boolean`

Defined in: [evaluation/errors/EvaluationError.ts:63](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/errors/EvaluationError.ts#L63)

Checks if an error is retryable based on its code.
Transient errors (timeout, rate limit, some provider errors) are retryable.

## Parameters

### error

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

The error to check

## Returns

`boolean`

true if the error is retryable
