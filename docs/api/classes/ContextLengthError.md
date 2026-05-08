[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextLengthError

# Class: ContextLengthError

Defined in: [client/errors.ts:528](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L528)

Error for context length exceeded

## Extends

- [`ClientProviderError`](ClientProviderError.md)

## Constructors

### Constructor

> **new ContextLengthError**(`message?`, `options?`): `ContextLengthError`

Defined in: [client/errors.ts:534](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L534)

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

Defined in: [client/errors.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L76)

Error code for programmatic handling

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`code`](ClientProviderError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

Defined in: [client/errors.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L78)

HTTP status code (if applicable)

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`status`](ClientProviderError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Defined in: [client/errors.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L80)

Additional error details

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`details`](ClientProviderError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [client/errors.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L82)

Whether the error is retryable

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`retryable`](ClientProviderError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Defined in: [client/errors.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L84)

Request ID for error tracking

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`requestId`](ClientProviderError.md#requestid)

---

### provider?

> `readonly` `optional` **provider?**: `string`

Defined in: [client/errors.ts:489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L489)

Provider name

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`provider`](ClientProviderError.md#provider)

---

### model?

> `readonly` `optional` **model?**: `string`

Defined in: [client/errors.ts:491](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L491)

Model name

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`model`](ClientProviderError.md#model)

---

### providerError?

> `readonly` `optional` **providerError?**: `unknown`

Defined in: [client/errors.ts:493](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L493)

Original provider error

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`providerError`](ClientProviderError.md#providererror)

---

### maxTokens?

> `readonly` `optional` **maxTokens?**: `number`

Defined in: [client/errors.ts:530](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L530)

Maximum allowed tokens

---

### requestedTokens?

> `readonly` `optional` **requestedTokens?**: `number`

Defined in: [client/errors.ts:532](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L532)

Requested tokens

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Defined in: [client/errors.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L109)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`toApiError`](ClientProviderError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [client/errors.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/errors.ts#L123)

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ClientProviderError`](ClientProviderError.md).[`toJSON`](ClientProviderError.md#tojson)
