[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMCPServer

# Type Alias: NeuroLinkMCPServer

> **NeuroLinkMCPServer** = `object`

Defined in: [types/mcp.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L506)

NeuroLink MCP Server Type - Standard compatible
Moved from src/lib/mcp/factory.ts

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L508)

---

### title

> **title**: `string`

Defined in: [types/mcp.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L509)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L510)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L511)

---

### category?

> `optional` **category?**: [`MCPServerDomainCategory`](MCPServerDomainCategory.md)

Defined in: [types/mcp.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L512)

---

### visibility?

> `optional` **visibility?**: `"public"` \| `"private"` \| `"organization"`

Defined in: [types/mcp.ts:513](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L513)

---

### tools

> **tools**: `Record`\<`string`, [`NeuroLinkMCPTool`](NeuroLinkMCPTool.md)\>

Defined in: [types/mcp.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L516)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:522](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L522)

---

### dependencies?

> `optional` **dependencies?**: `string`[]

Defined in: [types/mcp.ts:523](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L523)

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/mcp.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L524)

## Methods

### registerTool()

> **registerTool**(`tool`): `NeuroLinkMCPServer`

Defined in: [types/mcp.ts:519](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L519)

#### Parameters

##### tool

[`NeuroLinkMCPTool`](NeuroLinkMCPTool.md)

#### Returns

`NeuroLinkMCPServer`
