[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / requireUser

# Function: requireUser()

> **requireUser**(`userId`): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

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
