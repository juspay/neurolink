[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / getAuthContext

# Function: getAuthContext()

> **getAuthContext**(): [`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`

Defined in: [auth/authContext.ts:63](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/authContext.ts#L63)

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
