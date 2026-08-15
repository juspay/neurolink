[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TopologyEdge

# Type Alias: TopologyEdge

> **TopologyEdge** = `object`

Defined in: [types/agentNetwork.ts:1580](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1580)

Edge in the topology

## Properties

### id

> **id**: `string`

Defined in: [types/agentNetwork.ts:1582](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1582)

Unique edge ID

---

### sourceId

> **sourceId**: `string`

Defined in: [types/agentNetwork.ts:1585](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1585)

Source node ID

---

### targetId

> **targetId**: `string`

Defined in: [types/agentNetwork.ts:1588](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1588)

Target node ID

---

### type

> **type**: `"bidirectional"` \| `"unidirectional"`

Defined in: [types/agentNetwork.ts:1591](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1591)

Edge type

---

### weight

> **weight**: `number`

Defined in: [types/agentNetwork.ts:1594](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1594)

Communication weight (for routing optimization)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:1597](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1597)

Edge metadata
