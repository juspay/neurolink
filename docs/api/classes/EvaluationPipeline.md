[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluationPipeline

# Class: EvaluationPipeline

Defined in: [evaluation/pipeline/evaluationPipeline.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L22)

Evaluation Pipeline for running multiple scorers

## Constructors

### Constructor

> **new EvaluationPipeline**(`config`): `EvaluationPipeline`

Defined in: [evaluation/pipeline/evaluationPipeline.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L27)

#### Parameters

##### config

[`PipelineConfig`](../type-aliases/PipelineConfig.md)

#### Returns

`EvaluationPipeline`

## Accessors

### config

#### Get Signature

> **get** **config**(): [`PipelineConfig`](../type-aliases/PipelineConfig.md)

Defined in: [evaluation/pipeline/evaluationPipeline.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L39)

Get pipeline configuration

##### Returns

[`PipelineConfig`](../type-aliases/PipelineConfig.md)

---

### initialized

#### Get Signature

> **get** **initialized**(): `boolean`

Defined in: [evaluation/pipeline/evaluationPipeline.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L46)

Check if pipeline is initialized

##### Returns

`boolean`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [evaluation/pipeline/evaluationPipeline.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L53)

Initialize the pipeline by loading all scorers

#### Returns

`Promise`\<`void`\>

---

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`PipelineResult`](../type-aliases/PipelineResult.md)\>

Defined in: [evaluation/pipeline/evaluationPipeline.ts:120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L120)

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

Defined in: [evaluation/pipeline/evaluationPipeline.ts:419](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L419)

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

Defined in: [evaluation/pipeline/evaluationPipeline.ts:431](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L431)

Remove a scorer from the pipeline

#### Parameters

##### id

`string`

#### Returns

`boolean`

---

### getScorer()

> **getScorer**(`id`): [`Scorer`](../type-aliases/Scorer.md) \| `undefined`

Defined in: [evaluation/pipeline/evaluationPipeline.ts:447](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L447)

Get a scorer by ID

#### Parameters

##### id

`string`

#### Returns

[`Scorer`](../type-aliases/Scorer.md) \| `undefined`

---

### getScorerIds()

> **getScorerIds**(): `string`[]

Defined in: [evaluation/pipeline/evaluationPipeline.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L454)

Get all scorer IDs

#### Returns

`string`[]

---

### configure()

> **configure**(`config`): `void`

Defined in: [evaluation/pipeline/evaluationPipeline.ts:461](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L461)

Update pipeline configuration

#### Parameters

##### config

`Partial`\<[`PipelineConfig`](../type-aliases/PipelineConfig.md)\>

#### Returns

`void`

---

### clone()

> **clone**(): `EvaluationPipeline`

Defined in: [evaluation/pipeline/evaluationPipeline.ts:468](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/evaluationPipeline.ts#L468)

Create a clone of this pipeline

#### Returns

`EvaluationPipeline`
