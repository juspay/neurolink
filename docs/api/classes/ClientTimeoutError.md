[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientTimeoutError

# Class: ClientTimeoutError

Error for request timeout

## Extends

- [`ClientNetworkError`](ClientNetworkError.md)

## Constructors

### Constructor

> **new ClientTimeoutError**(`timeoutMs`, `message?`, `options?`): `ClientTimeoutError`

#### Parameters

##### timeoutMs

`number`

##### message?

`string`

##### options?

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### requestId?

`string`

#### Returns

`ClientTimeoutError`

#### Overrides

[`ClientNetworkError`](ClientNetworkError.md).[`constructor`](ClientNetworkError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

Error code for programmatic handling

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`code`](ClientNetworkError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

HTTP status code (if applicable)

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`status`](ClientNetworkError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Additional error details

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`details`](ClientNetworkError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Whether the error is retryable

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`retryable`](ClientNetworkError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Request ID for error tracking

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`requestId`](ClientNetworkError.md#requestid)

---

### timeoutMs

> `readonly` **timeoutMs**: `number`

Timeout duration in milliseconds

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`toApiError`](ClientNetworkError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`toJSON`](ClientNetworkError.md#tojson)
