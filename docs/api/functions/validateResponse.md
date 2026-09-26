[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateResponse

# Function: validateResponse()

> **validateResponse**(`responseText`, `config`, `retryCount?`): [`ResponseValidationResult`](../type-aliases/ResponseValidationResult.md)

Validate (and optionally mutate) an LLM response.

## Parameters

### responseText

`string`

The raw text returned by the model.

### config

[`ResponseValidationConfig`](../type-aliases/ResponseValidationConfig.md)

Validation rules and action preferences.

### retryCount?

`number`

Current retry iteration (passed through to result).

## Returns

[`ResponseValidationResult`](../type-aliases/ResponseValidationResult.md)

A [ResponseValidationResult](../type-aliases/ResponseValidationResult.md) with the (possibly truncated)
text, a disposition action, all issues found, and optional feedback.
