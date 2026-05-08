[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthenticatedContext

# Function: createAuthenticatedContext()

> **createAuthenticatedContext**(`user`, `session`, `request`, `provider`): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

Defined in: [auth/authContext.ts:265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L265)

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
