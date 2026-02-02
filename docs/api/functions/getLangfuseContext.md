[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfuseContext

# Function: getLangfuseContext()

> **getLangfuseContext**(): `LangfuseContext` \| `undefined`

Defined in: [services/server/ai/observability/instrumentation.ts:595](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L595)

Get the current Langfuse context from AsyncLocalStorage

Returns the current context including userId, sessionId, conversationId,
requestId, traceName, and metadata. Returns undefined if no context is set.

## Returns

`LangfuseContext` \| `undefined`

The current LangfuseContext or undefined if no context is set

### LangfuseContext Properties

| Property         | Type                              | Description                                        |
| ---------------- | --------------------------------- | -------------------------------------------------- |
| `userId`         | `string \| null`                  | User identifier attached to spans                  |
| `sessionId`      | `string \| null`                  | Session identifier attached to spans               |
| `conversationId` | `string \| null`                  | Conversation/thread identifier for grouping traces |
| `requestId`      | `string \| null`                  | Request identifier for log correlation             |
| `traceName`      | `string \| null`                  | Custom trace name in Langfuse UI                   |
| `metadata`       | `Record<string, unknown> \| null` | Custom key-value metadata                          |

## Examples

### Basic usage

```typescript
import { getLangfuseContext, setLangfuseContext } from "@juspay/neurolink";

// Set some context
await setLangfuseContext({
  userId: "user-123",
  conversationId: "conv-456",
});

// Read it back
const context = getLangfuseContext();
console.log(context?.userId); // "user-123"
console.log(context?.conversationId); // "conv-456"
```

### Check if context exists

```typescript
import { getLangfuseContext } from "@juspay/neurolink";

const context = getLangfuseContext();
if (context) {
  console.log("Context is set:", context.userId, context.sessionId);
} else {
  console.log("No context set in current async scope");
}
```

### Access in middleware or handlers

```typescript
import { getLangfuseContext } from "@juspay/neurolink";

async function handleRequest(req: Request) {
  // Context was set earlier in the request pipeline
  const context = getLangfuseContext();

  // Log with correlation IDs
  console.log(
    `[${context?.requestId}] Processing request for user ${context?.userId}`,
  );

  // Use context for business logic
  if (context?.metadata?.tier === "premium") {
    // Premium user handling
  }
}
```

## See Also

- [setLangfuseContext](./setLangfuseContext.md) - Set the context
- [getTracer](./getTracer.md) - Get a Tracer for custom spans
- [LangfuseConfig](../type-aliases/LangfuseConfig.md) - Configuration options
