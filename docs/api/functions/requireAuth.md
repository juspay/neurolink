[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / requireAuth

# Function: requireAuth()

> **requireAuth**(): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

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
