[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientNeuroLinkError

# Class: ClientNeuroLinkError

Defined in: [client/errors.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L74)

Base error class for all NeuroLink client errors

Provides consistent error structure with error codes, status codes,
and additional metadata.

## Extends

- `Error`

## Extended by

- [`NeuroLinkApiError`](NeuroLinkApiError.md)
- [`ClientNetworkError`](ClientNetworkError.md)
- [`AbortError`](AbortError.md)
- [`ClientConfigurationError`](ClientConfigurationError.md)
- [`StreamError`](StreamError.md)
- [`ClientProviderError`](ClientProviderError.md)

## Constructors

### Constructor

> **new ClientNeuroLinkError**(`message`, `code?`, `options?`): `NeuroLinkError`

Defined in: [client/errors.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L86)

#### Parameters

##### message

`string`

##### code?

[`ErrorCodeType`](../type-aliases/ErrorCodeType.md) = `ErrorCode.UNKNOWN`

##### options?

###### status?

`number`

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### retryable?

`boolean`

###### requestId?

`string`

###### cause?

`Error`

#### Returns

`NeuroLinkError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: [`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

Defined in: [client/errors.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L76)

Error code for programmatic handling

---

### status?

> `readonly` `optional` **status?**: `number`

Defined in: [client/errors.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L78)

HTTP status code (if applicable)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Defined in: [client/errors.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L80)

Additional error details

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [client/errors.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L82)

Whether the error is retryable

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Defined in: [client/errors.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L84)

Request ID for error tracking

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Defined in: [client/errors.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L109)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [client/errors.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L123)

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>
