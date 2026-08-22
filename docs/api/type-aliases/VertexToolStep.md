[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexToolStep

# Type Alias: VertexToolStep

> **VertexToolStep** = `object`

Defined in: [types/providers.ts:2378](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2378)

Internal helpers used by the conversation-history builder in
providers/googleVertex.ts to merge interleaved tool call / result turns.

## Properties

### type

> **type**: `"tool_step"`

Defined in: [types/providers.ts:2379](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2379)

---

### callParts

> **callParts**: `unknown`[]

Defined in: [types/providers.ts:2380](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2380)

---

### resultParts

> **resultParts**: `unknown`[]

Defined in: [types/providers.ts:2381](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L2381)
