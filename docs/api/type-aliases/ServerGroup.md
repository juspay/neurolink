[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerGroup

# Type Alias: ServerGroup

> **ServerGroup** = `object`

Defined in: [types/mcp.ts:1773](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1773)

Server group definition

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1777](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1777)

Group identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1782](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1782)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1787](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1787)

Description of the group

---

### servers

> **servers**: `string`[]

Defined in: [types/mcp.ts:1792](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1792)

Server IDs in this group

---

### strategy

> **strategy**: [`LoadBalancingStrategy`](LoadBalancingStrategy.md)

Defined in: [types/mcp.ts:1797](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1797)

Load balancing strategy for this group

---

### weights?

> `optional` **weights?**: [`ServerWeight`](ServerWeight.md)[]

Defined in: [types/mcp.ts:1802](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1802)

Weights for weighted strategy

---

### healthAware?

> `optional` **healthAware?**: `boolean`

Defined in: [types/mcp.ts:1807](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1807)

Whether to enable health-aware routing

---

### minHealthyServers?

> `optional` **minHealthyServers?**: `number`

Defined in: [types/mcp.ts:1812](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1812)

Minimum healthy servers before alerting
