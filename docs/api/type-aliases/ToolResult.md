[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / ToolResult

# Type Alias: ToolResult\<T\>

> **ToolResult**\<`T`\> = `Result`\<`T`, `ErrorInfo`\> & `object`

Defined in: [types/tools.ts:199](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L199)

Tool execution result

## Type Declaration

### success

> **success**: `boolean`

### data?

> `optional` **data**: `T`

### error?

> `optional` **error**: `ErrorInfo`

### metadata?

> `optional` **metadata**: `ToolResultMetadata`

## Type Parameters

### T

`T` = `JsonValue`
