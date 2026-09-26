[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolInfo

# Type Alias: ExternalMCPToolInfo

> **ExternalMCPToolInfo** = `object`

Tool information from external MCP server

## Properties

### name

> **name**: `string`

Tool name

---

### description

> **description**: `string`

Tool description

---

### serverId

> **serverId**: `string`

Server ID that provides this tool

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Input schema (JSON Schema)

---

### isAvailable

> **isAvailable**: `boolean`

Whether the tool is currently available

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Tool metadata

---

### lastCalled?

> `optional` **lastCalled?**: `Date`

When the tool was last successfully called

---

### stats

> **stats**: `object`

Tool execution statistics

#### totalCalls

> **totalCalls**: `number`

#### successfulCalls

> **successfulCalls**: `number`

#### failedCalls

> **failedCalls**: `number`

#### averageExecutionTime

> **averageExecutionTime**: `number`

#### lastExecutionTime

> **lastExecutionTime**: `number`
