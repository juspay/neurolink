[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / validateQuery

# Function: validateQuery()

> **validateQuery**\<`T`\>(`schema`, `query`, `requestId?`): [`ServerValidationResult`](../type-aliases/ServerValidationResult.md)\<`T`\>

Defined in: [server/utils/validation.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/server/utils/validation.ts#L274)

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
