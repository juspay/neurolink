[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexPassthroughTerminal

# Type Alias: VertexPassthroughTerminal

> **VertexPassthroughTerminal** = `object`

Defined in: [types/proxy.ts:5036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5036)

How a Claude-on-Vertex passthrough ended, so the hop can be finalized once.

## Properties

### usage

> **usage**: [`UsageContext`](UsageContext.md)

Defined in: [types/proxy.ts:5037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5037)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:5039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5039)

200 served, 499 client cancelled, 502 upstream stream failure.

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:5040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5040)
