[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistrySearchOptions

# Type Alias: RegistrySearchOptions

> **RegistrySearchOptions** = `object`

Defined in: [types/mcp.ts:1658](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1658)

Search options for registry queries

## Properties

### query?

> `optional` **query?**: `string`

Defined in: [types/mcp.ts:1662](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1662)

Search query (name, description, tags)

---

### categories?

> `optional` **categories?**: `string`[]

Defined in: [types/mcp.ts:1667](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1667)

Filter by categories

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1672](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1672)

Filter by tags

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:1677](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1677)

Filter by transport type

---

### verifiedOnly?

> `optional` **verifiedOnly?**: `boolean`

Defined in: [types/mcp.ts:1682](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1682)

Only verified servers

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"downloads"` \| `"stars"` \| `"lastUpdated"`

Defined in: [types/mcp.ts:1687](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1687)

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Defined in: [types/mcp.ts:1692](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1692)

Sort direction

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/mcp.ts:1697](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1697)

Maximum results

---

### offset?

> `optional` **offset?**: `number`

Defined in: [types/mcp.ts:1702](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1702)

Offset for pagination
