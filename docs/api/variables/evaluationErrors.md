[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / evaluationErrors

# Variable: evaluationErrors

> `const` **evaluationErrors**: `object`

Defined in: [evaluation/errors/EvaluationError.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/errors/EvaluationError.ts#L51)

Factory for creating typed evaluation errors.
Uses the createErrorFactory pattern from core infrastructure.

## Type Declaration

### codes

> **codes**: `object`

#### codes.EVALUATION_FAILED

> `readonly` **EVALUATION_FAILED**: `"EVALUATION_FAILED"` = `"EVALUATION_FAILED"`

The evaluation process itself failed

#### codes.PARSE_ERROR

> `readonly` **PARSE_ERROR**: `"PARSE_ERROR"` = `"PARSE_ERROR"`

Failed to parse the evaluation response from the judge LLM

#### codes.STRATEGY_NOT_FOUND

> `readonly` **STRATEGY_NOT_FOUND**: `"STRATEGY_NOT_FOUND"` = `"STRATEGY_NOT_FOUND"`

The requested evaluation strategy was not found in the registry

#### codes.PROVIDER_ERROR

> `readonly` **PROVIDER_ERROR**: `"PROVIDER_ERROR"` = `"PROVIDER_ERROR"`

The AI provider for evaluation failed

#### codes.CONFIGURATION_ERROR

> `readonly` **CONFIGURATION_ERROR**: `"CONFIGURATION_ERROR"` = `"CONFIGURATION_ERROR"`

Configuration for evaluation is invalid or missing

#### codes.CUSTOM_EVALUATOR_ERROR

> `readonly` **CUSTOM_EVALUATOR_ERROR**: `"CUSTOM_EVALUATOR_ERROR"` = `"CUSTOM_EVALUATOR_ERROR"`

The custom evaluator function threw an error

#### codes.BATCH_EVALUATION_ERROR

> `readonly` **BATCH_EVALUATION_ERROR**: `"BATCH_EVALUATION_ERROR"` = `"BATCH_EVALUATION_ERROR"`

Batch evaluation failed for one or more items

#### codes.AGGREGATION_ERROR

> `readonly` **AGGREGATION_ERROR**: `"AGGREGATION_ERROR"` = `"AGGREGATION_ERROR"`

Aggregation of evaluation results failed

#### codes.REGISTRY_ERROR

> `readonly` **REGISTRY_ERROR**: `"REGISTRY_ERROR"` = `"REGISTRY_ERROR"`

Registry operation failed

#### codes.MAX_RETRIES_EXCEEDED

> `readonly` **MAX_RETRIES_EXCEEDED**: `"MAX_RETRIES_EXCEEDED"` = `"MAX_RETRIES_EXCEEDED"`

Maximum retry attempts exceeded

#### codes.TIMEOUT_ERROR

> `readonly` **TIMEOUT_ERROR**: `"TIMEOUT_ERROR"` = `"TIMEOUT_ERROR"`

Timeout during evaluation

#### codes.RATE_LIMIT_ERROR

> `readonly` **RATE_LIMIT_ERROR**: `"RATE_LIMIT_ERROR"` = `"RATE_LIMIT_ERROR"`

Rate limit hit during evaluation

### create

> **create**: (`code`, `message`, `options?`) => [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

#### Parameters

##### code

`"CONFIGURATION_ERROR"` \| `"PROVIDER_ERROR"` \| `"EVALUATION_FAILED"` \| `"PARSE_ERROR"` \| `"STRATEGY_NOT_FOUND"` \| `"CUSTOM_EVALUATOR_ERROR"` \| `"BATCH_EVALUATION_ERROR"` \| `"AGGREGATION_ERROR"` \| `"REGISTRY_ERROR"` \| `"MAX_RETRIES_EXCEEDED"` \| `"TIMEOUT_ERROR"` \| `"RATE_LIMIT_ERROR"`

##### message

`string`

##### options?

###### retryable?

`boolean`

###### details?

`Record`\<`string`, `unknown`\>

###### cause?

`Error`

#### Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)
