[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PaginatedResponse

# Type Alias: PaginatedResponse\<TData\>

> **PaginatedResponse**\<`TData`\> = [`ApiResponse`](ApiResponse.md)\<`TData`\> & `object`

Defined in: [types/aliases.ts:206](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/aliases.ts#L206)

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
