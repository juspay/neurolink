[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexUsageCounter

# Type Alias: VertexUsageCounter

> **VertexUsageCounter** = `"input"` \| `"output"` \| `"cacheRead"` \| `"reasoning"`

Defined in: [types/providers.ts:2054](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2054)

Which turn-level counter a per-chunk Vertex usage delta belongs to.

Vertex updates its turn totals incrementally so they stay correct mid-stream
— a step killed by an abort, the turn deadline or the stall watchdog still
bills the tokens it already reported.
