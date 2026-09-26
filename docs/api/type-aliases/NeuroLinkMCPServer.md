[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMCPServer

# Type Alias: NeuroLinkMCPServer

> **NeuroLinkMCPServer** = `object`

NeuroLink MCP Server Type - Standard compatible
Moved from src/lib/mcp/factory.ts

## Properties

### id

> **id**: `string`

---

### title

> **title**: `string`

---

### description?

> `optional` **description?**: `string`

---

### version?

> `optional` **version?**: `string`

---

### category?

> `optional` **category?**: [`MCPServerDomainCategory`](MCPServerDomainCategory.md)

---

### visibility?

> `optional` **visibility?**: `"public"` \| `"private"` \| `"organization"`

---

### tools

> **tools**: `Record`\<`string`, [`NeuroLinkMCPTool`](NeuroLinkMCPTool.md)\>

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

---

### dependencies?

> `optional` **dependencies?**: `string`[]

---

### capabilities?

> `optional` **capabilities?**: `string`[]

## Methods

### registerTool()

> **registerTool**(`tool`): `NeuroLinkMCPServer`

#### Parameters

##### tool

[`NeuroLinkMCPTool`](NeuroLinkMCPTool.md)

#### Returns

`NeuroLinkMCPServer`
