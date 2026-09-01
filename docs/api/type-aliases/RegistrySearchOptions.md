[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistrySearchOptions

# Type Alias: RegistrySearchOptions

> **RegistrySearchOptions** = `object`

Defined in: [types/mcp.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1696)

Search options for registry queries

## Properties

### query?

> `optional` **query?**: `string`

Defined in: [types/mcp.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1700)

Search query (name, description, tags)

---

### categories?

> `optional` **categories?**: `string`[]

Defined in: [types/mcp.ts:1705](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1705)

Filter by categories

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1710)

Filter by tags

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:1715](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1715)

Filter by transport type

---

### verifiedOnly?

> `optional` **verifiedOnly?**: `boolean`

Defined in: [types/mcp.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1720)

Only verified servers

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"downloads"` \| `"stars"` \| `"lastUpdated"`

Defined in: [types/mcp.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1725)

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Defined in: [types/mcp.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1730)

Sort direction

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/mcp.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1735)

Maximum results

---

### offset?

> `optional` **offset?**: `number`

Defined in: [types/mcp.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1740)

Offset for pagination
