[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationPipeline

# Class: EvaluationPipeline

Evaluation Pipeline for running multiple scorers

## Constructors

### Constructor

> **new EvaluationPipeline**(`config`): `EvaluationPipeline`

#### Parameters

##### config

[`PipelineConfig`](../type-aliases/PipelineConfig.md)

#### Returns

`EvaluationPipeline`

## Accessors

### config

#### Get Signature

> **get** **config**(): [`PipelineConfig`](../type-aliases/PipelineConfig.md)

Get pipeline configuration

##### Returns

[`PipelineConfig`](../type-aliases/PipelineConfig.md)

---

### initialized

#### Get Signature

> **get** **initialized**(): `boolean`

Check if pipeline is initialized

##### Returns

`boolean`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Initialize the pipeline by loading all scorers

#### Returns

`Promise`\<`void`\>

---

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`PipelineResult`](../type-aliases/PipelineResult.md)\>

Execute the pipeline on input

#### Parameters

##### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

##### options?

[`PipelineExecutionOptions`](../type-aliases/PipelineExecutionOptions.md)

#### Returns

`Promise`\<[`PipelineResult`](../type-aliases/PipelineResult.md)\>

---

### addScorer()

> **addScorer**(`id`, `scorer`): `void`

Add a scorer to the pipeline

#### Parameters

##### id

`string`

##### scorer

[`Scorer`](../type-aliases/Scorer.md)

#### Returns

`void`

---

### removeScorer()

> **removeScorer**(`id`): `boolean`

Remove a scorer from the pipeline

#### Parameters

##### id

`string`

#### Returns

`boolean`

---

### getScorer()

> **getScorer**(`id`): [`Scorer`](../type-aliases/Scorer.md) \| `undefined`

Get a scorer by ID

#### Parameters

##### id

`string`

#### Returns

[`Scorer`](../type-aliases/Scorer.md) \| `undefined`

---

### getScorerIds()

> **getScorerIds**(): `string`[]

Get all scorer IDs

#### Returns

`string`[]

---

### configure()

> **configure**(`config`): `void`

Update pipeline configuration

#### Parameters

##### config

`Partial`\<[`PipelineConfig`](../type-aliases/PipelineConfig.md)\>

#### Returns

`void`

---

### clone()

> **clone**(): `EvaluationPipeline`

Create a clone of this pipeline

#### Returns

`EvaluationPipeline`
