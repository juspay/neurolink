[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerRegistry

# Class: ScorerRegistry

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

Get the number of registered scorers (excluding aliases)

##### Returns

`number`

## Methods

### register()

> `static` **register**(`entry`): `void`

Register a scorer with the registry

#### Parameters

##### entry

[`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)

#### Returns

`void`

---

### registerScorer()

> `static` **registerScorer**(`metadata`, `factory`, `aliases?`): `void`

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

Register built-in scorers using dynamic imports

#### Returns

`Promise`\<`void`\>

---

### getScorer()

> `static` **getScorer**(`scorerId`, `config?`): `Promise`\<[`Scorer`](../type-aliases/Scorer.md) \| `undefined`\>

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

Get scorers by category

#### Parameters

##### category

[`ScorerCategory`](../type-aliases/ScorerCategory.md)

#### Returns

[`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)[]

---

### getScorersByType()

> `static` **getScorersByType**(`type`): [`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)[]

Get scorers by type

#### Parameters

##### type

[`ScorerType`](../type-aliases/ScorerType.md)

#### Returns

[`ScorerRegistryEntry`](../type-aliases/ScorerRegistryEntry.md)[]

---

### list()

> `static` **list**(): [`ScorerMetadata`](../type-aliases/ScorerMetadata.md)[]

List all registered scorer metadata

#### Returns

[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)[]

---

### has()

> `static` **has**(`scorerId`): `boolean`

Check if a scorer is registered

#### Parameters

##### scorerId

`string`

#### Returns

`boolean`

---

### unregister()

> `static` **unregister**(`scorerId`): `boolean`

Unregister a scorer

#### Parameters

##### scorerId

`string`

#### Returns

`boolean`

---

### clear()

> `static` **clear**(): `void`

Clear all registered scorers

#### Returns

`void`
