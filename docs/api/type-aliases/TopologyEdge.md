[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyEdge

# Type Alias: TopologyEdge

> **TopologyEdge** = `object`

Defined in: [types/agentNetwork.ts:1580](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1580)

Edge in the topology

## Properties

### id

> **id**: `string`

Defined in: [types/agentNetwork.ts:1582](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1582)

Unique edge ID

---

### sourceId

> **sourceId**: `string`

Defined in: [types/agentNetwork.ts:1585](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1585)

Source node ID

---

### targetId

> **targetId**: `string`

Defined in: [types/agentNetwork.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1588)

Target node ID

---

### type

> **type**: `"bidirectional"` \| `"unidirectional"`

Defined in: [types/agentNetwork.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1591)

Edge type

---

### weight

> **weight**: `number`

Defined in: [types/agentNetwork.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1594)

Communication weight (for routing optimization)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:1597](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1597)

Edge metadata
