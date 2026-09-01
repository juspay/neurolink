[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolSearchCriteria

# Type Alias: ToolSearchCriteria

> **ToolSearchCriteria** = `object`

Defined in: [types/mcp.ts:1437](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1437)

Tool search criteria

## Properties

### name?

> `optional` **name?**: `string`

Defined in: [types/mcp.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1441)

Search by name (partial match)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1446)

Search by description (keyword match)

---

### serverIds?

> `optional` **serverIds?**: `string`[]

Defined in: [types/mcp.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1451)

Filter by server IDs

---

### category?

> `optional` **category?**: `string`

Defined in: [types/mcp.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1456)

Filter by category

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1461)

Filter by tags

---

### annotations?

> `optional` **annotations?**: `Partial`\<[`MCPToolAnnotations`](MCPToolAnnotations.md)\>

Defined in: [types/mcp.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1466)

Filter by annotation flags

---

### includeUnavailable?

> `optional` **includeUnavailable?**: `boolean`

Defined in: [types/mcp.ts:1471](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1471)

Include unavailable tools

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/mcp.ts:1476](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1476)

Maximum results

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"calls"` \| `"successRate"` \| `"avgExecutionTime"`

Defined in: [types/mcp.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1481)

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Defined in: [types/mcp.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1486)

Sort direction
