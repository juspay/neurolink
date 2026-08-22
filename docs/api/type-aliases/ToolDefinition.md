[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDefinition

# Type Alias: ToolDefinition\<TArgs, TResult\>

> **ToolDefinition**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:419](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L419)

Tool definition type

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:420](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L420)

---

### parameters?

> `optional` **parameters?**: [`ToolParameterSchema`](ToolParameterSchema.md)

Defined in: [types/tools.ts:421](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L421)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

Defined in: [types/tools.ts:422](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L422)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>

Defined in: [types/tools.ts:423](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L423)

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>
