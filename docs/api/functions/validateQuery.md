[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateQuery

# Function: validateQuery()

> **validateQuery**\<`T`\>(`schema`, `query`, `requestId?`): [`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>

Validate query parameters against a Zod schema

## Type Parameters

### T

`T`

## Parameters

### schema

`ZodType`\<`T`\>

### query

`Record`\<`string`, `string`\>

### requestId?

`string`

## Returns

[`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>
