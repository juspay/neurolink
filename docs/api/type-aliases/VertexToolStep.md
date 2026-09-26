[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexToolStep

# Type Alias: VertexToolStep

> **VertexToolStep** = `object`

Defined in: [types/providers.ts:2499](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2499)

Internal helpers used by the conversation-history builder in
providers/googleVertex.ts to merge interleaved tool call / result turns.

## Properties

### type

> **type**: `"tool_step"`

Defined in: [types/providers.ts:2500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2500)

---

### callParts

> **callParts**: `unknown`[]

Defined in: [types/providers.ts:2501](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2501)

---

### resultParts

> **resultParts**: `unknown`[]

Defined in: [types/providers.ts:2502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2502)
