[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamError

# Class: StreamError

Defined in: [client/errors.ts:460](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L460)

Error for stream processing failures

## Extends

- [`ClientNeuroLinkError`](ClientNeuroLinkError.md)

## Constructors

### Constructor

> **new StreamError**(`message?`, `options?`): `StreamError`

Defined in: [client/errors.ts:461](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L461)

#### Parameters

##### message?

`string` = `"Stream processing failed"`

##### options?

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### cause?

`Error`

###### requestId?

`string`

#### Returns

`StreamError`

#### Overrides

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`constructor`](ClientNeuroLinkError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

Defined in: [client/errors.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L76)

Error code for programmatic handling

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`code`](ClientNeuroLinkError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

Defined in: [client/errors.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L78)

HTTP status code (if applicable)

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`status`](ClientNeuroLinkError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Defined in: [client/errors.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L80)

Additional error details

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`details`](ClientNeuroLinkError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [client/errors.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L82)

Whether the error is retryable

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`retryable`](ClientNeuroLinkError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Defined in: [client/errors.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L84)

Request ID for error tracking

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`requestId`](ClientNeuroLinkError.md#requestid)

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Defined in: [client/errors.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L109)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`toApiError`](ClientNeuroLinkError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [client/errors.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L123)

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`toJSON`](ClientNeuroLinkError.md#tojson)
