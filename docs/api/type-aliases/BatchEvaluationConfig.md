[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchEvaluationConfig

# Type Alias: BatchEvaluationConfig

> **BatchEvaluationConfig** = [`EvaluationConfig`](EvaluationConfig.md) & `object`

Defined in: [types/evaluation.ts:434](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L434)

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
