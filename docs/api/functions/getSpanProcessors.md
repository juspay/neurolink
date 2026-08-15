[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / getSpanProcessors

# Function: getSpanProcessors()

> **getSpanProcessors**(): `SpanProcessor`[]

Defined in: [services/server/ai/observability/instrumentation.ts:1568](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/services/server/ai/observability/instrumentation.ts#L1568)

Get all span processors that NeuroLink would use
Convenience function that returns [ContextEnricher, LangfuseSpanProcessor]

## Returns

`SpanProcessor`[]

Array of span processors, or empty array if not initialized
