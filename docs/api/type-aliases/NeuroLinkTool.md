[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkTool

# Type Alias: NeuroLinkTool

> **NeuroLinkTool** = `object`

Defined in: [types/mcp.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2129)

NeuroLink internal tool format

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2133)

Tool name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2138)

Tool description

---

### parameters?

> `optional` **parameters?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2143)

Input parameters schema

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2148)

Tool execution function

#### Parameters

##### params

`unknown`

##### context?

[`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

---

### category?

> `optional` **category?**: `string`

Defined in: [types/mcp.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2156)

Category for organization

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2161)

Tags for filtering

---

### isAsync?

> `optional` **isAsync?**: `boolean`

Defined in: [types/mcp.ts:2166](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2166)

Whether the tool is async

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/mcp.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2171)

Custom metadata
