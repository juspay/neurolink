[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseConfig

# Type Alias: LangfuseConfig

> **LangfuseConfig** = `object`

Defined in: [types/observability.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L71)

Langfuse observability configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/observability.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L73)

Whether Langfuse is enabled

---

### publicKey

> **publicKey**: `string`

Defined in: [types/observability.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L75)

Langfuse public key

---

### secretKey

> **secretKey**: `string`

Defined in: [types/observability.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L82)

Langfuse secret key

#### Sensitive

WARNING: This is a sensitive credential. Handle securely.
Do NOT log, expose, or share this key. Follow best practices for secret management.

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [types/observability.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L84)

Langfuse base URL (default: https://cloud.langfuse.com)

---

### environment?

> `optional` **environment?**: `string`

Defined in: [types/observability.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L86)

Environment name (e.g., dev, staging, prod)

---

### release?

> `optional` **release?**: `string`

Defined in: [types/observability.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L88)

Release/version identifier

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/observability.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L90)

Optional default user id to attach to spans

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/observability.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L92)

Optional default session id to attach to spans

---

### useExternalTracerProvider?

> `optional` **useExternalTracerProvider?**: `boolean`

Defined in: [types/observability.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L104)

If true, NeuroLink will NOT create or register its own TracerProvider.
Instead, it will only create the LangfuseSpanProcessor and ContextEnricher,
which the parent application must add to its own TracerProvider.

Use this when your application already has OpenTelemetry instrumentation.

#### Default

```ts
false;
```

---

### autoDetectExternalProvider?

> `optional` **autoDetectExternalProvider?**: `boolean`

Defined in: [types/observability.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L114)

If true, NeuroLink will automatically detect if a TracerProvider is already
registered globally and skip its own registration to avoid conflicts.

This is a convenience option that combines well with useExternalTracerProvider.

#### Default

```ts
false;
```

---

### skipLangfuseSpanProcessor?

> `optional` **skipLangfuseSpanProcessor?**: `boolean`

Defined in: [types/observability.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L125)

If true, NeuroLink will NOT register its own LangfuseSpanProcessor with the
global TracerProvider when using external provider mode. Only the ContextEnricher
will be registered. Use this when the host application already registers a
LangfuseSpanProcessor (e.g., via a DeferredSpanProcessor) to prevent duplicate
trace exports to Langfuse.

#### Default

```ts
false;
```

---

### autoDetectOperationName?

> `optional` **autoDetectOperationName?**: `boolean`

Defined in: [types/observability.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L147)

Enable auto-detection of operation names from span names.

When true (default), AI operation spans (ai.streamText, ai.generateText, etc.)
will have their operation name automatically extracted and included in the
trace name.

#### Default

```ts
true;
```

#### Examples

```ts
// With auto-detection enabled (default):
// Span "ai.streamText" + userId "user@email.com"
// → Trace name: "user@email.com:ai.streamText"
```

```ts
// With auto-detection disabled:
// → Trace name: "user@email.com" (legacy behavior)
```

---

### traceNameFormat?

> `optional` **traceNameFormat?**: [`TraceNameFormat`](TraceNameFormat.md)

Defined in: [types/observability.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L169)

Format for trace names in Langfuse.

Controls how userId and operationName are combined to form the trace name.
Can be a predefined format string or a custom function for full control.

#### Default

```ts
"userId:operationName";
```

#### Examples

```ts
// Predefined formats:
traceNameFormat: "userId:operationName"; // "user@email.com:ai.streamText"
traceNameFormat: "operationName:userId"; // "ai.streamText:user@email.com"
traceNameFormat: "operationName"; // "ai.streamText"
traceNameFormat: "userId"; // "user@email.com" (legacy)
```

```ts
// Custom function:
traceNameFormat: (ctx) => `[${ctx.operationName || "unknown"}] ${ctx.userId}`;
// → "[ai.streamText] user@email.com"
```
