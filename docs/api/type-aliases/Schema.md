[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Schema

# Type Alias: Schema\<OBJECT\>

> **Schema**\<`OBJECT`\> = `object`

Defined in: [types/aiCompat.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L42)

## Type Parameters

### OBJECT

`OBJECT` = `unknown`

## Properties

### \_type

> `readonly` **\_type**: `OBJECT`

Defined in: [types/aiCompat.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L43)

---

### jsonSchema

> `readonly` **jsonSchema**: `JSONSchema7`

Defined in: [types/aiCompat.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L48)

---

### validate?

> `readonly` `optional` **validate?**: (`value`) => `SchemaValidationResult`\<`OBJECT`\> \| `PromiseLike`\<`SchemaValidationResult`\<`OBJECT`\>\>

Defined in: [types/aiCompat.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L49)

#### Parameters

##### value

`unknown`

#### Returns

`SchemaValidationResult`\<`OBJECT`\> \| `PromiseLike`\<`SchemaValidationResult`\<`OBJECT`\>\>
