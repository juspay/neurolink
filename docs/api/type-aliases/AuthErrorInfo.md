[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthErrorInfo

# Type Alias: AuthErrorInfo

> **AuthErrorInfo** = `Error` & `object`

Defined in: [types/auth.ts:906](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L906)

Auth error information with additional context.

Renamed from `AuthError` to `AuthErrorInfo` to avoid collision with the
`createErrorFactory` result that is named `AuthError` in errors.ts.

## Type Declaration

### code

> **code**: [`AuthErrorCode`](AuthErrorCode.md)

Error code

### provider?

> `optional` **provider?**: [`AuthProviderType`](AuthProviderType.md)

Provider that threw the error

### statusCode?

> `optional` **statusCode?**: `number`

HTTP status code

### retryable?

> `optional` **retryable?**: `boolean`

Whether the error is retryable

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Additional error context

### cause?

> `optional` **cause?**: `Error`

Original error if wrapped
