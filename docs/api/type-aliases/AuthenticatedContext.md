[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticatedContext

# Type Alias: AuthenticatedContext

> **AuthenticatedContext** = [`AuthRequestContext`](AuthRequestContext.md) & `object`

Defined in: [types/auth.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L371)

Enhanced request context with authenticated user.

Extends AuthRequestContext so it can be passed wherever a plain
request context is expected (e.g. RBAC middleware callbacks).

## Type Declaration

### user

> **user**: [`AuthUser`](AuthUser.md)

Authenticated user

### session?

> `optional` **session?**: [`AuthSession`](AuthSession.md)

Current session

### request?

> `optional` **request?**: [`AuthRequestContext`](AuthRequestContext.md)

Original request context (for callers that embed it explicitly)

### authenticatedAt?

> `optional` **authenticatedAt?**: `Date`

Authentication timestamp

### provider?

> `optional` **provider?**: [`AuthProviderType`](AuthProviderType.md)

Provider that performed authentication

### token?

> `optional` **token?**: `string`

Token used for authentication

### claims?

> `optional` **claims?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Token claims
