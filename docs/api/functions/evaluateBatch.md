[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / evaluateBatch

# Function: evaluateBatch()

> **evaluateBatch**(`pipeline`, `inputs`, `config?`): `Promise`\<[`BatchEvaluationResult`](../type-aliases/BatchEvaluationResult.md)\>

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:228](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L228)

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
