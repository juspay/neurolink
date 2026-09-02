[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolInfo

# Type Alias: ExternalMCPToolInfo

> **ExternalMCPToolInfo** = `object`

Defined in: [types/externalMcp.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L154)

Tool information from external MCP server

## Properties

### name

> **name**: `string`

Defined in: [types/externalMcp.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L156)

Tool name

---

### description

> **description**: `string`

Defined in: [types/externalMcp.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L159)

Tool description

---

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L162)

Server ID that provides this tool

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/externalMcp.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L165)

Input schema (JSON Schema)

---

### isAvailable

> **isAvailable**: `boolean`

Defined in: [types/externalMcp.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L168)

Whether the tool is currently available

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L171)

Tool metadata

---

### lastCalled?

> `optional` **lastCalled?**: `Date`

Defined in: [types/externalMcp.ts:174](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L174)

When the tool was last successfully called

---

### stats

> **stats**: `object`

Defined in: [types/externalMcp.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L177)

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
