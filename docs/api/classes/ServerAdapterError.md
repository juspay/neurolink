[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterError

# Class: ServerAdapterError

Base error class for server adapter errors

## Extends

- `Error`

## Extended by

- [`AlreadyRunningError`](AlreadyRunningError.md)
- [`ConfigurationError`](ConfigurationError.md)
- [`HandlerError`](HandlerError.md)
- [`InvalidAuthenticationError`](InvalidAuthenticationError.md)
- [`MissingDependencyError`](MissingDependencyError.md)
- [`NotRunningError`](NotRunningError.md)
- [`RouteConflictError`](RouteConflictError.md)
- [`RouteNotFoundError`](RouteNotFoundError.md)
- [`ServerAuthenticationError`](ServerAuthenticationError.md)
- [`ServerAuthorizationError`](ServerAuthorizationError.md)
- [`ServerRateLimitError`](ServerRateLimitError.md)
- [`ServerStartError`](ServerStartError.md)
- [`ServerStopError`](ServerStopError.md)
- [`ServerTimeoutError`](ServerTimeoutError.md)
- [`ServerValidationError`](ServerValidationError.md)
- [`StreamAbortedError`](StreamAbortedError.md)
- [`StreamingError`](StreamingError.md)
- [`WebSocketConnectionError`](WebSocketConnectionError.md)
- [`WebSocketError`](WebSocketError.md)

## Constructors

### Constructor

> **new ServerAdapterError**(`message`, `code`, `context?`): `ServerAdapterError`

#### Parameters

##### message

`string`

##### code

[`ServerAdapterErrorCodeType`](../type-aliases/ServerAdapterErrorCodeType.md)

##### context?

`Partial`\<[`ServerAdapterErrorContext`](../type-aliases/ServerAdapterErrorContext.md)\> = `{}`

#### Returns

`ServerAdapterError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: [`ServerAdapterErrorCodeType`](../type-aliases/ServerAdapterErrorCodeType.md)

---

### category

> `readonly` **category**: [`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md)

---

### severity

> `readonly` **severity**: [`ErrorSeverityType`](../type-aliases/ErrorSeverityType.md)

---

### retryable

> `readonly` **retryable**: `boolean`

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

---

### path?

> `readonly` `optional` **path?**: `string`

---

### method?

> `readonly` `optional` **method?**: `string`

---

### details?

> `readonly` `optional` **details?**: `Record`\<`string`, `unknown`\>

---

### cause?

> `readonly` `optional` **cause?**: `Error`

#### Overrides

`Error.cause`

## Methods

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Convert to JSON for API responses

#### Returns

`Record`\<`string`, `unknown`\>

---

### getHttpStatus()

> **getHttpStatus**(): `number`

Get HTTP status code for this error

#### Returns

`number`
