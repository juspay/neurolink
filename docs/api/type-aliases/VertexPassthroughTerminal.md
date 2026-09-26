[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexPassthroughTerminal

# Type Alias: VertexPassthroughTerminal

> **VertexPassthroughTerminal** = `object`

Defined in: [types/proxy.ts:5038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5038)

How a Claude-on-Vertex passthrough ended, so the hop can be finalized once.

## Properties

### usage

> **usage**: [`UsageContext`](UsageContext.md)

Defined in: [types/proxy.ts:5039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5039)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:5041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5041)

200 served, 499 client cancelled, 502 upstream stream failure.

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:5042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5042)
