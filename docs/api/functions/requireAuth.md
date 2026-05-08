[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / requireAuth

# Function: requireAuth()

> **requireAuth**(): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

Defined in: [auth/authContext.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L123)

Require authentication

Throws if no auth context is available.

## Returns

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

The authenticated context

## Throws

Error if not authenticated

## Example

```typescript
const context = requireAuth();
// Safe to use context.user here
```
