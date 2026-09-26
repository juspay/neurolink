[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyConfig

# Type Alias: TopologyConfig

> **TopologyConfig** = `object`

Topology configuration

## Properties

### type

> **type**: [`TopologyType`](TopologyType.md)

Topology type

---

### coordinatorId?

> `optional` **coordinatorId?**: `string`

Coordinator agent ID (for star topology)

---

### rootId?

> `optional` **rootId?**: `string`

Root agent ID (for hierarchical topology)

---

### maxChildren?

> `optional` **maxChildren?**: `number`

Maximum children per node (for hierarchical)

---

### customEdges?

> `optional` **customEdges?**: `object`[]

Custom edges (for custom topology)

#### source

> **source**: `string`

#### target

> **target**: `string`

#### bidirectional?

> `optional` **bidirectional?**: `boolean`
