[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryManager

# Class: RetryManager

Manages the retry logic for the auto-evaluation middleware. It decides if a
retry is warranted based on the evaluation score and prepares the options
for the next generation attempt by incorporating feedback into the prompt.

## Constructors

### Constructor

> **new RetryManager**(`maxRetries?`): `RetryManager`

#### Parameters

##### maxRetries?

`number` = `2`

#### Returns

`RetryManager`

## Methods

### shouldRetry()

> **shouldRetry**(`evaluation`): `boolean`

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
