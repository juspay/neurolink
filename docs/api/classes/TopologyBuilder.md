[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyBuilder

# Class: TopologyBuilder

Defined in: [agent/orchestration/topology.ts:581](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L581)

Topology builder for fluent API

## Constructors

### Constructor

> **new TopologyBuilder**(`type`): `TopologyBuilder`

Defined in: [agent/orchestration/topology.ts:585](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L585)

#### Parameters

##### type

[`TopologyType`](../type-aliases/TopologyType.md)

#### Returns

`TopologyBuilder`

## Methods

### addAgent()

> **addAgent**(`agent`): `TopologyBuilder`

Defined in: [agent/orchestration/topology.ts:592](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L592)

Add an agent

#### Parameters

##### agent

[`Agent`](Agent.md)

#### Returns

`TopologyBuilder`

---

### addAgents()

> **addAgents**(`agents`): `TopologyBuilder`

Defined in: [agent/orchestration/topology.ts:600](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L600)

Add multiple agents

#### Parameters

##### agents

[`Agent`](Agent.md)[]

#### Returns

`TopologyBuilder`

---

### setCoordinator()

> **setCoordinator**(`agentId`): `TopologyBuilder`

Defined in: [agent/orchestration/topology.ts:608](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L608)

Set coordinator (for star topology)

#### Parameters

##### agentId

`string`

#### Returns

`TopologyBuilder`

---

### setRoot()

> **setRoot**(`agentId`): `TopologyBuilder`

Defined in: [agent/orchestration/topology.ts:616](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L616)

Set root (for hierarchical topology)

#### Parameters

##### agentId

`string`

#### Returns

`TopologyBuilder`

---

### setMaxChildren()

> **setMaxChildren**(`max`): `TopologyBuilder`

Defined in: [agent/orchestration/topology.ts:624](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L624)

Set max children (for hierarchical topology)

#### Parameters

##### max

`number`

#### Returns

`TopologyBuilder`

---

### addCustomEdge()

> **addCustomEdge**(`sourceAgentId`, `targetAgentId`, `bidirectional?`): `TopologyBuilder`

Defined in: [agent/orchestration/topology.ts:632](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L632)

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

Defined in: [agent/orchestration/topology.ts:651](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/orchestration/topology.ts#L651)

Build the topology

#### Returns

[`NetworkTopology`](NetworkTopology.md)
