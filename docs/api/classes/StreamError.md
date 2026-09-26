[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamError

# Class: StreamError

Error for stream processing failures

## Extends

- [`ClientNeuroLinkError`](ClientNeuroLinkError.md)

## Constructors

### Constructor

> **new StreamError**(`message?`, `options?`): `StreamError`

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
