[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolSearchCriteria

# Type Alias: ToolSearchCriteria

> **ToolSearchCriteria** = `object`

Defined in: [types/mcp.ts:1418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1418)

Tool search criteria

## Properties

### name?

> `optional` **name?**: `string`

Defined in: [types/mcp.ts:1422](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1422)

Search by name (partial match)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1427](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1427)

Search by description (keyword match)

---

### serverIds?

> `optional` **serverIds?**: `string`[]

Defined in: [types/mcp.ts:1432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1432)

Filter by server IDs

---

### category?

> `optional` **category?**: `string`

Defined in: [types/mcp.ts:1437](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1437)

Filter by category

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1442](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1442)

Filter by tags

---

### annotations?

> `optional` **annotations?**: `Partial`\<[`MCPToolAnnotations`](MCPToolAnnotations.md)\>

Defined in: [types/mcp.ts:1447](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1447)

Filter by annotation flags

---

### includeUnavailable?

> `optional` **includeUnavailable?**: `boolean`

Defined in: [types/mcp.ts:1452](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1452)

Include unavailable tools

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/mcp.ts:1457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1457)

Maximum results

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"calls"` \| `"successRate"` \| `"avgExecutionTime"`

Defined in: [types/mcp.ts:1462](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1462)

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Defined in: [types/mcp.ts:1467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1467)

Sort direction
