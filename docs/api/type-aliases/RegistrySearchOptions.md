[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistrySearchOptions

# Type Alias: RegistrySearchOptions

> **RegistrySearchOptions** = `object`

Defined in: [types/mcp.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1677)

Search options for registry queries

## Properties

### query?

> `optional` **query?**: `string`

Defined in: [types/mcp.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1681)

Search query (name, description, tags)

---

### categories?

> `optional` **categories?**: `string`[]

Defined in: [types/mcp.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1686)

Filter by categories

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1691)

Filter by tags

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1696)

Filter by transport type

---

### verifiedOnly?

> `optional` **verifiedOnly?**: `boolean`

Defined in: [types/mcp.ts:1701](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1701)

Only verified servers

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"downloads"` \| `"stars"` \| `"lastUpdated"`

Defined in: [types/mcp.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1706)

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Defined in: [types/mcp.ts:1711](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1711)

Sort direction

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/mcp.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1716)

Maximum results

---

### offset?

> `optional` **offset?**: `number`

Defined in: [types/mcp.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1721)

Offset for pagination
