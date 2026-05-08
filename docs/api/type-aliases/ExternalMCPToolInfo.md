[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolInfo

# Type Alias: ExternalMCPToolInfo

> **ExternalMCPToolInfo** = `object`

Defined in: [types/externalMcp.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L144)

Tool information from external MCP server

## Properties

### name

> **name**: `string`

Defined in: [types/externalMcp.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L146)

Tool name

---

### description

> **description**: `string`

Defined in: [types/externalMcp.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L149)

Tool description

---

### serverId

> **serverId**: `string`

Defined in: [types/externalMcp.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L152)

Server ID that provides this tool

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/externalMcp.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L155)

Input schema (JSON Schema)

---

### isAvailable

> **isAvailable**: `boolean`

Defined in: [types/externalMcp.ts:158](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L158)

Whether the tool is currently available

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L161)

Tool metadata

---

### lastCalled?

> `optional` **lastCalled?**: `Date`

Defined in: [types/externalMcp.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L164)

When the tool was last successfully called

---

### stats

> **stats**: `object`

Defined in: [types/externalMcp.ts:167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L167)

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
