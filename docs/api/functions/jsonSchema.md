[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / jsonSchema

# Function: jsonSchema()

> **jsonSchema**\<`OBJECT`\>(`schema`, `options?`): [`Schema`](../type-aliases/Schema.md)\<`OBJECT`\>

Defined in: [utils/tool.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/utils/tool.ts#L42)

## Type Parameters

### OBJECT

`OBJECT` = `unknown`

## Parameters

### schema

`JSONSchema7` \| (() => `JSONSchema7`)

### options?

#### validate?

(`value`) => \{ `success`: `true`; `value`: `OBJECT`; \} \| \{ `success`: `false`; `error`: `unknown`; \}

## Returns

[`Schema`](../type-aliases/Schema.md)\<`OBJECT`\>
