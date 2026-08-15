[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TraceView

# Type Alias: TraceView

> **TraceView** = `object`

Defined in: [types/observability.ts:255](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L255)

Hierarchical trace view grouping related spans

## Properties

### traceId

> **traceId**: `string`

Defined in: [types/observability.ts:257](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L257)

Trace identifier shared by all spans in this trace

---

### rootSpan

> **rootSpan**: [`SpanData`](SpanData.md)

Defined in: [types/observability.ts:259](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L259)

The root/parent span of this trace

---

### childSpans

> **childSpans**: [`SpanData`](SpanData.md)[]

Defined in: [types/observability.ts:261](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L261)

Child spans linked to the root

---

### totalDurationMs

> **totalDurationMs**: `number`

Defined in: [types/observability.ts:263](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L263)

Total duration from first to last span

---

### spanCount

> **spanCount**: `number`

Defined in: [types/observability.ts:265](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L265)

Total number of spans in this trace

---

### status

> **status**: `"ok"` \| `"error"` \| `"partial"`

Defined in: [types/observability.ts:267](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L267)

Overall trace status
