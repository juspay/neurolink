[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexPassthroughTerminal

# Type Alias: VertexPassthroughTerminal

> **VertexPassthroughTerminal** = `object`

How a Claude-on-Vertex passthrough ended, so the hop can be finalized once.

## Properties

### usage

> **usage**: [`UsageContext`](UsageContext.md)

---

### status

> **status**: `number`

200 served, 499 client cancelled, 502 upstream stream failure.

---

### errorMessage?

> `optional` **errorMessage?**: `string`
