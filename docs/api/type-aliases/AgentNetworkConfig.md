[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentNetworkConfig

# Type Alias: AgentNetworkConfig

> **AgentNetworkConfig** = `object`

Configuration for creating an agent network

## Properties

### id?

> `optional` **id?**: `string`

Unique identifier for the network (auto-generated if not provided)

---

### name

> **name**: `string`

Human-readable name

---

### description?

> `optional` **description?**: `string`

Description of the network's purpose

---

### agents

> **agents**: [`AgentDefinition`](AgentDefinition.md)[]

Agents in the network

---

### workflows?

> `optional` **workflows?**: [`NetworkWorkflowDefinition`](NetworkWorkflowDefinition.md)[]

Workflows available in the network

---

### tools?

> `optional` **tools?**: `string`[]

Additional tools available to all agents (tool names)

---

### router?

> `optional` **router?**: [`RouterConfig`](RouterConfig.md)

Routing agent configuration

---

### defaults?

> `optional` **defaults?**: [`NetworkDefaults`](NetworkDefaults.md)

Default execution options

---

### memory?

> `optional` **memory?**: [`NetworkMemoryConfig`](NetworkMemoryConfig.md)

Memory configuration for the network
