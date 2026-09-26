[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamAbortedError

# Class: StreamAbortedError

Stream aborted error

## Extends

- [`ServerAdapterError`](ServerAdapterError.md)

## Constructors

### Constructor

> **new StreamAbortedError**(`reason?`, `requestId?`): `StreamAbortedError`

#### Parameters

##### reason?

`string`

##### requestId?

`string`

#### Returns

`StreamAbortedError`

#### Overrides

[`ServerAdapterError`](ServerAdapterError.md).[`constructor`](ServerAdapterError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ServerAdapterErrorCodeType`](../type-aliases/ServerAdapterErrorCodeType.md)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`code`](ServerAdapterError.md#code)

---

### category

> `readonly` **category**: [`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`category`](ServerAdapterError.md#category)

---

### severity

> `readonly` **severity**: [`ErrorSeverityType`](../type-aliases/ErrorSeverityType.md)

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`severity`](ServerAdapterError.md#severity)

---

### retryable

> `readonly` **retryable**: `boolean`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`retryable`](ServerAdapterError.md#retryable)

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`retryAfterMs`](ServerAdapterError.md#retryafterms)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`requestId`](ServerAdapterError.md#requestid)

---

### path?

> `readonly` `optional` **path?**: `string`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`path`](ServerAdapterError.md#path)

---

### method?

> `readonly` `optional` **method?**: `string`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`method`](ServerAdapterError.md#method)

---

### details?

> `readonly` `optional` **details?**: `Record`\<`string`, `unknown`\>

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`details`](ServerAdapterError.md#details)

---

### cause?

> `readonly` `optional` **cause?**: `Error`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`cause`](ServerAdapterError.md#cause)

## Methods

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Convert to JSON for API responses

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`toJSON`](ServerAdapterError.md#tojson)

---

### getHttpStatus()

> **getHttpStatus**(): `number`

Get HTTP status code for this error

#### Returns

`number`

#### Inherited from

[`ServerAdapterError`](ServerAdapterError.md).[`getHttpStatus`](ServerAdapterError.md#gethttpstatus)
