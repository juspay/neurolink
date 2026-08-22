[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / streamBatchEvaluation

# Function: streamBatchEvaluation()

> **streamBatchEvaluation**(`pipeline`, `inputs`, `config?`): `AsyncGenerator`\<[`BatchItemResult`](../type-aliases/BatchItemResult.md), \{ `total`: `number`; `succeeded`: `number`; `failed`: `number`; `averageScore`: `number`; `averageDuration`: `number`; `totalDuration`: `number`; `passingRate`: `number`; \}, `void`\>

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:240](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L240)

Stream batch evaluation results

## Parameters

### pipeline

[`EvaluationPipeline`](../classes/EvaluationPipeline.md)

### inputs

[`ScorerInput`](../type-aliases/ScorerInput.md)[]

### config?

`Omit`\<[`BatchEvaluationConfig`](../type-aliases/BatchEvaluationConfig.md), `"onProgress"` \| `"onResult"`\>

## Returns

`AsyncGenerator`\<[`BatchItemResult`](../type-aliases/BatchItemResult.md), \{ `total`: `number`; `succeeded`: `number`; `failed`: `number`; `averageScore`: `number`; `averageDuration`: `number`; `totalDuration`: `number`; `passingRate`: `number`; \}, `void`\>
