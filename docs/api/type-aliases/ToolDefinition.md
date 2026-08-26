[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDefinition

# Type Alias: ToolDefinition\<TArgs, TResult\>

> **ToolDefinition**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L430)

Tool definition type

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L431)

---

### parameters?

> `optional` **parameters?**: [`ToolParameterSchema`](ToolParameterSchema.md)

Defined in: [types/tools.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L432)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

Defined in: [types/tools.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L433)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>

Defined in: [types/tools.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L434)

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>
