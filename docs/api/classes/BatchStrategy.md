[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchStrategy

# Class: BatchStrategy

Batch evaluation strategy

## Constructors

### Constructor

> **new BatchStrategy**(`pipeline`, `config?`): `BatchStrategy`

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

Update configuration

#### Parameters

##### config

`Partial`\<[`BatchEvaluationConfig`](../type-aliases/BatchEvaluationConfig.md)\>

#### Returns

`void`
