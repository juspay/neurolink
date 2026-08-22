[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / requireAuth

# Function: requireAuth()

> **requireAuth**(): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

Defined in: [auth/authContext.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/auth/authContext.ts#L123)

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
