[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseRegistry

# Abstract Class: BaseRegistry\<TItem, TMetadata\>

## Type Parameters

### TItem

`TItem`

### TMetadata

`TMetadata` = `unknown`

## Constructors

### Constructor

> **new BaseRegistry**\<`TItem`, `TMetadata`\>(): `BaseRegistry`\<`TItem`, `TMetadata`\>

#### Returns

`BaseRegistry`\<`TItem`, `TMetadata`\>

## Properties

### items

> `protected` **items**: `Map`\<`string`, [`InfraRegistryEntry`](../type-aliases/InfraRegistryEntry.md)\<`TItem`, `TMetadata`\>\>

---

### initialized

> `protected` **initialized**: `boolean` = `false`

---

### initPromise

> `protected` **initPromise**: `Promise`\<`void`\> \| `null` = `null`

## Methods

### registerAll()

> `abstract` `protected` **registerAll**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### ensureInitialized()

> **ensureInitialized**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### register()

> **register**(`id`, `factory`, `aliases?`, `options?`): `void`

#### Parameters

##### id

`string`

##### factory

() => `Promise`\<`TItem`\>

##### aliases?

`string`[] = `[]`

##### options?

###### metadata

`TMetadata`

#### Returns

`void`

---

### get()

> **get**(`id`): `Promise`\<`TItem` \| `undefined`\>

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`TItem` \| `undefined`\>

---

### has()

> **has**(`id`): `boolean`

#### Parameters

##### id

`string`

#### Returns

`boolean`

---

### list()

> **list**(): `object`[]

#### Returns

`object`[]

---

### clear()

> **clear**(): `void`

#### Returns

`void`

---

### isInitialized()

> **isInitialized**(): `boolean`

#### Returns

`boolean`
