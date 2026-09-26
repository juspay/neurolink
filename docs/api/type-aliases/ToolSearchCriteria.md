[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolSearchCriteria

# Type Alias: ToolSearchCriteria

> **ToolSearchCriteria** = `object`

Tool search criteria

## Properties

### name?

> `optional` **name?**: `string`

Search by name (partial match)

---

### description?

> `optional` **description?**: `string`

Search by description (keyword match)

---

### serverIds?

> `optional` **serverIds?**: `string`[]

Filter by server IDs

---

### category?

> `optional` **category?**: `string`

Filter by category

---

### tags?

> `optional` **tags?**: `string`[]

Filter by tags

---

### annotations?

> `optional` **annotations?**: `Partial`\<[`MCPToolAnnotations`](MCPToolAnnotations.md)\>

Filter by annotation flags

---

### includeUnavailable?

> `optional` **includeUnavailable?**: `boolean`

Include unavailable tools

---

### limit?

> `optional` **limit?**: `number`

Maximum results

---

### sortBy?

> `optional` **sortBy?**: `"name"` \| `"calls"` \| `"successRate"` \| `"avgExecutionTime"`

Sort by field

---

### sortDirection?

> `optional` **sortDirection?**: `"asc"` \| `"desc"`

Sort direction
