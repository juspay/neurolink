[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TraceView

# Type Alias: TraceView

> **TraceView** = `object`

Hierarchical trace view grouping related spans

## Properties

### traceId

> **traceId**: `string`

Trace identifier shared by all spans in this trace

---

### rootSpan

> **rootSpan**: [`SpanData`](SpanData.md)

The root/parent span of this trace

---

### childSpans

> **childSpans**: [`SpanData`](SpanData.md)[]

Child spans linked to the root

---

### totalDurationMs

> **totalDurationMs**: `number`

Total duration from first to last span

---

### spanCount

> **spanCount**: `number`

Total number of spans in this trace

---

### status

> **status**: `"ok"` \| `"error"` \| `"partial"`

Overall trace status
