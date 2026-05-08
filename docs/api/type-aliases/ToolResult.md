[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResult

# Type Alias: ToolResult\<T\>

> **ToolResult**\<`T`\> = [`Result`](Result.md)\<`T`, [`ErrorInfo`](ErrorInfo.md) \| `string`\> & `object`

Defined in: [types/tools.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L295)

Tool execution result

## Type Declaration

### success

> **success**: `boolean`

### data?

> `optional` **data?**: `T` \| `null`

### error?

> `optional` **error?**: [`ErrorInfo`](ErrorInfo.md) \| `string`

### usage?

> `optional` **usage?**: [`ToolResultUsage`](ToolResultUsage.md)

### metadata?

> `optional` **metadata?**: [`ToolResultMetadata`](ToolResultMetadata.md)

## Type Parameters

### T

`T` = [`JsonValue`](JsonValue.md) \| `unknown`
