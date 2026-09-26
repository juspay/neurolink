[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateRequest

# Function: validateRequest()

> **validateRequest**\<`T`\>(`schema`, `data`, `requestId?`): [`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>

Validate request body against a Zod schema

## Type Parameters

### T

`T`

## Parameters

### schema

`ZodType`\<`T`\>

### data

`unknown`

### requestId?

`string`

## Returns

[`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>
