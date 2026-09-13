[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkTool

# Type Alias: NeuroLinkTool

> **NeuroLinkTool** = `object`

Defined in: [types/mcp.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2148)

NeuroLink internal tool format

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2152)

Tool name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2157)

Tool description

---

### parameters?

> `optional` **parameters?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2162)

Input parameters schema

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2167)

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

Defined in: [types/mcp.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2175)

Category for organization

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2180)

Tags for filtering

---

### isAsync?

> `optional` **isAsync?**: `boolean`

Defined in: [types/mcp.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2185)

Whether the tool is async

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/mcp.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2190)

Custom metadata
