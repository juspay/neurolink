[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createToolFromFunction

# Function: createToolFromFunction()

> **createToolFromFunction**\<`TParams`\>(`name`, `description`, `fn`, `options?`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Defined in: [mcp/toolConverter.ts:253](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolConverter.ts#L253)

Create a tool from a function with automatic schema inference

## Type Parameters

### TParams

`TParams` _extends_ `Record`\<`string`, `unknown`\>

## Parameters

### name

`string`

### description

`string`

### fn

(`params`, `context?`) => `Promise`\<`unknown`\>

### options?

#### parameters?

[`JsonObject`](../type-aliases/JsonObject.md)

#### annotations?

[`MCPToolAnnotations`](../type-aliases/MCPToolAnnotations.md)

#### metadata?

`Record`\<`string`, `unknown`\>

## Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)
