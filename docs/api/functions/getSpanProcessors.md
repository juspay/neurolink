[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getSpanProcessors

# Function: getSpanProcessors()

> **getSpanProcessors**(): `SpanProcessor`[]

Defined in: [services/server/ai/observability/instrumentation.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/services/server/ai/observability/instrumentation.ts#L1568)

Get all span processors that NeuroLink would use
Convenience function that returns [ContextEnricher, LangfuseSpanProcessor]

## Returns

`SpanProcessor`[]

Array of span processors, or empty array if not initialized
