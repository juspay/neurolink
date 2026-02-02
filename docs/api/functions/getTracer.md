[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getTracer

# Function: getTracer()

> **getTracer**(`name?`, `version?`): `Tracer`

Defined in: [services/server/ai/observability/instrumentation.ts:615](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L615)

Get an OpenTelemetry Tracer for creating custom spans

This allows applications to create their own spans that will be
processed by the same span processors (ContextEnricher + LangfuseSpanProcessor).
Custom spans will inherit the Langfuse context set via `setLangfuseContext()`.

## Parameters

### name?

`string`

Tracer name, defaults to "neurolink"

### version?

`string`

Tracer version (optional)

## Returns

`Tracer`

OpenTelemetry Tracer instance from `@opentelemetry/api`

## Examples

### Basic custom span

```typescript
import { getTracer } from "@juspay/neurolink";

const tracer = getTracer("my-app");
const span = tracer.startSpan("custom-operation");
try {
  // ... do work
  span.setAttribute("custom.key", "value");
} finally {
  span.end();
}
```

### Nested spans with context

```typescript
import { getTracer, setLangfuseContext } from "@juspay/neurolink";

const tracer = getTracer("my-app", "1.0.0");

await setLangfuseContext({ userId: "user-123" }, async () => {
  const parentSpan = tracer.startSpan("parent-operation");

  try {
    // Create child span
    const childSpan = tracer.startSpan("child-operation");
    try {
      await doSomeWork();
      childSpan.setAttribute("result", "success");
    } finally {
      childSpan.end();
    }
  } finally {
    parentSpan.end();
  }
});
```

### Tracing async operations

```typescript
import { getTracer } from "@juspay/neurolink";
import { context, trace } from "@opentelemetry/api";

const tracer = getTracer("my-app");

async function tracedOperation() {
  return tracer.startActiveSpan("my-operation", async (span) => {
    try {
      const result = await fetchData();
      span.setAttribute("data.count", result.length);
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### With error recording

```typescript
import { getTracer } from "@juspay/neurolink";
import { SpanStatusCode } from "@opentelemetry/api";

const tracer = getTracer("my-app");

async function riskyOperation() {
  const span = tracer.startSpan("risky-operation");
  try {
    await doRiskyThing();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
}
```

## Notes

- The tracer uses the global TracerProvider (either NeuroLink's or your external one)
- Spans created with this tracer will be processed by ContextEnricher and LangfuseSpanProcessor
- In external provider mode, spans will be sent to your configured exporters
- Always call `span.end()` to ensure spans are properly recorded

## See Also

- [setLangfuseContext](./setLangfuseContext.md) - Set context for spans
- [getLangfuseContext](./getLangfuseContext.md) - Read current context
- [getSpanProcessors](./getSpanProcessors.md) - Get span processors for external providers
- [LangfuseSpanAttributes](../type-aliases/LangfuseSpanAttributes.md) - GenAI attribute types
