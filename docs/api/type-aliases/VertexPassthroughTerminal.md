[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexPassthroughTerminal

# Type Alias: VertexPassthroughTerminal

> **VertexPassthroughTerminal** = `object`

Defined in: [types/proxy.ts:4943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4943)

How a Claude-on-Vertex passthrough ended, so the hop can be finalized once.

## Properties

### usage

> **usage**: [`UsageContext`](UsageContext.md)

Defined in: [types/proxy.ts:4944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4944)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:4946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4946)

200 served, 499 client cancelled, 502 upstream stream failure.

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:4947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4947)
