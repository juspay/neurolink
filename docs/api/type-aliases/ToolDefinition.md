[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDefinition

# Type Alias: ToolDefinition\<TArgs, TResult\>

> **ToolDefinition**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L402)

Tool definition type

## Type Parameters

### TArgs

`TArgs` = [`ToolArgs`](ToolArgs.md)

### TResult

`TResult` = [`JsonValue`](JsonValue.md)

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:403](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L403)

---

### parameters?

> `optional` **parameters?**: [`ToolParameterSchema`](ToolParameterSchema.md)

Defined in: [types/tools.ts:404](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L404)

---

### metadata?

> `optional` **metadata?**: [`ToolMetadata`](ToolMetadata.md)

Defined in: [types/tools.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L405)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>

Defined in: [types/tools.ts:406](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L406)

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>
