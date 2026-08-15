[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / runWithAuthContext

# Function: runWithAuthContext()

> **runWithAuthContext**\<`T`\>(`context`, `callback`): `T` \| `Promise`\<`T`\>

Defined in: [auth/authContext.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/authContext.ts#L40)

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
