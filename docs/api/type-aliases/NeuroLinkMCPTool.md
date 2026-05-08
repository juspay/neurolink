[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMCPTool

# Type Alias: NeuroLinkMCPTool

> **NeuroLinkMCPTool** = `object`

Defined in: [types/mcp.ts:446](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L446)

NeuroLink MCP Tool Type - Standardized tool definition for MCP integration
Moved from src/lib/mcp/factory.ts

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:448](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L448)

Unique tool identifier for MCP registration and execution

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L451)

Human-readable description of tool functionality

---

### category?

> `optional` **category?**: `string`

Defined in: [types/mcp.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L454)

Optional category for tool organization and discovery

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/mcp.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L457)

Optional input schema for parameter validation (Zod or JSON Schema)

---

### outputSchema?

> `optional` **outputSchema?**: `unknown`

Defined in: [types/mcp.ts:460](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L460)

Optional output schema for result validation

---

### isImplemented?

> `optional` **isImplemented?**: `boolean`

Defined in: [types/mcp.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L463)

Implementation status flag for development tracking

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/mcp.ts:466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L466)

Required permissions for tool execution in secured environments

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:469](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L469)

Tool version for compatibility and update management

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:472](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L472)

Additional metadata for tool information and capabilities

---

### execute

> **execute**: (`params`, `context`) => `Promise`\<[`ToolResult`](ToolResult.md)\>

Defined in: [types/mcp.ts:477](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L477)

Tool execution function with standardized signature

#### Parameters

##### params

`unknown`

##### context

[`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\>
