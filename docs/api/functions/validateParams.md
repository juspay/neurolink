[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateParams

# Function: validateParams()

> **validateParams**\<`T`\>(`schema`, `params`, `requestId?`): [`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>

Validate path parameters against a Zod schema

## Type Parameters

### T

`T`

## Parameters

### schema

`ZodType`\<`T`\>

### params

`Record`\<`string`, `string`\>

### requestId?

`string`

## Returns

[`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>
