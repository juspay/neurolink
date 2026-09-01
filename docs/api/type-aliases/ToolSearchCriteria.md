[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolSearchCriteria

# Type Alias: ToolSearchCriteria

> **ToolSearchCriteria** = `object`

Defined in: [types/mcp.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1456)

Tool search criteria

## Properties

### name?

> `optional` **name?**: `string`

Defined in: [types/mcp.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1460)

Search by name (partial match)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1465)

Search by description (keyword match)

---

### serverIds?

> `optional` **serverIds?**: `string`[]

Defined in: [types/mcp.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1470)

Filter by server IDs

---

### category?

> `optional` **category?**: `string`

Defined in: [types/mcp.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1475)

Filter by category

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1480)

Filter by tags

---

### annotations?

> `optional` **annotations?**: `Partial`\<[`MCPToolAnnotations`](MCPToolAnnotations.md)\>

Defined in: [types/mcp.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1485)

Filter by annotation flags

---

### includeUnavailable?

> `optional` **includeUnavailable?**: `boolean`

Defined in: [types/mcp.ts:1490](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1490)

Include unavailable tools

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/mcp.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1495)

Maximum results

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"calls"` \| `"successRate"` \| `"avgExecutionTime"`

Defined in: [types/mcp.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1500)

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Defined in: [types/mcp.ts:1505](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1505)

Sort direction
