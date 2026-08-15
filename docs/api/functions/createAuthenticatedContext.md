[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthenticatedContext

# Function: createAuthenticatedContext()

> **createAuthenticatedContext**(`user`, `session`, `request`, `provider`): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

Defined in: [auth/authContext.ts:265](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/authContext.ts#L265)

Create an authenticated context

Helper to build an AuthenticatedContext object.

## Parameters

### user

[`AuthUser`](../type-aliases/AuthUser.md)

The authenticated user

### session

[`AuthSession`](../type-aliases/AuthSession.md)

The user's session

### request

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

The original request context

### provider

[`AuthProviderType`](../type-aliases/AuthProviderType.md)

The auth provider type

## Returns

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

Complete authenticated context
