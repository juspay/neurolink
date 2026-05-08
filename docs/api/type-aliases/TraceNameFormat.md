[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TraceNameFormat

# Type Alias: TraceNameFormat

> **TraceNameFormat** = `"userId:operationName"` \| `"operationName:userId"` \| `"operationName"` \| `"userId"` \| ((`context`) => `string`)

Defined in: [types/observability.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L28)

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
