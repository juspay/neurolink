[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDefinition

# Type Alias: ToolDefinition\<TArgs, TResult\>

> **ToolDefinition**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:331](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L331)

Tool definition type

## Type Parameters

### TArgs

`TArgs` = `ToolArgs`

### TResult

`TResult` = `JsonValue`

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:332](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L332)

---

### parameters?

> `optional` **parameters**: `ToolParameterSchema`

Defined in: [types/tools.ts:333](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L333)

---

### metadata?

> `optional` **metadata**: `ToolMetadata`

Defined in: [types/tools.ts:334](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L334)

---

### execute()

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>

Defined in: [types/tools.ts:335](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L335)

#### Parameters

##### params

`TArgs`

##### context?

[`ToolContext`](ToolContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>
