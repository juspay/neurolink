[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createContextEnricher

# Function: createContextEnricher()

> **createContextEnricher**(): `SpanProcessor`

Defined in: [services/server/ai/observability/instrumentation.ts:1523](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L1523)

Create a new ContextEnricher span processor
Use this when useExternalTracerProvider is true to add to your own TracerProvider

## Returns

`SpanProcessor`

A new ContextEnricher instance
