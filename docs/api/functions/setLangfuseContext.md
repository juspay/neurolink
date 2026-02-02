[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / setLangfuseContext

# Function: setLangfuseContext()

> **setLangfuseContext**\<`T`\>(`context`, `callback?`): `Promise`\<`T` \| `void`\>

Defined in: [services/server/ai/observability/instrumentation.ts:550](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L550)

Set user and session context for Langfuse spans in the current async context

Merges the provided context with existing AsyncLocalStorage context. If a callback is provided,
the context is scoped to that callback execution and returns the callback's result.
Without a callback, the context applies to the current execution context and its children.

Uses AsyncLocalStorage to properly scope context per request, avoiding race conditions
in concurrent scenarios.

## Type Parameters

### T

The return type of the callback function (defaults to `void`)

## Parameters

### context

Object containing context fields to merge with existing context

#### userId?

`string` \| `null`

User identifier to attach to spans

#### sessionId?

`string` \| `null`

Session identifier to attach to spans

#### conversationId?

`string` \| `null`

Conversation/thread identifier for grouping related traces

#### requestId?

`string` \| `null`

Request identifier for correlating with application logs

#### traceName?

`string` \| `null`

Custom trace name for better organization in Langfuse UI

#### metadata?

`Record<string, unknown>` \| `null`

Custom metadata to attach to spans as key-value pairs

#### operationName?

`string` \| `null`

Explicit operation name for the trace. Overrides auto-detection when set.

Use this to provide meaningful names like "customer-support-chat" or "code-review"
that will appear in the trace name alongside the userId.

#### autoDetectOperationName?

`boolean`

Override the global `autoDetectOperationName` setting for this specific context.

When `undefined`, uses the global setting from `LangfuseConfig` (defaults to `true`).
Set to `false` to disable auto-detection for this context only.

### callback?

`() => T | Promise<T>`

Optional callback to run within the context scope. If omitted, context applies to current execution

## Returns

`Promise`\<`T` \| `void`\>

The callback's return value if provided, otherwise void

## Examples

### With callback - returns the result

```typescript
import { setLangfuseContext } from "@juspay/neurolink";

const result = await setLangfuseContext(
  { userId: "user123", conversationId: "conv-456" },
  async () => {
    return await generateText({ model: "gpt-4", prompt: "Hello" });
  },
);
// result is typed as the return value of the callback
```

### Without callback - sets context for current execution

```typescript
import { setLangfuseContext } from "@juspay/neurolink";

await setLangfuseContext({
  sessionId: "session456",
  traceName: "chat-completion",
  metadata: { feature: "support", tier: "premium" },
});
// Context now applies to all subsequent spans in this async context
```

### With full context

```typescript
import { setLangfuseContext, getLangfuseContext } from "@juspay/neurolink";

await setLangfuseContext({
  userId: "user-123",
  sessionId: "session-456",
  conversationId: "conv-789",
  requestId: "req-abc",
  traceName: "customer-support-chat",
  metadata: {
    feature: "support",
    tier: "premium",
    region: "us-east-1",
  },
});

// Verify context was set
const context = getLangfuseContext();
console.log(context?.conversationId); // "conv-789"
```

### With explicit operation name

```typescript
import { setLangfuseContext } from "@juspay/neurolink";

// Explicit operation name overrides auto-detection
await setLangfuseContext(
  {
    userId: "user@email.com",
    operationName: "customer-support-chat",
  },
  async () => {
    // Trace name will be: "user@email.com:customer-support-chat"
    return await generateText({ model: "gpt-4", prompt: "Help me with..." });
  },
);
```

### Disabling auto-detection for specific context

```typescript
import { setLangfuseContext } from "@juspay/neurolink";

// Disable operation name auto-detection for this context only
// (global setting remains unchanged for other contexts)
await setLangfuseContext(
  {
    userId: "user@email.com",
    autoDetectOperationName: false,
  },
  async () => {
    // Trace name will be: "user@email.com" (legacy behavior)
    return await streamText({ model: "gpt-4", prompt: "Stream this..." });
  },
);
```

### Combining explicit operation name with auto-detection off

```typescript
import { setLangfuseContext } from "@juspay/neurolink";

// When both are set, operationName takes precedence
await setLangfuseContext(
  {
    userId: "user@email.com",
    operationName: "my-custom-operation",
    autoDetectOperationName: false, // This is redundant when operationName is set
  },
  async () => {
    // Trace name: "user@email.com:my-custom-operation"
    return await generateText({ model: "gpt-4", prompt: "..." });
  },
);
```

## See Also

- [getLangfuseContext](./getLangfuseContext.md) - Read the current context
- [getTracer](./getTracer.md) - Get a Tracer for custom spans
- [LangfuseConfig](../type-aliases/LangfuseConfig.md) - Configuration options
