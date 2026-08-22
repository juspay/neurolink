[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PaginatedResponse

# Type Alias: PaginatedResponse\<TData\>

> **PaginatedResponse**\<`TData`\> = [`ApiResponse`](ApiResponse.md)\<`TData`\> & `object`

Defined in: [types/aliases.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/aliases.ts#L206)

Paginated response structure
Common in list APIs

## Type Declaration

### pagination?

> `optional` **pagination?**: `object`

#### pagination.page

> **page**: `number`

#### pagination.limit

> **limit**: `number`

#### pagination.total

> **total**: `number`

#### pagination.hasNext

> **hasNext**: `boolean`

## Type Parameters

### TData

`TData` = `unknown`
