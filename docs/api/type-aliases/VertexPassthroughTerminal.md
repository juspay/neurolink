[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexPassthroughTerminal

# Type Alias: VertexPassthroughTerminal

> **VertexPassthroughTerminal** = `object`

Defined in: [types/proxy.ts:5098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5098)

How a Claude-on-Vertex passthrough ended, so the hop can be finalized once.

## Properties

### usage

> **usage**: [`UsageContext`](UsageContext.md)

Defined in: [types/proxy.ts:5099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5099)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:5101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5101)

200 served, 499 client cancelled, 502 upstream stream failure.

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:5102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5102)
