[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createContextEnricher

# Function: createContextEnricher()

> **createContextEnricher**(): `SpanProcessor`

Defined in: [services/server/ai/observability/instrumentation.ts:1558](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/services/server/ai/observability/instrumentation.ts#L1558)

Create a new ContextEnricher span processor
Use this when useExternalTracerProvider is true to add to your own TracerProvider

## Returns

`SpanProcessor`

A new ContextEnricher instance
