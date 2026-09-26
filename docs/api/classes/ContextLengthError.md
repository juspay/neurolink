[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextLengthError

# Class: ContextLengthError

Error for context length exceeded

## Extends

- [`ClientProviderError`](ClientProviderError.md)

## Constructors

### Constructor

> **new ContextLengthError**(`message?`, `options?`): `ContextLengthError`

#### Parameters

##### message?

`string` = `"Context length exceeded"`

##### options?

###### maxTokens?

`number`

###### requestedTokens?

`number`

###### provider?

`string`

###### model?

`string`

###### requestId?

`string`

#### Returns

`ContextLengthError`

#### Overrides

[`ClientProviderError`](ClientProviderError.md).[`constructor`](ClientProviderError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCodeType`](../type-aliases/ErrorCodeType.md)

Error code for programmatic handling

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`code`](ClientProviderError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

HTTP status code (if applicable)

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`status`](ClientProviderError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Additional error details

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`details`](ClientProviderError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Whether the error is retryable

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`retryable`](ClientProviderError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Request ID for error tracking

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`requestId`](ClientProviderError.md#requestid)

---

### provider?

> `readonly` `optional` **provider?**: `string`

Provider name

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`provider`](ClientProviderError.md#provider)

---

### model?

> `readonly` `optional` **model?**: `string`

Model name

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`model`](ClientProviderError.md#model)

---

### providerError?

> `readonly` `optional` **providerError?**: `unknown`

Original provider error

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`providerError`](ClientProviderError.md#providererror)

---

### maxTokens?

> `readonly` `optional` **maxTokens?**: `number`

Maximum allowed tokens

---

### requestedTokens?

> `readonly` `optional` **requestedTokens?**: `number`

Requested tokens

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`toApiError`](ClientProviderError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`toJSON`](ClientProviderError.md#tojson)
