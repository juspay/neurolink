[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseFactory

# Abstract Class: BaseFactory\<TInstance, TConfig\>

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

---

### aliasMap

> `protected` **aliasMap**: `Map`\<`string`, `string`\>

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

> **register**(`name`, `factory`, `aliases?`, `metadata?`): `void`

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

#### Parameters

##### nameOrAlias

`string`

#### Returns

`string`

---

### has()

> **has**(`nameOrAlias`): `boolean`

#### Parameters

##### nameOrAlias

`string`

#### Returns

`boolean`

---

### getAvailable()

> **getAvailable**(): `string`[]

#### Returns

`string`[]

---

### getAliases()

> **getAliases**(): `Map`\<`string`, `string`\>

#### Returns

`Map`\<`string`, `string`\>

---

### clear()

> **clear**(): `void`

#### Returns

`void`
