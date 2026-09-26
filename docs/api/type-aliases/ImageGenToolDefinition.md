[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolDefinition

# Type Alias: ImageGenToolDefinition

> **ImageGenToolDefinition** = `object`

Tool definition interface compatible with AI SDK / MCP
(moved from image-gen/imageGenTools.ts)

## Properties

### name

> **name**: `string`

---

### description

> **description**: `string`

---

### inputSchema

> **inputSchema**: `object`

#### type

> **type**: `"object"`

#### properties

> **properties**: `Record`\<`string`, \{ `type`: `string`; `description`: `string`; `enum?`: `string`[]; \}\>

#### required

> **required**: `string`[]

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ImageGenToolResponse`](ImageGenToolResponse.md)\>

#### Parameters

##### params

[`ImageGenToolParams`](ImageGenToolParams.md)

##### context?

[`ImageGenToolContext`](ImageGenToolContext.md)

#### Returns

`Promise`\<[`ImageGenToolResponse`](ImageGenToolResponse.md)\>
