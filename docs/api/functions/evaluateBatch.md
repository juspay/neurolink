[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / evaluateBatch

# Function: evaluateBatch()

> **evaluateBatch**(`pipeline`, `inputs`, `config?`): `Promise`\<[`BatchEvaluationResult`](../type-aliases/BatchEvaluationResult.md)\>

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L228)

Evaluate a batch of inputs using a pipeline

## Parameters

### pipeline

[`EvaluationPipeline`](../classes/EvaluationPipeline.md)

### inputs

[`ScorerInput`](../type-aliases/ScorerInput.md)[]

### config?

[`BatchEvaluationConfig`](../type-aliases/BatchEvaluationConfig.md)

## Returns

`Promise`\<[`BatchEvaluationResult`](../type-aliases/BatchEvaluationResult.md)\>
