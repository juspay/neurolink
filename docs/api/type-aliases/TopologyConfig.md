[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyConfig

# Type Alias: TopologyConfig

> **TopologyConfig** = `object`

Defined in: [types/agentNetwork.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1603)

Topology configuration

## Properties

### type

> **type**: [`TopologyType`](TopologyType.md)

Defined in: [types/agentNetwork.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1605)

Topology type

---

### coordinatorId?

> `optional` **coordinatorId?**: `string`

Defined in: [types/agentNetwork.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1608)

Coordinator agent ID (for star topology)

---

### rootId?

> `optional` **rootId?**: `string`

Defined in: [types/agentNetwork.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1611)

Root agent ID (for hierarchical topology)

---

### maxChildren?

> `optional` **maxChildren?**: `number`

Defined in: [types/agentNetwork.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1614)

Maximum children per node (for hierarchical)

---

### customEdges?

> `optional` **customEdges?**: `object`[]

Defined in: [types/agentNetwork.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1617)

Custom edges (for custom topology)

#### source

> **source**: `string`

#### target

> **target**: `string`

#### bidirectional?

> `optional` **bidirectional?**: `boolean`
