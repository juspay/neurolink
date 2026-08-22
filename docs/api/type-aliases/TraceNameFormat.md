[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TraceNameFormat

# Type Alias: TraceNameFormat

> **TraceNameFormat** = `"userId:operationName"` \| `"operationName:userId"` \| `"operationName"` \| `"userId"` \| ((`context`) => `string`)

Defined in: [types/observability.ts:28](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L28)

Trace name format for Langfuse traces

Controls how userId and operationName are combined to form the trace name.
Can be a predefined format string or a custom function.

## Examples

```ts
// Predefined formats:
"userId:operationName" → "user@email.com:ai.streamText"
"operationName:userId" → "ai.streamText:user@email.com"
"operationName" → "ai.streamText"
"userId" → "user@email.com" (legacy)
```

```ts
// Custom function:
(ctx) => `[${ctx.operationName}] ${ctx.userId}`;
// → "[ai.streamText] user@email.com"
```
