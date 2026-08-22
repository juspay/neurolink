[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthErrorInfo

# Type Alias: AuthErrorInfo

> **AuthErrorInfo** = `Error` & `object`

Defined in: [types/auth.ts:906](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L906)

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
