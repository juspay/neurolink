[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / runWithAuthContext

# Function: runWithAuthContext()

> **runWithAuthContext**\<`T`\>(`context`, `callback`): `T` \| `Promise`\<`T`\>

Defined in: [auth/authContext.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L40)

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
