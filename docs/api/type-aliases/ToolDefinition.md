[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDefinition

# Type Alias: ToolDefinition\<TArgs, TResult\>

> **ToolDefinition**\<`TArgs`, `TResult`\> = `object`

Tool definition type

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

---

### parameters?

> `optional` **parameters?**: [`ToolParameterSchema`](ToolParameterSchema.md)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>
