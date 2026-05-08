[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestContext

# Class: RequestContext\<T\>

Defined in: [auth/RequestContext.ts:13](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L13)

## Type Parameters

### T

`T` _extends_ `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

## Constructors

### Constructor

> **new RequestContext**\<`T`\>(`initial?`): `RequestContext`\<`T`\>

Defined in: [auth/RequestContext.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L18)

#### Parameters

##### initial?

`Partial`\<`T`\> \| \[`string`, `unknown`\][]

#### Returns

`RequestContext`\<`T`\>

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [auth/RequestContext.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L46)

##### Returns

`number`

## Methods

### set()

> **set**\<`K`\>(`key`, `value`): `void`

Defined in: [auth/RequestContext.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L30)

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

Defined in: [auth/RequestContext.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L34)

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

Defined in: [auth/RequestContext.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L38)

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### delete()

> **delete**(`key`): `boolean`

Defined in: [auth/RequestContext.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L42)

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### mergeClientContext()

> **mergeClientContext**(`clientContext`): `void`

Defined in: [auth/RequestContext.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L54)

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

Defined in: [auth/RequestContext.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/RequestContext.ts#L65)

#### Returns

`Record`\<`string`, `unknown`\>
