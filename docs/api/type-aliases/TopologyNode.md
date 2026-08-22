[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyNode

# Type Alias: TopologyNode

> **TopologyNode** = `object`

Defined in: [types/agentNetwork.ts:1551](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1551)

Node in the topology

## Properties

### id

> **id**: `string`

Defined in: [types/agentNetwork.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1553)

Unique node ID

---

### agentId

> **agentId**: `string`

Defined in: [types/agentNetwork.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1556)

Agent ID (maps to agent)

---

### agentName

> **agentName**: `string`

Defined in: [types/agentNetwork.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1559)

Agent name

---

### role

> **role**: `"coordinator"` \| `"supervisor"` \| `"worker"` \| `"peer"`

Defined in: [types/agentNetwork.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1562)

Node role in topology

---

### connections

> **connections**: `string`[]

Defined in: [types/agentNetwork.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1565)

Connected node IDs

---

### parentId?

> `optional` **parentId?**: `string`

Defined in: [types/agentNetwork.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1568)

Parent node ID (for hierarchical)

---

### childIds

> **childIds**: `string`[]

Defined in: [types/agentNetwork.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1571)

Child node IDs (for hierarchical)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1574)

Node metadata
