[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / requireUser

# Function: requireUser()

> **requireUser**(`userId`): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

Defined in: [auth/authContext.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L140)

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
