[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateRequest

# Function: validateRequest()

> **validateRequest**\<`T`\>(`schema`, `data`, `requestId?`): [`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>

Defined in: [server/utils/validation.ts:242](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/utils/validation.ts#L242)

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
