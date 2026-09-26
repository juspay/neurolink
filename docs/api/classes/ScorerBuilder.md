[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerBuilder

# Class: ScorerBuilder

Fluent builder for creating custom scorers

## Constructors

### Constructor

> **new ScorerBuilder**(`id`, `name`): `ScorerBuilder`

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

Set scorer description

#### Parameters

##### desc

`string`

#### Returns

`this`

---

### type()

> **type**(`type`): `this`

Set scorer type

#### Parameters

##### type

[`ScorerType`](../type-aliases/ScorerType.md)

#### Returns

`this`

---

### category()

> **category**(`category`): `this`

Set scorer category

#### Parameters

##### category

[`ScorerCategory`](../type-aliases/ScorerCategory.md)

#### Returns

`this`

---

### version()

> **version**(`version`): `this`

Set scorer version

#### Parameters

##### version

`string`

#### Returns

`this`

---

### requireInputs()

> **requireInputs**(...`inputs`): `this`

Set required inputs

#### Parameters

##### inputs

...keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### Returns

`this`

---

### optionalInputs()

> **optionalInputs**(...`inputs`): `this`

Set optional inputs

#### Parameters

##### inputs

...keyof [`ScorerInput`](../type-aliases/ScorerInput.md)[]

#### Returns

`this`

---

### threshold()

> **threshold**(`threshold`): `this`

Set pass/fail threshold

#### Parameters

##### threshold

`number`

#### Returns

`this`

---

### weight()

> **weight**(`weight`): `this`

Set weight for aggregation

#### Parameters

##### weight

`number`

#### Returns

`this`

---

### timeout()

> **timeout**(`ms`): `this`

Set execution timeout

#### Parameters

##### ms

`number`

#### Returns

`this`

---

### retries()

> **retries**(`count`): `this`

Set retry count

#### Parameters

##### count

`number`

#### Returns

`this`

---

### scoringFunction()

> **scoringFunction**(`fn`): `this`

Set the scoring function

#### Parameters

##### fn

[`ScorerFunction`](../type-aliases/ScorerFunction.md)

#### Returns

`this`

---

### addScorer()

> **addScorer**(`scorer`, `weight?`): `this`

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

Set aggregation method for composed scorers

#### Parameters

##### method

`"max"` \| `"weighted"` \| `"average"` \| `"min"`

#### Returns

`this`

---

### matchesPattern()

> **matchesPattern**(`pattern`, `options?`): `this`

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

Add a custom rule

#### Parameters

##### rule

[`ScorerRule`](../type-aliases/ScorerRule.md)

#### Returns

`this`

---

### build()

> **build**(): [`BaseScorer`](BaseScorer.md)

Build the scorer

#### Returns

[`BaseScorer`](BaseScorer.md)
