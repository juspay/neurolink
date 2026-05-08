[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / streamBatchEvaluation

# Function: streamBatchEvaluation()

> **streamBatchEvaluation**(`pipeline`, `inputs`, `config?`): `AsyncGenerator`\<[`BatchItemResult`](../type-aliases/BatchItemResult.md), \{ `total`: `number`; `succeeded`: `number`; `failed`: `number`; `averageScore`: `number`; `averageDuration`: `number`; `totalDuration`: `number`; `passingRate`: `number`; \}, `void`\>

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L240)

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
