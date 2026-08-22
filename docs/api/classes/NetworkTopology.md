[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkTopology

# Class: NetworkTopology

Defined in: [agent/orchestration/topology.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L26)

Network Topology - Manages agent network structure

## Constructors

### Constructor

> **new NetworkTopology**(`config`): `NetworkTopology`

Defined in: [agent/orchestration/topology.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L32)

#### Parameters

##### config

[`TopologyConfig`](../type-aliases/TopologyConfig.md)

#### Returns

`NetworkTopology`

## Methods

### buildFromAgents()

> **buildFromAgents**(`agents`): `void`

Defined in: [agent/orchestration/topology.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L42)

Build topology from agents

#### Parameters

##### agents

[`Agent`](Agent.md)[]

#### Returns

`void`

---

### addNode()

> **addNode**(`agent`, `role?`): [`TopologyNode`](../type-aliases/TopologyNode.md)

Defined in: [agent/orchestration/topology.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L80)

Add a node to the topology

#### Parameters

##### agent

[`Agent`](Agent.md)

##### role?

`"coordinator"` \| `"supervisor"` \| `"worker"` \| `"peer"`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)

---

### removeNode()

> **removeNode**(`nodeId`): `boolean`

Defined in: [agent/orchestration/topology.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L97)

Remove a node from the topology

#### Parameters

##### nodeId

`string`

#### Returns

`boolean`

---

### addEdge()

> **addEdge**(`sourceId`, `targetId`, `type?`, `weight?`): [`TopologyEdge`](../type-aliases/TopologyEdge.md) \| `undefined`

Defined in: [agent/orchestration/topology.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L129)

Add an edge between nodes

#### Parameters

##### sourceId

`string`

##### targetId

`string`

##### type?

`"bidirectional"` \| `"unidirectional"`

##### weight?

`number` = `1`

#### Returns

[`TopologyEdge`](../type-aliases/TopologyEdge.md) \| `undefined`

---

### removeEdge()

> **removeEdge**(`edgeId`): `boolean`

Defined in: [agent/orchestration/topology.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L171)

Remove an edge

#### Parameters

##### edgeId

`string`

#### Returns

`boolean`

---

### getNode()

> **getNode**(`nodeId`): [`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

Defined in: [agent/orchestration/topology.ts:356](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L356)

Get node by ID

#### Parameters

##### nodeId

`string`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

---

### getNodeByAgentId()

> **getNodeByAgentId**(`agentId`): [`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

Defined in: [agent/orchestration/topology.ts:363](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L363)

Get node by agent ID

#### Parameters

##### agentId

`string`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

---

### getAllNodes()

> **getAllNodes**(): [`TopologyNode`](../type-aliases/TopologyNode.md)[]

Defined in: [agent/orchestration/topology.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L375)

Get all nodes

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)[]

---

### getAllEdges()

> **getAllEdges**(): [`TopologyEdge`](../type-aliases/TopologyEdge.md)[]

Defined in: [agent/orchestration/topology.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L382)

Get all edges

#### Returns

[`TopologyEdge`](../type-aliases/TopologyEdge.md)[]

---

### getConnectedNodes()

> **getConnectedNodes**(`nodeId`): [`TopologyNode`](../type-aliases/TopologyNode.md)[]

Defined in: [agent/orchestration/topology.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L389)

Get connected nodes

#### Parameters

##### nodeId

`string`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)[]

---

### findShortestPath()

> **findShortestPath**(`sourceId`, `targetId`): `string`[] \| `undefined`

Defined in: [agent/orchestration/topology.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L403)

Find shortest path between two nodes (BFS)

#### Parameters

##### sourceId

`string`

##### targetId

`string`

#### Returns

`string`[] \| `undefined`

---

### areConnected()

> **areConnected**(`sourceId`, `targetId`): `boolean`

Defined in: [agent/orchestration/topology.ts:442](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L442)

Check if two nodes are connected (directly or indirectly)

#### Parameters

##### sourceId

`string`

##### targetId

`string`

#### Returns

`boolean`

---

### getNodesByRole()

> **getNodesByRole**(`role`): [`TopologyNode`](../type-aliases/TopologyNode.md)[]

Defined in: [agent/orchestration/topology.ts:449](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L449)

Get nodes by role

#### Parameters

##### role

`"coordinator"` \| `"supervisor"` \| `"worker"` \| `"peer"`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)[]

---

### getCoordinator()

> **getCoordinator**(): [`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

Defined in: [agent/orchestration/topology.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L456)

Get coordinator/root node

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

---

### getStats()

> **getStats**(): [`TopologyStats`](../type-aliases/TopologyStats.md)

Defined in: [agent/orchestration/topology.ts:468](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L468)

Calculate topology statistics

#### Returns

[`TopologyStats`](../type-aliases/TopologyStats.md)

---

### toJSON()

> **toJSON**(): `object`

Defined in: [agent/orchestration/topology.ts:522](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L522)

Export topology as JSON

#### Returns

`object`

##### id

> **id**: `string`

##### type

> **type**: [`TopologyType`](../type-aliases/TopologyType.md)

##### nodes

> **nodes**: [`TopologyNode`](../type-aliases/TopologyNode.md)[]

##### edges

> **edges**: [`TopologyEdge`](../type-aliases/TopologyEdge.md)[]

---

### fromJSON()

> **fromJSON**(`data`): `void`

Defined in: [agent/orchestration/topology.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L539)

Import topology from JSON

#### Parameters

##### data

###### id?

`string`

###### type

[`TopologyType`](../type-aliases/TopologyType.md)

###### nodes

[`TopologyNode`](../type-aliases/TopologyNode.md)[]

###### edges

[`TopologyEdge`](../type-aliases/TopologyEdge.md)[]

#### Returns

`void`

---

### getType()

> **getType**(): [`TopologyType`](../type-aliases/TopologyType.md)

Defined in: [agent/orchestration/topology.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L566)

Get topology type

#### Returns

[`TopologyType`](../type-aliases/TopologyType.md)

---

### getId()

> **getId**(): `string`

Defined in: [agent/orchestration/topology.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/agent/orchestration/topology.ts#L573)

Get topology ID

#### Returns

`string`
