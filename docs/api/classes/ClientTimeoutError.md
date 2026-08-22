[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientTimeoutError

# Class: ClientTimeoutError

Defined in: [client/errors.ts:345](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L345)

Error for request timeout

## Extends

- [`ClientNetworkError`](ClientNetworkError.md)

## Constructors

### Constructor

> **new ClientTimeoutError**(`timeoutMs`, `message?`, `options?`): `ClientTimeoutError`

Defined in: [client/errors.ts:349](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L349)

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

Defined in: [client/errors.ts:76](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L76)

Error code for programmatic handling

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`code`](ClientNetworkError.md#code)

---

### status?

> `readonly` `optional` **status?**: `number`

Defined in: [client/errors.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L78)

HTTP status code (if applicable)

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`status`](ClientNetworkError.md#status)

---

### details?

> `readonly` `optional` **details?**: [`JsonObject`](../type-aliases/JsonObject.md)

Defined in: [client/errors.ts:80](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L80)

Additional error details

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`details`](ClientNetworkError.md#details)

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [client/errors.ts:82](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L82)

Whether the error is retryable

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`retryable`](ClientNetworkError.md#retryable)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Defined in: [client/errors.ts:84](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L84)

Request ID for error tracking

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`requestId`](ClientNetworkError.md#requestid)

---

### timeoutMs

> `readonly` **timeoutMs**: `number`

Defined in: [client/errors.ts:347](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L347)

Timeout duration in milliseconds

## Methods

### toApiError()

> **toApiError**(): [`ClientApiError`](../type-aliases/ClientApiError.md)

Defined in: [client/errors.ts:109](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L109)

Convert error to API error format

#### Returns

[`ClientApiError`](../type-aliases/ClientApiError.md)

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`toApiError`](ClientNetworkError.md#toapierror)

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [client/errors.ts:123](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/errors.ts#L123)

Convert error to JSON

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`ClientNetworkError`](ClientNetworkError.md).[`toJSON`](ClientNetworkError.md#tojson)
