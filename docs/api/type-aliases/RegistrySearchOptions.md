[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RegistrySearchOptions

# Type Alias: RegistrySearchOptions

> **RegistrySearchOptions** = `object`

Search options for registry queries

## Properties

### query?

> `optional` **query?**: `string`

Search query (name, description, tags)

---

### categories?

> `optional` **categories?**: `string`[]

Filter by categories

---

### tags?

> `optional` **tags?**: `string`[]

Filter by tags

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Filter by transport type

---

### verifiedOnly?

> `optional` **verifiedOnly?**: `boolean`

Only verified servers

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"downloads"` \| `"stars"` \| `"lastUpdated"`

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Sort direction

---

### limit?

> `optional` **limit?**: `number`

Maximum results

---

### offset?

> `optional` **offset?**: `number`

Offset for pagination
