[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PaginatedResponse

# Type Alias: PaginatedResponse\<TData\>

> **PaginatedResponse**\<`TData`\> = [`ApiResponse`](ApiResponse.md)\<`TData`\> & `object`

Defined in: [types/aliases.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/aliases.ts#L192)

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
