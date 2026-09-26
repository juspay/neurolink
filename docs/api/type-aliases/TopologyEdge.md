[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyEdge

# Type Alias: TopologyEdge

> **TopologyEdge** = `object`

Edge in the topology

## Properties

### id

> **id**: `string`

Unique edge ID

---

### sourceId

> **sourceId**: `string`

Source node ID

---

### targetId

> **targetId**: `string`

Target node ID

---

### type

> **type**: `"bidirectional"` \| `"unidirectional"`

Edge type

---

### weight

> **weight**: `number`

Communication weight (for routing optimization)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Edge metadata
