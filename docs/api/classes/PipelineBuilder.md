[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineBuilder

# Class: PipelineBuilder

Defined in: [evaluation/pipeline/pipelineBuilder.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L18)

Fluent builder for creating evaluation pipelines

## Constructors

### Constructor

> **new PipelineBuilder**(`name?`): `PipelineBuilder`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L29)

#### Parameters

##### name?

`string`

#### Returns

`PipelineBuilder`

## Methods

### create()

> `static` **create**(`name?`): `PipelineBuilder`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L36)

Create a new pipeline builder

#### Parameters

##### name?

`string`

#### Returns

`PipelineBuilder`

---

### name()

> **name**(`name`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L43)

Set pipeline name

#### Parameters

##### name

`string`

#### Returns

`this`

---

### description()

> **description**(`desc`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L51)

Set pipeline description

#### Parameters

##### desc

`string`

#### Returns

`this`

---

### addScorer()

> **addScorer**(`id`, `config?`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L59)

Add a scorer by ID

#### Parameters

##### id

`string`

##### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Returns

`this`

---

### addScorers()

> **addScorers**(...`ids`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L67)

Add multiple scorers

#### Parameters

##### ids

...`string`[]

#### Returns

`this`

---

### requireScorer()

> **requireScorer**(`id`, `config?`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L77)

Add a scorer and mark it as required

#### Parameters

##### id

`string`

##### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Returns

`this`

---

### aggregateWith()

> **aggregateWith**(`method`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:97](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L97)

Set aggregation method

#### Parameters

##### method

[`AggregationMethod`](../type-aliases/AggregationMethod.md)

#### Returns

`this`

---

### withWeights()

> **withWeights**(`weights`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L105)

Set weights for weighted aggregation

#### Parameters

##### weights

`Record`\<`string`, `number`\>

#### Returns

`this`

---

### customAggregation()

> **customAggregation**(`fn`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L114)

Set custom aggregation function

#### Parameters

##### fn

(`scores`) => `number`

#### Returns

`this`

---

### passThreshold()

> **passThreshold**(`threshold`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L123)

Set pass/fail threshold

#### Parameters

##### threshold

`number`

#### Returns

`this`

---

### parallel()

> **parallel**(): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L131)

Run scorers in parallel (default)

#### Returns

`this`

---

### sequential()

> **sequential**(): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L139)

Run scorers sequentially

#### Returns

`this`

---

### stopOnFailure()

> **stopOnFailure**(): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L147)

Stop pipeline on first failure

#### Returns

`this`

---

### continueOnFailure()

> **continueOnFailure**(): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L155)

Continue pipeline on failures (default)

#### Returns

`this`

---

### timeout()

> **timeout**(`ms`): `this`

Defined in: [evaluation/pipeline/pipelineBuilder.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L163)

Set pipeline timeout

#### Parameters

##### ms

`number`

#### Returns

`this`

---

### buildConfig()

> **buildConfig**(): [`PipelineConfig`](../type-aliases/PipelineConfig.md)

Defined in: [evaluation/pipeline/pipelineBuilder.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L171)

Build the pipeline configuration

#### Returns

[`PipelineConfig`](../type-aliases/PipelineConfig.md)

---

### build()

> **build**(): [`EvaluationPipeline`](EvaluationPipeline.md)

Defined in: [evaluation/pipeline/pipelineBuilder.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L199)

Build the pipeline (not initialized)

#### Returns

[`EvaluationPipeline`](EvaluationPipeline.md)

---

### buildAndInitialize()

> **buildAndInitialize**(): `Promise`\<[`EvaluationPipeline`](EvaluationPipeline.md)\>

Defined in: [evaluation/pipeline/pipelineBuilder.ts:206](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/pipelineBuilder.ts#L206)

Build and initialize the pipeline

#### Returns

`Promise`\<[`EvaluationPipeline`](EvaluationPipeline.md)\>
