[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyBuilder

# Class: TopologyBuilder

Topology builder for fluent API

## Constructors

### Constructor

> **new TopologyBuilder**(`type`): `TopologyBuilder`

#### Parameters

##### type

[`TopologyType`](../type-aliases/TopologyType.md)

#### Returns

`TopologyBuilder`

## Methods

### addAgent()

> **addAgent**(`agent`): `TopologyBuilder`

Add an agent

#### Parameters

##### agent

[`Agent`](Agent.md)

#### Returns

`TopologyBuilder`

---

### addAgents()

> **addAgents**(`agents`): `TopologyBuilder`

Add multiple agents

#### Parameters

##### agents

[`Agent`](Agent.md)[]

#### Returns

`TopologyBuilder`

---

### setCoordinator()

> **setCoordinator**(`agentId`): `TopologyBuilder`

Set coordinator (for star topology)

#### Parameters

##### agentId

`string`

#### Returns

`TopologyBuilder`

---

### setRoot()

> **setRoot**(`agentId`): `TopologyBuilder`

Set root (for hierarchical topology)

#### Parameters

##### agentId

`string`

#### Returns

`TopologyBuilder`

---

### setMaxChildren()

> **setMaxChildren**(`max`): `TopologyBuilder`

Set max children (for hierarchical topology)

#### Parameters

##### max

`number`

#### Returns

`TopologyBuilder`

---

### addCustomEdge()

> **addCustomEdge**(`sourceAgentId`, `targetAgentId`, `bidirectional?`): `TopologyBuilder`

Add custom edge

#### Parameters

##### sourceAgentId

`string`

##### targetAgentId

`string`

##### bidirectional?

`boolean` = `true`

#### Returns

`TopologyBuilder`

---

### build()

> **build**(): [`NetworkTopology`](NetworkTopology.md)

Build the topology

#### Returns

[`NetworkTopology`](NetworkTopology.md)
