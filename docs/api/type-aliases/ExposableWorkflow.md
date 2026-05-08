[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposableWorkflow

# Type Alias: ExposableWorkflow

> **ExposableWorkflow** = `object`

Defined in: [types/mcp.ts:1153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1153)

Workflow definition for MCP exposure

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1157)

Unique workflow identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1162)

Human-readable workflow name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1167)

Workflow description

---

### steps?

> `optional` **steps?**: `object`[]

Defined in: [types/mcp.ts:1172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1172)

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

Defined in: [types/mcp.ts:1181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1181)

Input schema for the workflow

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1186)

Output schema for the workflow

---

### execute

> **execute**: (`input`, `context?`) => `Promise`\<`unknown`\>

Defined in: [types/mcp.ts:1191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1191)

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

Defined in: [types/mcp.ts:1199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1199)

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
