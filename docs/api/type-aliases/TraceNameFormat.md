[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TraceNameFormat

# Type Alias: TraceNameFormat

> **TraceNameFormat** = `"userId:operationName"` \| `"operationName:userId"` \| `"operationName"` \| `"userId"` \| ((`context`) => `string`)

Defined in: [types/observability.ts:28](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L28)

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
