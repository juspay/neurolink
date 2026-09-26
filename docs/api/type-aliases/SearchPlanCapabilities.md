[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SearchPlanCapabilities

# Type Alias: SearchPlanCapabilities

> **SearchPlanCapabilities** = `object`

What a pipeline is _able_ to do, handed to the per-search planner so it
never suggests a capability that is not configured.

## Properties

### defaultTopK

> **defaultTopK**: `number`

The configured topK a breadth reading is scaled against.

---

### canHybrid

> **canHybrid**: `boolean`

---

### canGraph

> **canGraph**: `boolean`

---

### canRerank

> **canRerank**: `boolean`

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-call timeout override for the decision request.
