[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getAuthContext

# Function: getAuthContext()

> **getAuthContext**(): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`

Defined in: [auth/authContext.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/auth/authContext.ts#L63)

Get the current authentication context

Returns the authenticated context for the current request,
or undefined if no context is set.

## Returns

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`

Current auth context or undefined

## Example

```typescript
const context = getAuthContext();
if (context) {
  console.log("Current user:", context.user.email);
}
```
