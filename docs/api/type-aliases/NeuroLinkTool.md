[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkTool

# Type Alias: NeuroLinkTool

> **NeuroLinkTool** = `object`

Defined in: [types/mcp.ts:2110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2110)

NeuroLink internal tool format

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:2114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2114)

Tool name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:2119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2119)

Tool description

---

### parameters?

> `optional` **parameters?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:2124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2124)

Input parameters schema

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:2129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2129)

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

Defined in: [types/mcp.ts:2137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2137)

Category for organization

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:2142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2142)

Tags for filtering

---

### isAsync?

> `optional` **isAsync?**: `boolean`

Defined in: [types/mcp.ts:2147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2147)

Whether the tool is async

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/mcp.ts:2152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2152)

Custom metadata
