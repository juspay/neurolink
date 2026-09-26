[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposableAgent

# Type Alias: ExposableAgent

> **ExposableAgent** = `object`

Agent definition for MCP exposure

## Properties

### id

> **id**: `string`

Unique agent identifier

---

### name

> **name**: `string`

Human-readable agent name

---

### description

> **description**: `string`

Agent description for AI models

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Input schema for the agent

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Output schema for the agent

---

### execute

> **execute**: (`input`, `context?`) => `Promise`\<`unknown`\>

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
