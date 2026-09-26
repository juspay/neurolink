[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyNode

# Type Alias: TopologyNode

> **TopologyNode** = `object`

Node in the topology

## Properties

### id

> **id**: `string`

Unique node ID

---

### agentId

> **agentId**: `string`

Agent ID (maps to agent)

---

### agentName

> **agentName**: `string`

Agent name

---

### role

> **role**: `"coordinator"` \| `"supervisor"` \| `"worker"` \| `"peer"`

Node role in topology

---

### connections

> **connections**: `string`[]

Connected node IDs

---

### parentId?

> `optional` **parentId?**: `string`

Parent node ID (for hierarchical)

---

### childIds

> **childIds**: `string`[]

Child node IDs (for hierarchical)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Node metadata
