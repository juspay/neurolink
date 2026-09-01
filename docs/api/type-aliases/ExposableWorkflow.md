[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposableWorkflow

# Type Alias: ExposableWorkflow

> **ExposableWorkflow** = `object`

Defined in: [types/mcp.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1191)

Workflow definition for MCP exposure

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1195](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1195)

Unique workflow identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1200)

Human-readable workflow name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1205)

Workflow description

---

### steps?

> `optional` **steps?**: `object`[]

Defined in: [types/mcp.ts:1210](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1210)

Workflow steps (for documentation)

#### id

> **id**: `string`

#### name

> **name**: `string`

#### description?

> `optional` **description?**: `string`

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1219](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1219)

Input schema for the workflow

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1224](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1224)

Output schema for the workflow

---

### execute

> **execute**: (`input`, `context?`) => `Promise`\<`unknown`\>

Defined in: [types/mcp.ts:1229](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1229)

Workflow execution function

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

Defined in: [types/mcp.ts:1237](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1237)

Workflow metadata

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

#### retriable?

> `optional` **retriable?**: `boolean`

#### idempotent?

> `optional` **idempotent?**: `boolean`
