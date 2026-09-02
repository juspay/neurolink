[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposableAgent

# Type Alias: ExposableAgent

> **ExposableAgent** = `object`

Defined in: [types/mcp.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1121)

Agent definition for MCP exposure

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1125)

Unique agent identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1130](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1130)

Human-readable agent name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1135)

Agent description for AI models

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1140)

Input schema for the agent

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1145)

Output schema for the agent

---

### execute

> **execute**: (`input`, `context?`) => `Promise`\<`unknown`\>

Defined in: [types/mcp.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1150)

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

Defined in: [types/mcp.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1158)

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
