[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseRegistry

# Abstract Class: BaseRegistry\<TItem, TMetadata\>

Defined in: [core/infrastructure/baseRegistry.ts:4](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L4)

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

Defined in: [core/infrastructure/baseRegistry.ts:5](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L5)

---

### initialized

> `protected` **initialized**: `boolean` = `false`

Defined in: [core/infrastructure/baseRegistry.ts:6](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L6)

---

### initPromise

> `protected` **initPromise**: `Promise`\<`void`\> \| `null` = `null`

Defined in: [core/infrastructure/baseRegistry.ts:7](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L7)

## Methods

### registerAll()

> `abstract` `protected` **registerAll**(): `Promise`\<`void`\>

Defined in: [core/infrastructure/baseRegistry.ts:9](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L9)

#### Returns

`Promise`\<`void`\>

---

### ensureInitialized()

> **ensureInitialized**(): `Promise`\<`void`\>

Defined in: [core/infrastructure/baseRegistry.ts:11](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L11)

#### Returns

`Promise`\<`void`\>

---

### register()

> **register**(`id`, `factory`, `aliases?`, `options?`): `void`

Defined in: [core/infrastructure/baseRegistry.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L23)

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

Defined in: [core/infrastructure/baseRegistry.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L37)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`TItem` \| `undefined`\>

---

### has()

> **has**(`id`): `boolean`

Defined in: [core/infrastructure/baseRegistry.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L49)

#### Parameters

##### id

`string`

#### Returns

`boolean`

---

### list()

> **list**(): `object`[]

Defined in: [core/infrastructure/baseRegistry.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L53)

#### Returns

`object`[]

---

### clear()

> **clear**(): `void`

Defined in: [core/infrastructure/baseRegistry.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L60)

#### Returns

`void`

---

### isInitialized()

> **isInitialized**(): `boolean`

Defined in: [core/infrastructure/baseRegistry.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseRegistry.ts#L66)

#### Returns

`boolean`
