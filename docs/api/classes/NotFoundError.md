[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NotFoundError

# Class: NotFoundError

Defined in: [client/errors.ts:283](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L283)

Error for not found (404)

## Extends

- [`NeuroLinkApiError`](NeuroLinkApiError.md)

## Constructors

### Constructor

> **new NotFoundError**(`message?`, `options?`): `NotFoundError`

Defined in: [client/errors.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L289)

#### Parameters

##### message?

`string` = `"Resource not found"`

##### options?

###### resourceType?

`string`

###### resourceId?

`string`

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### requestId?

`string`

#### Returns

`NotFoundError`

#### Overrides

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`constructor`](NeuroLinkApiError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

Defined in: [client/errors.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L76)

Error code for programmatic handling

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`code`](NeuroLinkApiError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

Defined in: [client/errors.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L78)

HTTP status code (if applicable)

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`status`](NeuroLinkApiError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Defined in: [client/errors.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L80)

Additional error details

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`details`](NeuroLinkApiError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [client/errors.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L82)

Whether the error is retryable

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`retryable`](NeuroLinkApiError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Defined in: [client/errors.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L84)

Request ID for error tracking

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`requestId`](NeuroLinkApiError.md#requestid)

---

### headers?

> `readonly` `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [client/errors.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L146)

HTTP response headers

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`headers`](NeuroLinkApiError.md#headers)

---

### body?

> `readonly` `optional` **body?**: `unknown`

Defined in: [client/errors.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L148)

HTTP response body

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`body`](NeuroLinkApiError.md#body)

---

### resourceType?

> `readonly` `optional` **resourceType?**: `string`

Defined in: [client/errors.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L285)

Resource type that was not found

---

### resourceId?

> `readonly` `optional` **resourceId?**: `string`

Defined in: [client/errors.ts:287](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L287)

Resource ID that was not found

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Defined in: [client/errors.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L109)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`toApiError`](NeuroLinkApiError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [client/errors.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L123)

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`toJSON`](NeuroLinkApiError.md#tojson)
