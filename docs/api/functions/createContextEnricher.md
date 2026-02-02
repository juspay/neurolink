[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createContextEnricher

# Function: createContextEnricher()

> **createContextEnricher**(): `SpanProcessor`

Defined in: [services/server/ai/observability/instrumentation.ts:558](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L558)

Create a new ContextEnricher span processor

Use this when `useExternalTracerProvider` is true to add context enrichment
to your own TracerProvider. The ContextEnricher adds Langfuse context
(userId, sessionId, conversationId, etc.) to spans.

## Returns

`SpanProcessor`

A new ContextEnricher instance implementing the OpenTelemetry SpanProcessor interface

## ContextEnricher Behavior

### onStart(span)

Enriches the span with context from AsyncLocalStorage:

- `user.id` - User identifier
- `session.id` - Session identifier
- `conversation.id` - Conversation/thread identifier
- `request.id` - Request identifier for log correlation
- `trace.name` - Custom trace name
- `metadata.*` - Custom metadata as prefixed attributes

### onEnd(span)

Reads GenAI semantic convention attributes from the span and logs token usage
for debugging. Detects spans from Vercel AI SDK's `experimental_telemetry`.

## Example

```typescript
import {
  createContextEnricher,
  getLangfuseSpanProcessor,
} from "@juspay/neurolink";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

const provider = new NodeTracerProvider();

// Add ContextEnricher for Langfuse context propagation
provider.addSpanProcessor(createContextEnricher());

// Add Langfuse processor for sending to Langfuse
const langfuseProcessor = getLangfuseSpanProcessor();
if (langfuseProcessor) {
  provider.addSpanProcessor(langfuseProcessor);
}

provider.register();
```

## Notes

- Each call creates a new ContextEnricher instance
- Can be called before or after initialization
- Works with any TracerProvider, not just NeuroLink's

## See Also

- [getSpanProcessors](./getSpanProcessors.md) - Get both processors together
- [setLangfuseContext](./setLangfuseContext.md) - Set context for enrichment
- [LangfuseSpanAttributes](../type-aliases/LangfuseSpanAttributes.md) - GenAI attributes
