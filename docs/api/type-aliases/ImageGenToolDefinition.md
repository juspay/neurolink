[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolDefinition

# Type Alias: ImageGenToolDefinition

> **ImageGenToolDefinition** = `object`

Defined in: [types/imageGen.ts:316](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L316)

Tool definition interface compatible with AI SDK / MCP
(moved from image-gen/imageGenTools.ts)

## Properties

### name

> **name**: `string`

Defined in: [types/imageGen.ts:317](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L317)

---

### description

> **description**: `string`

Defined in: [types/imageGen.ts:318](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L318)

---

### inputSchema

> **inputSchema**: `object`

Defined in: [types/imageGen.ts:319](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L319)

#### type

> **type**: `"object"`

#### properties

> **properties**: `Record`\<`string`, \{ `type`: `string`; `description`: `string`; `enum?`: `string`[]; \}\>

#### required

> **required**: `string`[]

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ImageGenToolResponse`](ImageGenToolResponse.md)\>

Defined in: [types/imageGen.ts:331](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/imageGen.ts#L331)

#### Parameters

##### params

[`ImageGenToolParams`](ImageGenToolParams.md)

##### context?

[`ImageGenToolContext`](ImageGenToolContext.md)

#### Returns

`Promise`\<[`ImageGenToolResponse`](ImageGenToolResponse.md)\>
