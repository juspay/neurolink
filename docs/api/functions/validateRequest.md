[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateRequest

# Function: validateRequest()

> **validateRequest**\<`T`\>(`schema`, `data`, `requestId?`): [`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>

Defined in: [server/utils/validation.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/server/utils/validation.ts#L242)

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
