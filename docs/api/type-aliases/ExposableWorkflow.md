[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposableWorkflow

# Type Alias: ExposableWorkflow

> **ExposableWorkflow** = `object`

Workflow definition for MCP exposure

## Properties

### id

> **id**: `string`

Unique workflow identifier

---

### name

> **name**: `string`

Human-readable workflow name

---

### description

> **description**: `string`

Workflow description

---

### steps?

> `optional` **steps?**: `object`[]

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

Input schema for the workflow

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Output schema for the workflow

---

### execute

> **execute**: (`input`, `context?`) => `Promise`\<`unknown`\>

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
