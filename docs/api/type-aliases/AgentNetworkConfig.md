[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentNetworkConfig

# Type Alias: AgentNetworkConfig

> **AgentNetworkConfig** = `object`

Defined in: [types/agentNetwork.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L273)

Configuration for creating an agent network

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/agentNetwork.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L275)

Unique identifier for the network (auto-generated if not provided)

---

### name

> **name**: `string`

Defined in: [types/agentNetwork.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L278)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/agentNetwork.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L281)

Description of the network's purpose

---

### agents

> **agents**: [`AgentDefinition`](AgentDefinition.md)[]

Defined in: [types/agentNetwork.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L284)

Agents in the network

---

### workflows?

> `optional` **workflows?**: [`NetworkWorkflowDefinition`](NetworkWorkflowDefinition.md)[]

Defined in: [types/agentNetwork.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L287)

Workflows available in the network

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/agentNetwork.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L290)

Additional tools available to all agents (tool names)

---

### router?

> `optional` **router?**: [`RouterConfig`](RouterConfig.md)

Defined in: [types/agentNetwork.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L293)

Routing agent configuration

---

### defaults?

> `optional` **defaults?**: [`NetworkDefaults`](NetworkDefaults.md)

Defined in: [types/agentNetwork.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L296)

Default execution options

---

### memory?

> `optional` **memory?**: [`NetworkMemoryConfig`](NetworkMemoryConfig.md)

Defined in: [types/agentNetwork.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L299)

Memory configuration for the network
