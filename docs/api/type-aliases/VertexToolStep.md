[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexToolStep

# Type Alias: VertexToolStep

> **VertexToolStep** = `object`

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

Internal helpers used by the conversation-history builder in
providers/googleVertex.ts to merge interleaved tool call / result turns.

## Properties

### type

> **type**: `"tool_step"`

Defined in: [types/providers.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2401)

---

### callParts

> **callParts**: `unknown`[]

Defined in: [types/providers.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2402)

---

### resultParts

> **resultParts**: `unknown`[]

Defined in: [types/providers.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2403)
