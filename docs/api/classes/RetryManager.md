[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryManager

# Class: RetryManager

Defined in: [evaluation/retryManager.ts:15](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/retryManager.ts#L15)

Manages the retry logic for the auto-evaluation middleware. It decides if a
retry is warranted based on the evaluation score and prepares the options
for the next generation attempt by incorporating feedback into the prompt.

## Constructors

### Constructor

> **new RetryManager**(`maxRetries?`): `RetryManager`

Defined in: [evaluation/retryManager.ts:18](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/retryManager.ts#L18)

#### Parameters

##### maxRetries?

`number` = `2`

#### Returns

`RetryManager`

## Methods

### shouldRetry()

> **shouldRetry**(`evaluation`): `boolean`

Defined in: [evaluation/retryManager.ts:29](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/retryManager.ts#L29)

Determines if a retry should be attempted based on the evaluation result.

#### Parameters

##### evaluation

[`EvaluationResult`](../type-aliases/EvaluationResult.md)

The `EvaluationResult` of the last attempt.

#### Returns

`boolean`

`true` if the response did not pass and the maximum number of retries has not been reached.

---

### prepareRetryOptions()

> **prepareRetryOptions**(`originalOptions`, `evaluation`): [`TextGenerationOptions`](../type-aliases/TextGenerationOptions.md)

Defined in: [evaluation/retryManager.ts:43](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/evaluation/retryManager.ts#L43)

Prepares the options for the next generation attempt by creating a new,
improved prompt that includes feedback from the failed evaluation.

#### Parameters

##### originalOptions

[`TextGenerationOptions`](../type-aliases/TextGenerationOptions.md)

The original `TextGenerationOptions` from the user request.

##### evaluation

[`EvaluationResult`](../type-aliases/EvaluationResult.md)

The `EvaluationResult` of the failed attempt.

#### Returns

[`TextGenerationOptions`](../type-aliases/TextGenerationOptions.md)

A new `TextGenerationOptions` object with an improved prompt.
