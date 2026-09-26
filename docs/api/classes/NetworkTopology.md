[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkTopology

# Class: NetworkTopology

Network Topology - Manages agent network structure

## Constructors

### Constructor

> **new NetworkTopology**(`config`): `NetworkTopology`

#### Parameters

##### config

[`TopologyConfig`](../type-aliases/TopologyConfig.md)

#### Returns

`NetworkTopology`

## Methods

### buildFromAgents()

> **buildFromAgents**(`agents`): `void`

Build topology from agents

#### Parameters

##### agents

[`Agent`](Agent.md)[]

#### Returns

`void`

---

### addNode()

> **addNode**(`agent`, `role?`): [`TopologyNode`](../type-aliases/TopologyNode.md)

Add a node to the topology

#### Parameters

##### agent

[`Agent`](Agent.md)

##### role?

`"worker"` \| `"coordinator"` \| `"supervisor"` \| `"peer"`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)

---

### removeNode()

> **removeNode**(`nodeId`): `boolean`

Remove a node from the topology

#### Parameters

##### nodeId

`string`

#### Returns

`boolean`

---

### addEdge()

> **addEdge**(`sourceId`, `targetId`, `type?`, `weight?`): [`TopologyEdge`](../type-aliases/TopologyEdge.md) \| `undefined`

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

Remove an edge

#### Parameters

##### edgeId

`string`

#### Returns

`boolean`

---

### getNode()

> **getNode**(`nodeId`): [`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

Get node by ID

#### Parameters

##### nodeId

`string`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

---

### getNodeByAgentId()

> **getNodeByAgentId**(`agentId`): [`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

Get node by agent ID

#### Parameters

##### agentId

`string`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

---

### getAllNodes()

> **getAllNodes**(): [`TopologyNode`](../type-aliases/TopologyNode.md)[]

Get all nodes

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)[]

---

### getAllEdges()

> **getAllEdges**(): [`TopologyEdge`](../type-aliases/TopologyEdge.md)[]

Get all edges

#### Returns

[`TopologyEdge`](../type-aliases/TopologyEdge.md)[]

---

### getConnectedNodes()

> **getConnectedNodes**(`nodeId`): [`TopologyNode`](../type-aliases/TopologyNode.md)[]

Get connected nodes

#### Parameters

##### nodeId

`string`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)[]

---

### findShortestPath()

> **findShortestPath**(`sourceId`, `targetId`): `string`[] \| `undefined`

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

Get nodes by role

#### Parameters

##### role

`"worker"` \| `"coordinator"` \| `"supervisor"` \| `"peer"`

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md)[]

---

### getCoordinator()

> **getCoordinator**(): [`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

Get coordinator/root node

#### Returns

[`TopologyNode`](../type-aliases/TopologyNode.md) \| `undefined`

---

### getStats()

> **getStats**(): [`TopologyStats`](../type-aliases/TopologyStats.md)

Calculate topology statistics

#### Returns

[`TopologyStats`](../type-aliases/TopologyStats.md)

---

### toJSON()

> **toJSON**(): `object`

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

Get topology type

#### Returns

[`TopologyType`](../type-aliases/TopologyType.md)

---

### getId()

> **getId**(): `string`

Get topology ID

#### Returns

`string`
