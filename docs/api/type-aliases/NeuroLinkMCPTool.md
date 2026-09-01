[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMCPTool

# Type Alias: NeuroLinkMCPTool

> **NeuroLinkMCPTool** = `object`

Defined in: [types/mcp.ts:465](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L465)

NeuroLink MCP Tool Type - Standardized tool definition for MCP integration
Moved from src/lib/mcp/factory.ts

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L467)

Unique tool identifier for MCP registration and execution

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:470](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L470)

Human-readable description of tool functionality

---

### category?

> `optional` **category?**: `string`

Defined in: [types/mcp.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L473)

Optional category for tool organization and discovery

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/mcp.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L476)

Optional input schema for parameter validation (Zod or JSON Schema)

---

### outputSchema?

> `optional` **outputSchema?**: `unknown`

Defined in: [types/mcp.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L479)

Optional output schema for result validation

---

### isImplemented?

> `optional` **isImplemented?**: `boolean`

Defined in: [types/mcp.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L482)

Implementation status flag for development tracking

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/mcp.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L485)

Required permissions for tool execution in secured environments

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:488](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L488)

Tool version for compatibility and update management

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L491)

Additional metadata for tool information and capabilities

---

### execute

> **execute**: (`params`, `context`) => `Promise`\<[`ToolResult`](ToolResult.md)\>

Defined in: [types/mcp.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L496)

Tool execution function with standardized signature

#### Parameters

##### params

`unknown`

##### context

[`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\>
