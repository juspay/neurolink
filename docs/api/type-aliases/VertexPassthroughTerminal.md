[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexPassthroughTerminal

# Type Alias: VertexPassthroughTerminal

> **VertexPassthroughTerminal** = `object`

Defined in: [types/proxy.ts:4966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4966)

How a Claude-on-Vertex passthrough ended, so the hop can be finalized once.

## Properties

### usage

> **usage**: [`UsageContext`](UsageContext.md)

Defined in: [types/proxy.ts:4967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4967)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:4969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4969)

200 served, 499 client cancelled, 502 upstream stream failure.

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:4970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4970)
