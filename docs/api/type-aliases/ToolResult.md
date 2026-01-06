[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResult

# Type Alias: ToolResult\<T\>

> **ToolResult**\<`T`\> = `Result`\<`T`, `ErrorInfo` \| `string`\> & `object`

Defined in: [types/tools.ts:243](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/tools.ts#L243)

Tool execution result

## Type Declaration

### success

> **success**: `boolean`

### data?

> `optional` **data**: `T` \| `null`

### error?

> `optional` **error**: `ErrorInfo` \| `string`

### usage?

> `optional` **usage**: `ToolResultUsage`

### metadata?

> `optional` **metadata**: `ToolResultMetadata`

## Type Parameters

### T

`T` = `JsonValue` \| `unknown`
