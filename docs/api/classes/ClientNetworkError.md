[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientNetworkError

# Class: ClientNetworkError

Defined in: [client/errors.ts:321](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L321)

Error for network-related failures

## Extends

- [`ClientNeuroLinkError`](ClientNeuroLinkError.md)

## Extended by

- [`ClientTimeoutError`](ClientTimeoutError.md)
- [`ClientConnectionError`](ClientConnectionError.md)

## Constructors

### Constructor

> **new ClientNetworkError**(`message?`, `options?`): `ClientNetworkError`

Defined in: [client/errors.ts:322](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L322)

#### Parameters

##### message?

`string` = `"Network error occurred"`

##### options?

###### code?

[`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### cause?

`Error`

###### requestId?

`string`

#### Returns

`ClientNetworkError`

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
