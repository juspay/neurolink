[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkApiError

# Class: NeuroLinkApiError

Error for HTTP-related failures

## Extends

- [`ClientNeuroLinkError`](ClientNeuroLinkError.md)

## Extended by

- [`ClientRateLimitError`](ClientRateLimitError.md)
- [`ClientValidationError`](ClientValidationError.md)
- [`ClientAuthenticationError`](ClientAuthenticationError.md)
- [`ClientAuthorizationError`](ClientAuthorizationError.md)
- [`NotFoundError`](NotFoundError.md)

## Constructors

### Constructor

> **new NeuroLinkApiError**(`message`, `status`, `options?`): `HttpError`

#### Parameters

##### message

`string`

##### status

`number`

##### options?

###### code?

[`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### headers?

`Record`\<`string`, `string`\>

###### body?

`unknown`

###### requestId?

`string`

#### Returns

`HttpError`

#### Overrides

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`constructor`](ClientNeuroLinkError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

Error code for programmatic handling

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`code`](ClientNeuroLinkError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

HTTP status code (if applicable)

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`status`](ClientNeuroLinkError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Additional error details

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`details`](ClientNeuroLinkError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Whether the error is retryable

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`retryable`](ClientNeuroLinkError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Request ID for error tracking

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`requestId`](ClientNeuroLinkError.md#requestid)

---

### headers?

> `readonly` `optional` **headers?**: `Record`\<`string`, `string`\>

HTTP response headers

---

### body?

> `readonly` `optional` **body?**: `unknown`

HTTP response body

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`toApiError`](ClientNeuroLinkError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ClientNeuroLinkError`](ClientNeuroLinkError.md).[`toJSON`](ClientNeuroLinkError.md#tojson)
