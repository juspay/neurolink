[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerGroup

# Type Alias: ServerGroup

> **ServerGroup** = `object`

Defined in: [types/mcp.ts:1792](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1792)

Server group definition

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1796](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1796)

Group identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1801)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1806)

Description of the group

---

### servers

> **servers**: `string`[]

Defined in: [types/mcp.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1811)

Server IDs in this group

---

### strategy

> **strategy**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Defined in: [types/mcp.ts:1816](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1816)

Load balancing strategy for this group

---

### weights?

> `optional` **weights?**: [`ServerWeight`](ServerWeight.md)[]

Defined in: [types/mcp.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1821)

Weights for weighted strategy

---

### healthAware?

> `optional` **healthAware?**: `boolean`

Defined in: [types/mcp.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1826)

Whether to enable health-aware routing

---

### minHealthyServers?

> `optional` **minHealthyServers?**: `number`

Defined in: [types/mcp.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1831)

Minimum healthy servers before alerting
