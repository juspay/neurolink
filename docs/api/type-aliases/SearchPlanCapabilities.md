[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SearchPlanCapabilities

# Type Alias: SearchPlanCapabilities

> **SearchPlanCapabilities** = `object`

Defined in: [types/rag.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1810)

What a pipeline is _able_ to do, handed to the per-search planner so it
never suggests a capability that is not configured.

## Properties

### defaultTopK

> **defaultTopK**: `number`

Defined in: [types/rag.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1812)

The configured topK a breadth reading is scaled against.

---

### canHybrid

> **canHybrid**: `boolean`

Defined in: [types/rag.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1813)

---

### canGraph

> **canGraph**: `boolean`

Defined in: [types/rag.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1814)

---

### canRerank

> **canRerank**: `boolean`

Defined in: [types/rag.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1815)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/rag.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1817)

Per-call timeout override for the decision request.
