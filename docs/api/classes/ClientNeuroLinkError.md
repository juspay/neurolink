[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientNeuroLinkError

# Class: ClientNeuroLinkError

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

Error code for programmatic handling

---

### status?

> `readonly` `optional` **status?**: `number`

HTTP status code (if applicable)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Additional error details

---

### retryable

> `readonly` **retryable**: `boolean`

Whether the error is retryable

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Request ID for error tracking

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>
