[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / jsonSchema

# Function: jsonSchema()

> **jsonSchema**\<`OBJECT`\>(`schema`, `options?`): [`Schema`](../type-aliases/Schema.md)\<`OBJECT`\>

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
