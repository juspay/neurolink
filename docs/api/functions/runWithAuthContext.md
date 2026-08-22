[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / runWithAuthContext

# Function: runWithAuthContext()

> **runWithAuthContext**\<`T`\>(`context`, `callback`): `T` \| `Promise`\<`T`\>

Defined in: [auth/authContext.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/auth/authContext.ts#L40)

Run a function with authentication context

Sets up async local storage so getAuthContext() can be called
from anywhere within the callback's execution.

## Type Parameters

### T

`T`

## Parameters

### context

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

The authenticated context

### callback

() => `T` \| `Promise`\<`T`\>

Function to run with context available

## Returns

`T` \| `Promise`\<`T`\>

Result of the callback

## Example

```typescript
await runWithAuthContext(authContext, async () => {
  // Inside here, getAuthContext() returns the context
  const user = getCurrentUser();
  await processRequest();
});
```
