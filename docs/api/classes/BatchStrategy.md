[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchStrategy

# Class: BatchStrategy

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L41)

Batch evaluation strategy

## Constructors

### Constructor

> **new BatchStrategy**(`pipeline`, `config?`): `BatchStrategy`

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:54](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L54)

#### Parameters

##### pipeline

[`EvaluationPipeline`](EvaluationPipeline.md)

##### config?

[`BatchEvaluationConfig`](../type-aliases/BatchEvaluationConfig.md)

#### Returns

`BatchStrategy`

## Methods

### evaluate()

> **evaluate**(`inputs`, `options?`): `Promise`\<[`BatchEvaluationResult`](../type-aliases/BatchEvaluationResult.md)\>

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L62)

Evaluate a batch of inputs

#### Parameters

##### inputs

[`ScorerInput`](../type-aliases/ScorerInput.md)[]

##### options?

[`PipelineExecutionOptions`](../type-aliases/PipelineExecutionOptions.md)

#### Returns

`Promise`\<[`BatchEvaluationResult`](../type-aliases/BatchEvaluationResult.md)\>

---

### configure()

> **configure**(`config`): `void`

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:210](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L210)

Update configuration

#### Parameters

##### config

`Partial`\<[`BatchEvaluationConfig`](../type-aliases/BatchEvaluationConfig.md)\>

#### Returns

`void`
