[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerBuilder

# Class: ScorerBuilder

Defined in: [evaluation/scorers/scorerBuilder.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L20)

Fluent builder for creating custom scorers

## Constructors

### Constructor

> **new ScorerBuilder**(`id`, `name`): `ScorerBuilder`

Defined in: [evaluation/scorers/scorerBuilder.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L43)

#### Parameters

##### id

`string`

##### name

`string`

#### Returns

`ScorerBuilder`

## Methods

### create()

> `static` **create**(`id`, `name`): `ScorerBuilder`

Defined in: [evaluation/scorers/scorerBuilder.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L51)

Create a new scorer builder

#### Parameters

##### id

`string`

##### name

`string`

#### Returns

`ScorerBuilder`

---

### description()

> **description**(`desc`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L58)

Set scorer description

#### Parameters

##### desc

`string`

#### Returns

`this`

---

### type()

> **type**(`type`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L66)

Set scorer type

#### Parameters

##### type

[`ScorerType`](../type-aliases/ScorerType.md)

#### Returns

`this`

---

### category()

> **category**(`category`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L74)

Set scorer category

#### Parameters

##### category

[`ScorerCategory`](../type-aliases/ScorerCategory.md)

#### Returns

`this`

---

### version()

> **version**(`version`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L82)

Set scorer version

#### Parameters

##### version

`string`

#### Returns

`this`

---

### requireInputs()

> **requireInputs**(...`inputs`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L90)

Set required inputs

#### Parameters

##### inputs

...keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### Returns

`this`

---

### optionalInputs()

> **optionalInputs**(...`inputs`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L98)

Set optional inputs

#### Parameters

##### inputs

...keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### Returns

`this`

---

### threshold()

> **threshold**(`threshold`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L106)

Set pass/fail threshold

#### Parameters

##### threshold

`number`

#### Returns

`this`

---

### weight()

> **weight**(`weight`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L114)

Set weight for aggregation

#### Parameters

##### weight

`number`

#### Returns

`this`

---

### timeout()

> **timeout**(`ms`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L122)

Set execution timeout

#### Parameters

##### ms

`number`

#### Returns

`this`

---

### retries()

> **retries**(`count`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L130)

Set retry count

#### Parameters

##### count

`number`

#### Returns

`this`

---

### scoringFunction()

> **scoringFunction**(`fn`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L138)

Set the scoring function

#### Parameters

##### fn

[`ScorerFunction`](../type-aliases/ScorerFunction.md)

#### Returns

`this`

---

### addScorer()

> **addScorer**(`scorer`, `weight?`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L146)

Add a sub-scorer for composition

#### Parameters

##### scorer

[`BaseScorer`](BaseScorer.md)

##### weight?

`number`

#### Returns

`this`

---

### aggregateWith()

> **aggregateWith**(`method`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L155)

Set aggregation method for composed scorers

#### Parameters

##### method

`"max"` \| `"weighted"` \| `"average"` \| `"min"`

#### Returns

`this`

---

### matchesPattern()

> **matchesPattern**(`pattern`, `options?`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L163)

Add a regex check rule

#### Parameters

##### pattern

`string` \| `RegExp`

##### options?

###### id?

`string`

###### weight?

`number`

#### Returns

`this`

---

### containsKeyword()

> **containsKeyword**(`keyword`, `options?`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L205)

Add a keyword check rule

#### Parameters

##### keyword

`string`

##### options?

###### id?

`string`

###### weight?

`number`

#### Returns

`this`

---

### hasLength()

> **hasLength**(`options`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L225)

Add a length check rule

#### Parameters

##### options

###### minWords?

`number`

###### maxWords?

`number`

###### minChars?

`number`

###### maxChars?

`number`

###### id?

`string`

###### weight?

`number`

#### Returns

`this`

---

### customRule()

> **customRule**(`rule`): `this`

Defined in: [evaluation/scorers/scorerBuilder.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L251)

Add a custom rule

#### Parameters

##### rule

[`ScorerRule`](../type-aliases/ScorerRule.md)

#### Returns

`this`

---

### build()

> **build**(): [`BaseScorer`](BaseScorer.md)

Defined in: [evaluation/scorers/scorerBuilder.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerBuilder.ts#L259)

Build the scorer

#### Returns

[`BaseScorer`](BaseScorer.md)
