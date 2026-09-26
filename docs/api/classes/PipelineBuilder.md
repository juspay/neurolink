[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineBuilder

# Class: PipelineBuilder

Fluent builder for creating evaluation pipelines

## Constructors

### Constructor

> **new PipelineBuilder**(`name?`): `PipelineBuilder`

#### Parameters

##### name?

`string`

#### Returns

`PipelineBuilder`

## Methods

### create()

> `static` **create**(`name?`): `PipelineBuilder`

Create a new pipeline builder

#### Parameters

##### name?

`string`

#### Returns

`PipelineBuilder`

---

### name()

> **name**(`name`): `this`

Set pipeline name

#### Parameters

##### name

`string`

#### Returns

`this`

---

### description()

> **description**(`desc`): `this`

Set pipeline description

#### Parameters

##### desc

`string`

#### Returns

`this`

---

### addScorer()

> **addScorer**(`id`, `config?`): `this`

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

Add multiple scorers

#### Parameters

##### ids

...`string`[]

#### Returns

`this`

---

### requireScorer()

> **requireScorer**(`id`, `config?`): `this`

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

Set aggregation method

#### Parameters

##### method

[`AggregationMethod`](../type-aliases/AggregationMethod.md)

#### Returns

`this`

---

### withWeights()

> **withWeights**(`weights`): `this`

Set weights for weighted aggregation

#### Parameters

##### weights

`Record`\<`string`, `number`\>

#### Returns

`this`

---

### customAggregation()

> **customAggregation**(`fn`): `this`

Set custom aggregation function

#### Parameters

##### fn

(`scores`) => `number`

#### Returns

`this`

---

### passThreshold()

> **passThreshold**(`threshold`): `this`

Set pass/fail threshold

#### Parameters

##### threshold

`number`

#### Returns

`this`

---

### parallel()

> **parallel**(): `this`

Run scorers in parallel (default)

#### Returns

`this`

---

### sequential()

> **sequential**(): `this`

Run scorers sequentially

#### Returns

`this`

---

### stopOnFailure()

> **stopOnFailure**(): `this`

Stop pipeline on first failure

#### Returns

`this`

---

### continueOnFailure()

> **continueOnFailure**(): `this`

Continue pipeline on failures (default)

#### Returns

`this`

---

### timeout()

> **timeout**(`ms`): `this`

Set pipeline timeout

#### Parameters

##### ms

`number`

#### Returns

`this`

---

### buildConfig()

> **buildConfig**(): [`PipelineConfig`](../type-aliases/PipelineConfig.md)

Build the pipeline configuration

#### Returns

[`PipelineConfig`](../type-aliases/PipelineConfig.md)

---

### build()

> **build**(): [`EvaluationPipeline`](EvaluationPipeline.md)

Build the pipeline (not initialized)

#### Returns

[`EvaluationPipeline`](EvaluationPipeline.md)

---

### buildAndInitialize()

> **buildAndInitialize**(): `Promise`\<[`EvaluationPipeline`](EvaluationPipeline.md)\>

Build and initialize the pipeline

#### Returns

`Promise`\<[`EvaluationPipeline`](EvaluationPipeline.md)\>
