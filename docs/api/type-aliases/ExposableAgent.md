[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposableAgent

# Type Alias: ExposableAgent

> **ExposableAgent** = `object`

Defined in: [types/mcp.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1140)

Agent definition for MCP exposure

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1144)

Unique agent identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1149](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1149)

Human-readable agent name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1154)

Agent description for AI models

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1159](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1159)

Input schema for the agent

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1164)

Output schema for the agent

---

### execute

> **execute**: (`input`, `context?`) => `Promise`\<`unknown`\>

Defined in: [types/mcp.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1169)

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

Defined in: [types/mcp.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1177)

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
