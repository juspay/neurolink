[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolInfo

# Type Alias: ExternalMCPToolInfo

> **ExternalMCPToolInfo** = `object`

Defined in: [types/externalMcp.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L150)

Tool information from external MCP server

## Properties

### name

> **name**: `string`

Defined in: [types/externalMcp.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L152)

Tool name

---

### description

> **description**: `string`

Defined in: [types/externalMcp.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L155)

Tool description

---

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L158)

Server ID that provides this tool

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/externalMcp.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L161)

Input schema (JSON Schema)

---

### isAvailable

> **isAvailable**: `boolean`

Defined in: [types/externalMcp.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L164)

Whether the tool is currently available

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L167)

Tool metadata

---

### lastCalled?

> `optional` **lastCalled?**: `Date`

Defined in: [types/externalMcp.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L170)

When the tool was last successfully called

---

### stats

> **stats**: `object`

Defined in: [types/externalMcp.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L173)

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
