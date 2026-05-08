[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerRegistry

# Class: ScorerRegistry

Defined in: [evaluation/scorers/scorerRegistry.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L383)

Central registry for all scorers
Manages registration, discovery, and instantiation

## Constructors

### Constructor

> **new ScorerRegistry**(): `ScorerRegistry`

#### Returns

`ScorerRegistry`

## Accessors

### size

#### Get Signature

> **get** `static` **size**(): `number`

Defined in: [evaluation/scorers/scorerRegistry.ts:617](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L617)

Get the number of registered scorers (excluding aliases)

##### Returns

`number`

## Methods

### register()

> `static` **register**(`entry`): `void`

Defined in: [evaluation/scorers/scorerRegistry.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L391)

Register a scorer with the registry

#### Parameters

##### entry

[`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)

#### Returns

`void`

---

### registerScorer()

> `static` **registerScorer**(`metadata`, `factory`, `aliases?`): `void`

Defined in: [evaluation/scorers/scorerRegistry.ts:418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L418)

Register a scorer using a simple configuration

#### Parameters

##### metadata

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)

##### factory

[`ScorerFactory`](../type-aliases/ScorerFactory.md)

##### aliases?

`string`[] = `[]`

#### Returns

`void`

---

### registerBuiltInScorers()

> `static` **registerBuiltInScorers**(): `Promise`\<`void`\>

Defined in: [evaluation/scorers/scorerRegistry.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L454)

Register built-in scorers using dynamic imports

#### Returns

`Promise`\<`void`\>

---

### getScorer()

> `static` **getScorer**(`scorerId`, `config?`): `Promise`\<[`Scorer`](../type-aliases/Scorer.md) \| `undefined`\>

Defined in: [evaluation/scorers/scorerRegistry.ts:483](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L483)

Get a scorer instance by ID

#### Parameters

##### scorerId

`string`

##### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

#### Returns

`Promise`\<[`Scorer`](../type-aliases/Scorer.md) \| `undefined`\>

---

### getScorersByCategory()

> `static` **getScorersByCategory**(`category`): [`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)[]

Defined in: [evaluation/scorers/scorerRegistry.ts:509](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L509)

Get scorers by category

#### Parameters

##### category

[`ScorerCategory`](../type-aliases/ScorerCategory.md)

#### Returns

[`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)[]

---

### getScorersByType()

> `static` **getScorersByType**(`type`): [`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)[]

Defined in: [evaluation/scorers/scorerRegistry.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L529)

Get scorers by type

#### Parameters

##### type

[`ScorerType`](../type-aliases/ScorerType.md)

#### Returns

[`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)[]

---

### list()

> `static` **list**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)[]

Defined in: [evaluation/scorers/scorerRegistry.ts:546](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L546)

List all registered scorer metadata

#### Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)[]

---

### has()

> `static` **has**(`scorerId`): `boolean`

Defined in: [evaluation/scorers/scorerRegistry.ts:563](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L563)

Check if a scorer is registered

#### Parameters

##### scorerId

`string`

#### Returns

`boolean`

---

### unregister()

> `static` **unregister**(`scorerId`): `boolean`

Defined in: [evaluation/scorers/scorerRegistry.ts:570](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L570)

Unregister a scorer

#### Parameters

##### scorerId

`string`

#### Returns

`boolean`

---

### clear()

> `static` **clear**(): `void`

Defined in: [evaluation/scorers/scorerRegistry.ts:595](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/scorers/scorerRegistry.ts#L595)

Clear all registered scorers

#### Returns

`void`
