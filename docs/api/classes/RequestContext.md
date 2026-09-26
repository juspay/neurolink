[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestContext

# Class: RequestContext\<T\>

## Type Parameters

### T

`T` _extends_ `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

## Constructors

### Constructor

> **new RequestContext**\<`T`\>(`initial?`): `RequestContext`\<`T`\>

#### Parameters

##### initial?

`Partial`\<`T`\> \| \[`string`, `unknown`\][]

#### Returns

`RequestContext`\<`T`\>

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

##### Returns

`number`

## Methods

### set()

> **set**\<`K`\>(`key`, `value`): `void`

#### Type Parameters

##### K

`K` _extends_ `string`

#### Parameters

##### key

`K`

##### value

`unknown`

#### Returns

`void`

---

### get()

> **get**\<`K`\>(`key`): `unknown`

#### Type Parameters

##### K

`K` _extends_ `string`

#### Parameters

##### key

`K`

#### Returns

`unknown`

---

### has()

> **has**(`key`): `boolean`

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### delete()

> **delete**(`key`): `boolean`

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### mergeClientContext()

> **mergeClientContext**(`clientContext`): `void`

Merge client-provided values, but SKIP reserved keys that are already set.
This prevents clients from overriding auth middleware values.

#### Parameters

##### clientContext

`Record`\<`string`, `unknown`\>

#### Returns

`void`

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

#### Returns

`Record`\<`string`, `unknown`\>
