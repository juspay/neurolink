[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposableAgent

# Type Alias: ExposableAgent

> **ExposableAgent** = `object`

Defined in: [types/mcp.ts:1102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1102)

Agent definition for MCP exposure

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1106)

Unique agent identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1111)

Human-readable agent name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1116)

Agent description for AI models

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1121)

Input schema for the agent

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1126)

Output schema for the agent

---

### execute

> **execute**: (`input`, `context?`) => `Promise`\<`unknown`\>

Defined in: [types/mcp.ts:1131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1131)

Agent execution function

#### Parameters

##### input

`unknown`

##### context?

[`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<`unknown`\>

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/mcp.ts:1139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1139)

Additional agent metadata

#### version?

> `optional` **version?**: `string`

#### author?

> `optional` **author?**: `string`

#### category?

> `optional` **category?**: `string`

#### tags?

> `optional` **tags?**: `string`[]

#### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

#### costHint?

> `optional` **costHint?**: `number`
