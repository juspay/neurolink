[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / requireUser

# Function: requireUser()

> **requireUser**(`userId`): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

Defined in: [auth/authContext.ts:140](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/authContext.ts#L140)

Require a specific user

Throws if no auth context or user doesn't match.

## Parameters

### userId

`string`

Expected user ID

## Returns

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

The authenticated context

## Throws

Error if not authenticated or wrong user
