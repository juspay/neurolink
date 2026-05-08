[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterError

# Class: ServerAdapterError

Defined in: [server/errors.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L20)

Base error class for server adapter errors

## Extends

- `Error`

## Extended by

- [`AlreadyRunningError`](AlreadyRunningError.md)
- [`AuthenticationError`](AuthenticationError.md)
- [`AuthorizationError`](AuthorizationError.md)
- [`ConfigurationError`](ConfigurationError.md)
- [`HandlerError`](HandlerError.md)
- [`InvalidAuthenticationError`](InvalidAuthenticationError.md)
- [`MissingDependencyError`](MissingDependencyError.md)
- [`NotRunningError`](NotRunningError.md)
- [`RateLimitError`](RateLimitError.md)
- [`RouteConflictError`](RouteConflictError.md)
- [`RouteNotFoundError`](RouteNotFoundError.md)
- [`ServerStartError`](ServerStartError.md)
- [`ServerStopError`](ServerStopError.md)
- [`ServerValidationError`](ServerValidationError.md)
- [`StreamAbortedError`](StreamAbortedError.md)
- [`StreamingError`](StreamingError.md)
- [`TimeoutError`](TimeoutError.md)
- [`WebSocketConnectionError`](WebSocketConnectionError.md)
- [`WebSocketError`](WebSocketError.md)

## Constructors

### Constructor

> **new ServerAdapterError**(`message`, `code`, `context?`): `ServerAdapterError`

Defined in: [server/errors.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L32)

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

Defined in: [server/errors.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L21)

---

### category

> `readonly` **category**: [`ErrorCategoryType`](../type-aliases/ErrorCategoryType.md)

Defined in: [server/errors.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L22)

---

### severity

> `readonly` **severity**: [`ErrorSeverityType`](../type-aliases/ErrorSeverityType.md)

Defined in: [server/errors.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L23)

---

### retryable

> `readonly` **retryable**: `boolean`

Defined in: [server/errors.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L24)

---

### retryAfterMs?

> `readonly` `optional` **retryAfterMs?**: `number`

Defined in: [server/errors.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L25)

---

### requestId?

> `readonly` `optional` **requestId?**: `string`

Defined in: [server/errors.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L26)

---

### path?

> `readonly` `optional` **path?**: `string`

Defined in: [server/errors.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L27)

---

### method?

> `readonly` `optional` **method?**: `string`

Defined in: [server/errors.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L28)

---

### details?

> `readonly` `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [server/errors.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L29)

---

### cause?

> `readonly` `optional` **cause?**: `Error`

Defined in: [server/errors.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L30)

#### Overrides

`Error.cause`

## Methods

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [server/errors.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L59)

Convert to JSON for API responses

#### Returns

`Record`\<`string`, `unknown`\>

---

### getHttpStatus()

> **getHttpStatus**(): `number`

Defined in: [server/errors.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/errors.ts#L77)

Get HTTP status code for this error

#### Returns

`number`
