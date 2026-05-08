[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getSpanProcessors

# Function: getSpanProcessors()

> **getSpanProcessors**(): `SpanProcessor`[]

Defined in: [services/server/ai/observability/instrumentation.ts:1533](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L1533)

Get all span processors that NeuroLink would use
Convenience function that returns [ContextEnricher, LangfuseSpanProcessor]

## Returns

`SpanProcessor`[]

Array of span processors, or empty array if not initialized
