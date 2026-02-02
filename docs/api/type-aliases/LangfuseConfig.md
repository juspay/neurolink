[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseConfig

# Type Alias: LangfuseConfig

> **LangfuseConfig** = `object`

Defined in: [types/observability.ts:68](https://github.com/juspay/neurolink/blob/main/src/lib/types/observability.ts#L68)

Langfuse observability configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/observability.ts:12](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L12)

Whether Langfuse is enabled

---

### publicKey

> **publicKey**: `string`

Defined in: [types/observability.ts:14](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L14)

Langfuse public key

---

### secretKey

> **secretKey**: `string`

Defined in: [types/observability.ts:21](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L21)

Langfuse secret key

#### Sensitive

WARNING: This is a sensitive credential. Handle securely.
Do NOT log, expose, or share this key. Follow best practices for secret management.

---

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [types/observability.ts:23](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L23)

Langfuse base URL (default: https://cloud.langfuse.com)

---

### environment?

> `optional` **environment**: `string`

Defined in: [types/observability.ts:25](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L25)

Environment name (e.g., dev, staging, prod)

---

### release?

> `optional` **release**: `string`

Defined in: [types/observability.ts:27](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L27)

Release/version identifier

---

### userId?

> `optional` **userId**: `string`

Defined in: [types/observability.ts:29](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L29)

Optional default user id to attach to spans

---

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [types/observability.ts:31](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L31)

Optional default session id to attach to spans

---

### useExternalTracerProvider?

> `optional` **useExternalTracerProvider**: `boolean`

Defined in: [types/observability.ts:43](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/observability.ts#L43)

If true, NeuroLink will NOT create or register its own TracerProvider.
Instead, it will only create the LangfuseSpanProcessor and ContextEnricher,
which the parent application must add to its own TracerProvider.

Use this when your application already has OpenTelemetry instrumentation.

#### Default

`false`

---

### autoDetectExternalProvider?

> `optional` **autoDetectExternalProvider**: `boolean`

Defined in: [types/observability.ts:110](https://github.com/juspay/neurolink/blob/main/src/lib/types/observability.ts#L110)

If true, NeuroLink will automatically detect if a TracerProvider is already
registered globally and skip its own registration to avoid conflicts.

This is a convenience option that combines well with useExternalTracerProvider.

#### Default

`false`

---

### autoDetectOperationName?

> `optional` **autoDetectOperationName**: `boolean`

Defined in: [types/observability.ts:133](https://github.com/juspay/neurolink/blob/main/src/lib/types/observability.ts#L133)

Enable auto-detection of operation names from span names.

When `true` (default), AI operation spans (`ai.streamText`, `ai.generateText`, etc.)
will have their operation name automatically extracted and included in the
trace name.

#### Default

`true`

#### Examples

```typescript
// With auto-detection enabled (default):
// Span "ai.streamText" + userId "user@email.com"
// → Trace name: "user@email.com:ai.streamText"

// With auto-detection disabled:
// → Trace name: "user@email.com" (legacy behavior)
```

---

### traceNameFormat?

> `optional` **traceNameFormat**: [`TraceNameFormat`](./TraceNameFormat.md)

Defined in: [types/observability.ts:155](https://github.com/juspay/neurolink/blob/main/src/lib/types/observability.ts#L155)

Format for trace names in Langfuse.

Controls how `userId` and `operationName` are combined to form the trace name.
Can be a predefined format string or a custom function for full control.

#### Default

`"userId:operationName"`

#### Examples

```typescript
// Predefined formats:
traceNameFormat: "userId:operationName"; // "user@email.com:ai.streamText"
traceNameFormat: "operationName:userId"; // "ai.streamText:user@email.com"
traceNameFormat: "operationName"; // "ai.streamText"
traceNameFormat: "userId"; // "user@email.com" (legacy)

// Custom function:
traceNameFormat: (ctx) => `[${ctx.operationName || "unknown"}] ${ctx.userId}`;
// → "[ai.streamText] user@email.com"
```

## See Also

- [TraceNameFormat](./TraceNameFormat.md) - Type definition for trace name formats
- [setLangfuseContext](../functions/setLangfuseContext.md) - Set context for spans
- [getSpanProcessors](../functions/getSpanProcessors.md) - Get span processors for external provider mode
