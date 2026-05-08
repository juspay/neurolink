[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMCPServer

# Type Alias: NeuroLinkMCPServer

> **NeuroLinkMCPServer** = `object`

Defined in: [types/mcp.ts:487](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L487)

NeuroLink MCP Server Type - Standard compatible
Moved from src/lib/mcp/factory.ts

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L489)

---

### title

> **title**: `string`

Defined in: [types/mcp.ts:490](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L490)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:491](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L491)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:492](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L492)

---

### category?

> `optional` **category?**: [`MCPServerDomainCategory`](MCPServerDomainCategory.md)

Defined in: [types/mcp.ts:493](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L493)

---

### visibility?

> `optional` **visibility?**: `"public"` \| `"private"` \| `"organization"`

Defined in: [types/mcp.ts:494](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L494)

---

### tools

> **tools**: `Record`\<`string`, [`NeuroLinkMCPTool`](NeuroLinkMCPTool.md)\>

Defined in: [types/mcp.ts:497](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L497)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:503](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L503)

---

### dependencies?

> `optional` **dependencies?**: `string`[]

Defined in: [types/mcp.ts:504](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L504)

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/mcp.ts:505](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L505)

## Methods

### registerTool()

> **registerTool**(`tool`): `NeuroLinkMCPServer`

Defined in: [types/mcp.ts:500](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L500)

#### Parameters

##### tool

[`NeuroLinkMCPTool`](NeuroLinkMCPTool.md)

#### Returns

`NeuroLinkMCPServer`
