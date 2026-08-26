[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResult

# Type Alias: ToolResult\<T\>

> **ToolResult**\<`T`\> = [`Result`](Result.md)\<`T`, [`ErrorInfo`](ErrorInfo.md) \| `string`\> & `object`

Defined in: [types/tools.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L323)

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
