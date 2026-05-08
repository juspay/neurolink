[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchStrategy

# Class: BatchStrategy

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L41)

Batch evaluation strategy

## Constructors

### Constructor

> **new BatchStrategy**(`pipeline`, `config?`): `BatchStrategy`

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L54)

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

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L62)

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

Defined in: [evaluation/pipeline/strategies/batchStrategy.ts:210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/batchStrategy.ts#L210)

Update configuration

#### Parameters

##### config

`Partial`\<[`BatchEvaluationConfig`](../type-aliases/BatchEvaluationConfig.md)\>

#### Returns

`void`
