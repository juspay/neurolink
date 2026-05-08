[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationConfig

# Type Alias: BatchEvaluationConfig

> **BatchEvaluationConfig** = [`EvaluationConfig`](EvaluationConfig.md) & `object`

Defined in: [types/evaluation.ts:439](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L439)

Superset batch evaluation config. Union of pre-consolidation types
(BatchEvaluationConfig in BatchEvaluator, BatchConfig in batchStrategy).

## Type Declaration

### concurrency?

> `optional` **concurrency?**: `number`

### continueOnError?

> `optional` **continueOnError?**: `boolean`

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

#### Parameters

##### progress

[`BatchProgress`](BatchProgress.md)

#### Returns

`void`

### maxRetries?

> `optional` **maxRetries?**: `number`

### retryDelay?

> `optional` **retryDelay?**: `number`

### onItemComplete?

> `optional` **onItemComplete?**: (`result`) => `void`

#### Parameters

##### result

[`BatchEvaluationItemResult`](BatchEvaluationItemResult.md)

#### Returns

`void`

### batchDelay?

> `optional` **batchDelay?**: `number`

### onResult?

> `optional` **onResult?**: (`result`) => `void`

#### Parameters

##### result

[`BatchItemResult`](BatchItemResult.md)

#### Returns

`void`
