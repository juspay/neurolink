[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isRetryableEvaluationError

# Function: isRetryableEvaluationError()

> **isRetryableEvaluationError**(`error`): `boolean`

Defined in: [evaluation/errors/EvaluationError.ts:63](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/errors/EvaluationError.ts#L63)

Checks if an error is retryable based on its code.
Transient errors (timeout, rate limit, some provider errors) are retryable.

## Parameters

### error

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

The error to check

## Returns

`boolean`

true if the error is retryable
