[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientRateLimitError

# Class: ClientRateLimitError

Error for rate limiting (429)

## Extends

- [`NeuroLinkApiError`](NeuroLinkApiError.md)

## Constructors

### Constructor

> **new ClientRateLimitError**(`message?`, `options?`): `ClientRateLimitError`

#### Parameters

##### message?

`string` = `"Rate limit exceeded"`

##### options?

###### retryAfter?

`number`

###### resetAt?

`Date`

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### requestId?

`string`

#### Returns

`ClientRateLimitError`

#### Overrides

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`constructor`](NeuroLinkApiError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

Error code for programmatic handling

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`code`](NeuroLinkApiError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

HTTP status code (if applicable)

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`status`](NeuroLinkApiError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Additional error details

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`details`](NeuroLinkApiError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Whether the error is retryable

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`retryable`](NeuroLinkApiError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Request ID for error tracking

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`requestId`](NeuroLinkApiError.md#requestid)

---

### headers?

> `readonly` `optional` **headers?**: `Record`\<`string`, `string`\>

HTTP response headers

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`headers`](NeuroLinkApiError.md#headers)

---

### body?

> `readonly` `optional` **body?**: `unknown`

HTTP response body

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`body`](NeuroLinkApiError.md#body)

---

### retryAfter?

> `readonly` `optional` **retryAfter?**: `number`

Retry-After value in seconds (if provided)

---

### resetAt?

> `readonly` `optional` **resetAt?**: `Date`

Rate limit reset time

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`toApiError`](NeuroLinkApiError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`NeuroLinkApiError`](NeuroLinkApiError.md).[`toJSON`](NeuroLinkApiError.md#tojson)
