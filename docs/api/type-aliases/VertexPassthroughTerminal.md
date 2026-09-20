[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexPassthroughTerminal

# Type Alias: VertexPassthroughTerminal

> **VertexPassthroughTerminal** = `object`

Defined in: [types/proxy.ts:4846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4846)

How a Claude-on-Vertex passthrough ended, so the hop can be finalized once.

## Properties

### usage

> **usage**: [`UsageContext`](UsageContext.md)

Defined in: [types/proxy.ts:4847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4847)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:4849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4849)

200 served, 499 client cancelled, 502 upstream stream failure.

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:4850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4850)
