[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getCurrentUser

# Function: getCurrentUser()

> **getCurrentUser**(): [`AuthUser`](../type-aliases/AuthUser.md) \| `undefined`

Defined in: [auth/authContext.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L82)

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
