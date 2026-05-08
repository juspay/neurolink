[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableEvaluationError

# Function: isRetryableEvaluationError()

> **isRetryableEvaluationError**(`error`): `boolean`

Defined in: [evaluation/errors/EvaluationError.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L63)

Checks if an error is retryable based on its code.
Transient errors (timeout, rate limit, some provider errors) are retryable.

## Parameters

### error

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

The error to check

## Returns

`boolean`

true if the error is retryable
