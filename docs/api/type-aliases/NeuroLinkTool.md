[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkTool

# Type Alias: NeuroLinkTool

> **NeuroLinkTool** = `object`

NeuroLink internal tool format

## Properties

### name

> **name**: `string`

Tool name

---

### description

> **description**: `string`

Tool description

---

### parameters?

> `optional` **parameters?**: [`JsonObject`](JsonObject.md)

Input parameters schema

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

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

Category for organization

---

### tags?

> `optional` **tags?**: `string`[]

Tags for filtering

---

### isAsync?

> `optional` **isAsync?**: `boolean`

Whether the tool is async

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Custom metadata
