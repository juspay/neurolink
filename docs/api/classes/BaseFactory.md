[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseFactory

# Abstract Class: BaseFactory\<TInstance, TConfig\>

Defined in: [core/infrastructure/baseFactory.ts:7](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L7)

## Extended by

- [`EvaluatorFactory`](EvaluatorFactory.md)

## Type Parameters

### TInstance

`TInstance`

### TConfig

`TConfig` = `unknown`

## Constructors

### Constructor

> **new BaseFactory**\<`TInstance`, `TConfig`\>(): `BaseFactory`\<`TInstance`, `TConfig`\>

#### Returns

`BaseFactory`\<`TInstance`, `TConfig`\>

## Properties

### items

> `protected` **items**: `Map`\<`string`, [`FactoryRegistration`](../type-aliases/FactoryRegistration.md)\<`TInstance`, `TConfig`\>\>

Defined in: [core/infrastructure/baseFactory.ts:8](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L8)

---

### aliasMap

> `protected` **aliasMap**: `Map`\<`string`, `string`\>

Defined in: [core/infrastructure/baseFactory.ts:9](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L9)

---

### initialized

> `protected` **initialized**: `boolean` = `false`

Defined in: [core/infrastructure/baseFactory.ts:10](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L10)

---

### initPromise

> `protected` **initPromise**: `Promise`\<`void`\> \| `null` = `null`

Defined in: [core/infrastructure/baseFactory.ts:11](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L11)

## Methods

### registerAll()

> `abstract` `protected` **registerAll**(): `Promise`\<`void`\>

Defined in: [core/infrastructure/baseFactory.ts:13](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L13)

#### Returns

`Promise`\<`void`\>

---

### ensureInitialized()

> **ensureInitialized**(): `Promise`\<`void`\>

Defined in: [core/infrastructure/baseFactory.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L15)

#### Returns

`Promise`\<`void`\>

---

### register()

> **register**(`name`, `factory`, `aliases?`, `metadata?`): `void`

Defined in: [core/infrastructure/baseFactory.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L27)

#### Parameters

##### name

`string`

##### factory

[`FactoryFunction`](../type-aliases/FactoryFunction.md)\<`TInstance`, `TConfig`\>

##### aliases?

`string`[] = `[]`

##### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

---

### create()

> **create**(`nameOrAlias`, `config?`): `Promise`\<`TInstance`\>

Defined in: [core/infrastructure/baseFactory.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L40)

#### Parameters

##### nameOrAlias

`string`

##### config?

`TConfig`

#### Returns

`Promise`\<`TInstance`\>

---

### resolveName()

> **resolveName**(`nameOrAlias`): `string`

Defined in: [core/infrastructure/baseFactory.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L50)

#### Parameters

##### nameOrAlias

`string`

#### Returns

`string`

---

### has()

> **has**(`nameOrAlias`): `boolean`

Defined in: [core/infrastructure/baseFactory.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L55)

#### Parameters

##### nameOrAlias

`string`

#### Returns

`boolean`

---

### getAvailable()

> **getAvailable**(): `string`[]

Defined in: [core/infrastructure/baseFactory.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L60)

#### Returns

`string`[]

---

### getAliases()

> **getAliases**(): `Map`\<`string`, `string`\>

Defined in: [core/infrastructure/baseFactory.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L64)

#### Returns

`Map`\<`string`, `string`\>

---

### clear()

> **clear**(): `void`

Defined in: [core/infrastructure/baseFactory.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L68)

#### Returns

`void`
