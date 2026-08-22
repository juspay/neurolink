[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfuseContext

# Function: getLangfuseContext()

> **getLangfuseContext**(): [`LangfuseContext`](../type-aliases/LangfuseContext.md) \| `undefined`

Defined in: [services/server/ai/observability/instrumentation.ts:1436](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/services/server/ai/observability/instrumentation.ts#L1436)

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
