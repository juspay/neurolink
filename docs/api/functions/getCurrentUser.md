[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getCurrentUser

# Function: getCurrentUser()

> **getCurrentUser**(): [`AuthUser`](../type-aliases/AuthUser.md) \| `undefined`

Get the current authenticated user

Convenience function to get just the user from context.

## Returns

[`AuthUser`](../type-aliases/AuthUser.md) \| `undefined`

Current user or undefined

## Example

```typescript
const user = getCurrentUser();
if (user) {
  console.log("Hello,", user.name);
}
```
