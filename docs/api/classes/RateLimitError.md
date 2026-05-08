[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitError

# Class: RateLimitError

Defined in: [server/errors.ts:254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L254)

Rate limit error

## Extends

- [`ServerAdapterError`](ServerAdapterError.md)

## Constructors

### Constructor

> **new RateLimitError**(`retryAfterMs`, `message?`, `requestId?`): `RateLimitError`

Defined in: [server/errors.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L255)

#### Parameters

##### retryAfterMs

`number`

##### message?

`string`

##### requestId?

`string`

#### Returns

`RateLimitError`

#### Overrides

[`ServerAdapterError`](ServerAdapterError.md).[`constructor`](ServerAdapterError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ServerAdapterErrorCodeType`](../type-aliases/ServerAdapterErrorCodeType.md)

Defined in: [server/errors.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L21)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`code`](ServerAdapterError.md#code)

---

### category

> `readonly` **category**: [`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md)

Defined in: [server/errors.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L22)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`category`](ServerAdapterError.md#category)

---

### severity

> `readonly` **severity**: [`ErrorSeverityType`](../type-aliases/ErrorSeverityType.md)

Defined in: [server/errors.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L23)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`severity`](ServerAdapterError.md#severity)

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [server/errors.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L24)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`retryable`](ServerAdapterError.md#retryable)

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

Defined in: [server/errors.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L25)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`retryAfterMs`](ServerAdapterError.md#retryafterms)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Defined in: [server/errors.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L26)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`requestId`](ServerAdapterError.md#requestid)

---

### path?

> `readonly` `optional` **path?**: `string`

Defined in: [server/errors.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L27)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`path`](ServerAdapterError.md#path)

---

### method?

> `readonly` `optional` **method?**: `string`

Defined in: [server/errors.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L28)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`method`](ServerAdapterError.md#method)

---

### details?

> `readonly` `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [server/errors.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L29)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`details`](ServerAdapterError.md#details)

---

### cause?

> `readonly` `optional` **cause?**: `Error`

Defined in: [server/errors.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L30)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`cause`](ServerAdapterError.md#cause)

## Methods

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [server/errors.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L59)

Convert to JSON for API responses

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`toJSON`](ServerAdapterError.md#tojson)

---

### getHttpStatus()

> **getHttpStatus**(): `number`

Defined in: [server/errors.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L77)

Get HTTP status code for this error

#### Returns

`number`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`getHttpStatus`](ServerAdapterError.md#gethttpstatus)
