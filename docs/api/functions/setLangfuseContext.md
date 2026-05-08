[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / setLangfuseContext

# Function: setLangfuseContext()

> **setLangfuseContext**\<`T`\>(`context`, `callback?`): `Promise`\<`void` \| `T`\>

Defined in: [services/server/ai/observability/instrumentation.ts:1369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L1369)

Set user and session context for Langfuse spans in the current async context

Merges the provided context with existing AsyncLocalStorage context. If a callback is provided,
the context is scoped to that callback execution and returns the callback's result.
Without a callback, the context applies to the current execution context and its children.

Uses AsyncLocalStorage to properly scope context per request, avoiding race conditions
in concurrent scenarios.

## Type Parameters

### T

`T` = `void`

## Parameters

### context

Object containing context fields to merge with existing context

#### userId?

`string` \| `null`

#### sessionId?

`string` \| `null`

#### conversationId?

`string` \| `null`

#### requestId?

`string` \| `null`

#### traceName?

`string` \| `null`

#### metadata?

`Record`\<`string`, `unknown`\> \| `null`

#### operationName?

`string` \| `null`

Explicit operation name (overrides auto-detection)

#### autoDetectOperationName?

`boolean`

Override global autoDetectOperationName for this context

#### customAttributes?

`Record`\<`string`, `string` \| `number` \| `boolean`\>

Custom attributes to set on all spans within this context

### callback?

() => `T` \| `Promise`\<`T`\>

Optional callback to run within the context scope. If omitted, context applies to current execution

## Returns

`Promise`\<`void` \| `T`\>

The callback's return value if provided, otherwise void

## Examples

```ts
// With callback - returns the result
const result = await setLangfuseContext({ userId: "user123" }, async () => {
  return await generateText({ model: "gpt-4", prompt: "Hello" });
});
```

```ts
// Without callback - sets context for current execution
await setLangfuseContext({
  sessionId: "session456",
  traceName: "chat-completion",
});
```
