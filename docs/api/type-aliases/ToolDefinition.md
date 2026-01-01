[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / ToolDefinition

# Type Alias: ToolDefinition\<TArgs, TResult\>

> **ToolDefinition**\<`TArgs`, `TResult`\> = `object`

Defined in: [types/tools.ts:283](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L283)

Tool definition type

## Type Parameters

### TArgs

`TArgs` = `ToolArgs`

### TResult

`TResult` = `JsonValue`

## Properties

### description

> **description**: `string`

Defined in: [types/tools.ts:284](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L284)

---

### parameters?

> `optional` **parameters**: `ToolParameterSchema`

Defined in: [types/tools.ts:285](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L285)

---

### metadata?

> `optional` **metadata**: `ToolMetadata`

Defined in: [types/tools.ts:286](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L286)

---

### execute()

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>

Defined in: [types/tools.ts:287](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L287)

#### Parameters

##### params

`TArgs`

##### context?

`ToolContext`

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md)\<`TResult`\>\> \| [`ToolResult`](ToolResult.md)\<`TResult`\>
