[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerGroup

# Type Alias: ServerGroup

> **ServerGroup** = `object`

Defined in: [types/mcp.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1811)

Server group definition

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1815)

Group identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1820)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1825)

Description of the group

---

### servers

> **servers**: `string`[]

Defined in: [types/mcp.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1830)

Server IDs in this group

---

### strategy

> **strategy**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Defined in: [types/mcp.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1835)

Load balancing strategy for this group

---

### weights?

> `optional` **weights?**: [`ServerWeight`](ServerWeight.md)[]

Defined in: [types/mcp.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1840)

Weights for weighted strategy

---

### healthAware?

> `optional` **healthAware?**: `boolean`

Defined in: [types/mcp.ts:1845](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1845)

Whether to enable health-aware routing

---

### minHealthyServers?

> `optional` **minHealthyServers?**: `number`

Defined in: [types/mcp.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1850)

Minimum healthy servers before alerting
