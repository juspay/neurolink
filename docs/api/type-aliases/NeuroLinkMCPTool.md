[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMCPTool

# Type Alias: NeuroLinkMCPTool

> **NeuroLinkMCPTool** = `object`

NeuroLink MCP Tool Type - Standardized tool definition for MCP integration
Moved from src/lib/mcp/factory.ts

## Properties

### name

> **name**: `string`

Unique tool identifier for MCP registration and execution

---

### description

> **description**: `string`

Human-readable description of tool functionality

---

### category?

> `optional` **category?**: `string`

Optional category for tool organization and discovery

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Optional input schema for parameter validation (Zod or JSON Schema)

---

### outputSchema?

> `optional` **outputSchema?**: `unknown`

Optional output schema for result validation

---

### isImplemented?

> `optional` **isImplemented?**: `boolean`

Implementation status flag for development tracking

---

### permissions?

> `optional` **permissions?**: `string`[]

Required permissions for tool execution in secured environments

---

### version?

> `optional` **version?**: `string`

Tool version for compatibility and update management

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Additional metadata for tool information and capabilities

---

### execute

> **execute**: (`params`, `context`) => `Promise`\<[`ToolResult`](ToolResult.md)\>

Tool execution function with standardized signature

#### Parameters

##### params

`unknown`

##### context

[`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\>
