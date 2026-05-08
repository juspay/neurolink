[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfuseContext

# Function: getLangfuseContext()

> **getLangfuseContext**(): [`LangfuseContext`](../type-aliases/LangfuseContext.md) \| `undefined`

Defined in: [services/server/ai/observability/instrumentation.ts:1445](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L1445)

Get the current Langfuse context from AsyncLocalStorage

Returns the current context including userId, sessionId, conversationId,
requestId, traceName, and metadata. Returns undefined if no context is set.

## Returns

[`LangfuseContext`](../type-aliases/LangfuseContext.md) \| `undefined`

The current LangfuseContext or undefined

## Example

```ts
const context = getLangfuseContext();
console.log(context?.userId, context?.sessionId);
```
