[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientProviderError

# Class: ClientProviderError

Error from AI provider

## Extends

- [`ClientNeuroLinkError`](ClientNeuroLinkError.md)

## Extended by

- [`ContextLengthError`](ContextLengthError.md)
- [`ContentFilterError`](ContentFilterError.md)

## Constructors

### Constructor

> **new ClientProviderError**(`message`, `options?`): `ClientProviderError`

#### Parameters

##### message

`string`

##### options?

###### provider?

`string`

###### model?

`string`

###### providerError?

`unknown`

###### status?

`number`

###### details?

[`JsonObject`](../type-aliases/JsonObject.md)

###### retryable?

`boolean`

###### requestId?

`string`

#### Returns

`ClientProviderError`

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

### provider?

> `readonly` `optional` **provider?**: `string`

Provider name

---

### model?

> `readonly` `optional` **model?**: `string`

Model name

---

### providerError?

> `readonly` `optional` **providerError?**: `unknown`

Original provider error

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
